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
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		const error = vi.spyOn(console, "error").mockImplementation(() => {})
		const token = await signToken({ audience: "https://api.example.com" })

		await expect(
			validateOAuthToken(token, API_URL, MCP_RESOURCE, keySet),
		).resolves.toBeNull()
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toMatch(/^OAuth token rejected: /)
		expect(error).not.toHaveBeenCalled()
	})

	it("rejects expired tokens and tokens without a subject", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		const error = vi.spyOn(console, "error").mockImplementation(() => {})
		const expired = await signToken({ expiresIn: "-1s" })
		const noSubject = await signToken({ subject: "" })

		await expect(
			validateOAuthToken(expired, API_URL, MCP_RESOURCE, keySet),
		).resolves.toBeNull()
		await expect(
			validateOAuthToken(noSubject, API_URL, MCP_RESOURCE, keySet),
		).resolves.toBeNull()
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toMatch(/^OAuth token rejected: .*exp/)
		expect(error).not.toHaveBeenCalled()
	})

	it("logs a JWKS failure as an auth backend outage and surfaces TransientAuthError", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		const error = vi.spyOn(console, "error").mockImplementation(() => {})
		const token = await signToken()
		const failingKeySet = () =>
			Promise.reject(
				Object.assign(new Error("JWKS endpoint unavailable"), {
					code: "ERR_JWKS_TIMEOUT",
				}),
			)

		await expect(
			validateOAuthToken(token, API_URL, MCP_RESOURCE, failingKeySet),
		).rejects.toThrow(TransientAuthError)
		expect(error).toHaveBeenCalledTimes(1)
		expect(error.mock.calls[0]?.[0]).toBe(
			"Auth backend unavailable during OAuth token validation: JWKS fetch failed: JWKS endpoint unavailable",
		)
		expect(warn).not.toHaveBeenCalled()
	})

	it("rejects opaque API keys without an API request", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {})
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
			`${API_URL}/session`,
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
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		const error = vi.spyOn(console, "error").mockImplementation(() => {})
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 401 }))
		vi.stubGlobal("fetch", fetchSpy)

		await expect(
			validateApiKey("sm_revoked_key_0123456789abcdef", API_URL),
		).resolves.toBeNull()
		expect(fetchSpy).toHaveBeenCalledTimes(1)
		expect(fetchSpy.mock.calls[0]?.[0]).toBe(`${API_URL}/session`)
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(
			"API key rejected: Session request failed with status 401",
		)
		expect(error).not.toHaveBeenCalled()
	})

	it("rejects malformed API keys without an API request", async () => {
		const fetchSpy = vi.fn()
		vi.stubGlobal("fetch", fetchSpy)

		await expect(validateApiKey("sm_short", API_URL)).resolves.toBeNull()
		await expect(validateApiKey("not_a_key", API_URL)).resolves.toBeNull()
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it("surfaces a 500 from the session endpoint as TransientAuthError, not invalid token", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		const error = vi.spyOn(console, "error").mockImplementation(() => {})
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
		)

		await expect(
			validateApiKey("sm_outage_key_0123456789abcdef", API_URL),
		).rejects.toThrow(TransientAuthError)
		expect(error).toHaveBeenCalledTimes(1)
		expect(error.mock.calls[0]?.[0]).toBe(
			"Auth backend unavailable during API key validation: Session endpoint returned 500",
		)
		expect(warn).not.toHaveBeenCalled()
	})

	it("surfaces a session-endpoint timeout as TransientAuthError", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		const error = vi.spyOn(console, "error").mockImplementation(() => {})
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
		expect(error).toHaveBeenCalledTimes(1)
		expect(warn).not.toHaveBeenCalled()
	})
})
