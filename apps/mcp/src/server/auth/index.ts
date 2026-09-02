import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose"
import { sessionInfoSchema, type SessionInfo } from "../../shared/types"

const FETCH_TIMEOUT_MS = 30_000

export interface AuthUser {
	userId: string
	organizationId: string
	bearerToken: string
	oauthClientId?: string
	scopes: string[]
	expiresAt?: number
}

const remoteJwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function authIssuer(apiUrl: string): string {
	return `${apiUrl.replace(/\/+$/, "")}/api/auth`
}

function getRemoteJwks(jwksUrl: string) {
	let keySet = remoteJwks.get(jwksUrl)
	if (!keySet) {
		keySet = createRemoteJWKSet(new URL(jwksUrl))
		remoteJwks.set(jwksUrl, keySet)
	}
	return keySet
}

export async function fetchSession(
	bearerToken: string,
	apiUrl: string,
): Promise<SessionInfo> {
	const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/v3/session`, {
		method: "GET",
		headers: { Authorization: `Bearer ${bearerToken}` },
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	})

	if (!response.ok) {
		throw Object.assign(
			new Error(`Session request failed with status ${response.status}`),
			{ status: response.status },
		)
	}

	const result = sessionInfoSchema.safeParse(await response.json())
	if (!result.success) {
		throw new Error("Invalid session response")
	}

	return result.data
}

// Opaque Supermemory API keys (sm_...) authenticate via the session endpoint
// instead of JWT verification. Successful lookups are cached per isolate so a
// busy MCP session doesn't re-validate on every JSON-RPC message.
const API_KEY_PATTERN = /^sm_\S{17,}$/
const API_KEY_CACHE_TTL_MS = 60_000
const API_KEY_CACHE_MAX_ENTRIES = 1000

const apiKeyCache = new Map<string, { user: AuthUser; expiresAt: number }>()

export function isApiKey(token: string): boolean {
	return API_KEY_PATTERN.test(token)
}

// Upstream was unreachable, not the token being bad: reporting these as invalid_token makes clients discard working credentials.
export class TransientAuthError extends Error {
	readonly status?: number

	constructor(message: string, status?: number) {
		super(message)
		this.name = "TransientAuthError"
		this.status = status
	}
}

const TRANSIENT_ERROR_NAMES = new Set([
	"AbortError",
	"TimeoutError",
	"JWKSTimeout",
])

// ERR_JOSE_GENERIC is what jose throws when the JWKS endpoint answers non-200 or unparseable JSON.
const TRANSIENT_JOSE_CODES = new Set(["ERR_JWKS_TIMEOUT", "ERR_JOSE_GENERIC"])

function transientAuthErrorFor(error: unknown): TransientAuthError | null {
	const status = (error as { status?: unknown } | null)?.status
	if (typeof status === "number" && status !== 401 && status !== 403) {
		return new TransientAuthError(`Session endpoint returned ${status}`, status)
	}
	if (error instanceof TypeError) {
		return new TransientAuthError(`Auth backend unreachable: ${error.message}`)
	}
	if (error instanceof Error && TRANSIENT_ERROR_NAMES.has(error.name)) {
		return new TransientAuthError(error.message)
	}
	const code = (error as { code?: unknown } | null)?.code
	if (typeof code === "string" && TRANSIENT_JOSE_CODES.has(code)) {
		return new TransientAuthError(
			`JWKS fetch failed: ${(error as Error).message}`,
		)
	}
	return null
}

export async function validateApiKey(
	token: string,
	apiUrl: string,
): Promise<AuthUser | null> {
	if (!isApiKey(token)) return null

	const cached = apiKeyCache.get(token)
	if (cached && cached.expiresAt > Date.now()) return cached.user

	try {
		const session = await fetchSession(token, apiUrl)
		const organizationId = session.org?.id
		if (!organizationId) return null

		const user: AuthUser = {
			userId: session.user.id,
			organizationId,
			bearerToken: token,
			scopes: [],
		}
		if (apiKeyCache.size >= API_KEY_CACHE_MAX_ENTRIES) apiKeyCache.clear()
		apiKeyCache.set(token, {
			user,
			expiresAt: Date.now() + API_KEY_CACHE_TTL_MS,
		})
		return user
	} catch (error) {
		console.error("API key validation error:", error)
		const transient = transientAuthErrorFor(error)
		if (transient) throw transient
		return null
	}
}

export async function validateOAuthToken(
	token: string,
	apiUrl: string,
	audience: string,
	keySet?: JWTVerifyGetKey,
): Promise<AuthUser | null> {
	try {
		const issuer = authIssuer(apiUrl)
		const verifier = keySet ?? getRemoteJwks(`${issuer}/jwks`)
		const { payload } = await jwtVerify(token, verifier, {
			issuer,
			audience,
		})
		if (typeof payload.sub !== "string" || payload.sub.length === 0) {
			return null
		}
		if (
			typeof payload.organization_id !== "string" ||
			payload.organization_id.length === 0
		) {
			return null
		}

		const rawScopes = payload.scope ?? payload.scopes
		const scopes = Array.isArray(rawScopes)
			? rawScopes.filter((scope): scope is string => typeof scope === "string")
			: typeof rawScopes === "string"
				? rawScopes.split(/\s+/).filter(Boolean)
				: []

		return {
			userId: payload.sub,
			organizationId: payload.organization_id,
			bearerToken: token,
			oauthClientId:
				typeof payload.azp === "string"
					? payload.azp
					: typeof payload.client_id === "string"
						? payload.client_id
						: undefined,
			scopes,
			expiresAt: payload.exp,
		}
	} catch (error) {
		console.error("OAuth token validation error:", error)
		const transient = transientAuthErrorFor(error)
		if (transient) throw transient
		return null
	}
}
