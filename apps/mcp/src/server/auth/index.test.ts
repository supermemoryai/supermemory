import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import {
	fetchSession,
	TransientAuthError,
	validateApiKey,
	validateOAuthToken,
} from "./index"

const API_URL = "https://api.example.com"
const ISSUER = `${API_URL}/api/auth`
const MCP_RESOURCE = "https://mcp.example.com/mcp"

describe("MCP authentication", () => {
	let privateKey: CryptoKey
	let keySet: ReturnType<typeof createLocalJWKSet>

	beforeAll(async () => {
		const keys = await generateKeyPair("RS256")
		privateKey = keys.privateKey
		const publicJwk = await exportJWK(keys.publicKey)
		publicJwk.kid = "test-key"
		keySet = createLocalJWKSet({ keys: [publicJwk] })
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	async function signToken(
		overrides: {
			audience?: string
			subject?: string
			expiresIn?: string
			organizationId?: string
		} = {},
	) {
		let token = new SignJWT({
			...(overrides.organizationId === ""
				? {}
				: { organization_id: overrides.organizationId ?? "org_test" }),
			azp: "client_test",
			scope: "openid profile",
		})
			.setProtectedHeader({ alg: "RS256", kid: "test-key" })
			.setIssuer(ISSUER)
			.setAudience(overrides.audience ?? MCP_RESOURCE)
			.setIssuedAt()
			.setExpirationTime(overrides.expiresIn ?? "5m")

		if (overrides.subject !== "") {
			token = token.setSubject(overrides.subject ?? "user_test")
		}

		return token.sign(privateKey)
	}

	it("validates an MCP-audience OAuth token without an API request", async () => {
		const fetchSpy = vi.fn()
		vi.stubGlobal("fetch", fetchSpy)
		const token = await signToken()

		await expect(
			validateOAuthToken(token, API_URL, MCP_RESOURCE, keySet),
		).resolves.toEqual({
			userId: "user_test",
			organizationId: "org_test",
			bearerToken: token,
			oauthClientId: "client_test",
			scopes: ["openid", "profile"],
			expiresAt: expect.any(Number),
		})
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it("rejects a token without an organization boundary", async () => {
		const token = await signToken({ organizationId: "" })

		await expect(
			validateOAuthToken(token, API_URL, MCP_RESOURCE, keySet),
		).resolves.toBeNull()
	})

	it("rejects a token issued for a different audience", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {})
		const token = await signToken({ audience: "https://api.example.com" })

		await expect(
			validateOAuthToken(token, API_URL, MCP_RESOURCE, keySet),
		).resolves.toBeNull()
	})

	it("rejects expired tokens and tokens without a subject", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {})
		const expired = await signToken({ expiresIn: "-1s" })
		const noSubject = await signToken({ subject: "" })

		await expect(
			validateOAuthToken(expired, API_URL, MCP_RESOURCE, keySet),
		).resolves.toBeNull()
		await expect(
			validateOAuthToken(noSubject, API_URL, MCP_RESOURCE, keySet),
		).resolves.toBeNull()
	})

	it("rejects opaque API keys without an API request", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {})
		const fetchSpy = vi.fn()
		vi.stubGlobal("fetch", fetchSpy)

		await expect(
			validateOAuthToken("sm_test", API_URL, MCP_RESOURCE, keySet),
		).resolves.toBeNull()
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it("surfaces on-demand session failures to the calling tool", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
		)

		await expect(fetchSession("token", API_URL)).rejects.toMatchObject({
			status: 403,
		})
	})

	function sessionResponse() {
		return Response.json({
			user: { id: "user_test", email: "test@example.com" },
			org: { id: "org_test" },
			role: "owner",
			accessType: "full",
			scope: { type: "full", permission: "write" },
		})
	}

	it("validates an sm_ API key via the session endpoint", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(sessionResponse())
		vi.stubGlobal("fetch", fetchSpy)
		const key = "sm_valid_key_0123456789abcdef"

		await expect(validateApiKey(key, API_URL)).resolves.toEqual({
			userId: "user_test",
			organizationId: "org_test",
			bearerToken: key,
			scopes: [],
		})
		expect(fetchSpy).toHaveBeenCalledWith(
			`${API_URL}/v3/session`,
			expect.objectContaining({
				headers: { Authorization: `Bearer ${key}` },
			}),
		)
	})

	it("caches a validated API key within the TTL", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(sessionResponse())
		vi.stubGlobal("fetch", fetchSpy)
		const key = "sm_cached_key_0123456789abcdef"

		await validateApiKey(key, API_URL)
		await validateApiKey(key, API_URL)
		expect(fetchSpy).toHaveBeenCalledTimes(1)
	})

	it("rejects an API key the session endpoint refuses", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {})
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
		)

		await expect(
			validateApiKey("sm_revoked_key_0123456789abcdef", API_URL),
		).resolves.toBeNull()
	})

	it("rejects malformed API keys without an API request", async () => {
		const fetchSpy = vi.fn()
		vi.stubGlobal("fetch", fetchSpy)

		await expect(validateApiKey("sm_short", API_URL)).resolves.toBeNull()
		await expect(validateApiKey("not_a_key", API_URL)).resolves.toBeNull()
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it("surfaces a 500 from the session endpoint as TransientAuthError, not invalid token", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {})
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
		)

		await expect(
			validateApiKey("sm_outage_key_0123456789abcdef", API_URL),
		).rejects.toThrow(TransientAuthError)
	})

	it("surfaces a session-endpoint timeout as TransientAuthError", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {})
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(
				Object.assign(new Error("The operation was aborted"), {
					name: "TimeoutError",
				}),
			),
		)

		await expect(
			validateApiKey("sm_timeout_key_0123456789abcd", API_URL),
		).rejects.toThrow(TransientAuthError)
	})
})
