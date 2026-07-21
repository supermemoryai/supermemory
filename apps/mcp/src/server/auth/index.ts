import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose"
import type { SessionInfo } from "../../shared/types"

const FETCH_TIMEOUT_MS = 30_000

export interface AuthUser {
	userId: string
	bearerToken: string
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

	const session = (await response.json()) as SessionInfo | null
	if (!session?.user?.id) {
		throw new Error("Missing user.id in session response")
	}

	return session
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
		return {
			userId: payload.sub,
			bearerToken: token,
		}
	} catch (error) {
		console.error("OAuth token validation error:", error)
		return null
	}
}
