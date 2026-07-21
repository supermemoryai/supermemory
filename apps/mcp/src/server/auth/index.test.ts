import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { fetchSession, validateApiKey, validateOAuthToken } from "./index"

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
		overrides: { audience?: string; subject?: string; expiresIn?: string } = {},
	) {
		let token = new SignJWT({ organization_id: "org_test" })
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
		).resolves.toEqual({ userId: "user_test", bearerToken: token })
		expect(fetchSpy).not.toHaveBeenCalled()
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

	it("introspects opaque API keys through v3/session", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ user: { id: "user_api_key" } }), {
				status: 200,
			}),
		)
		vi.stubGlobal("fetch", fetchSpy)

		await expect(validateApiKey("sm_test", `${API_URL}/`)).resolves.toEqual({
			userId: "user_api_key",
			bearerToken: "sm_test",
		})
		expect(fetchSpy).toHaveBeenCalledOnce()
		expect(fetchSpy.mock.calls[0][0]).toBe(`${API_URL}/v3/session`)
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
})
