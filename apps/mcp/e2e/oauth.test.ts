import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	authServerMetadata,
	type AuthServerMetadata,
	callTool,
	connect,
	exchangeRefreshToken,
	MCP_RESOURCE,
	OAUTH_CLIENT_ID,
	OAUTH_REFRESH_TOKEN,
	registerClient,
	type Session,
	textOf,
} from "./helpers"

// Tiers A–C exercise the real OAuth protocol wiring with no secrets and no browser.
describe("MCP — OAuth protocol (no secrets)", () => {
	let meta: AuthServerMetadata

	beforeAll(async () => {
		meta = (await authServerMetadata()).metadata
	})

	// Tier A — the discovery chain a client walks from a 401 to the auth server.
	it("discovers the authorization server from protected-resource metadata", () => {
		expect(meta.authorization_endpoint).toMatch(/\/authorize$/)
		expect(meta.token_endpoint).toMatch(/\/token$/)
		expect(meta.registration_endpoint).toMatch(/\/register$/)
	})

	it("advertises PKCE S256 and the authorization_code + refresh_token grants", () => {
		expect(meta.code_challenge_methods_supported).toContain("S256")
		expect(meta.response_types_supported).toContain("code")
		expect(meta.grant_types_supported).toContain("authorization_code")
		expect(meta.grant_types_supported).toContain("refresh_token")
	})

	// Tier B — Dynamic Client Registration, the first authenticated-flow step.
	it("issues a client_id via dynamic client registration", async () => {
		const { status, body } = await registerClient(meta.registration_endpoint)
		expect(status).toBe(200)
		expect(body.client_id).toBeTruthy()
		expect(body.grant_types).toContain("refresh_token")
	})

	// Tier C — token endpoint rejects forged grants with proper OAuth errors.
	it("rejects a bogus refresh_token with invalid_grant", async () => {
		const { status, body } = await exchangeRefreshToken(
			meta.token_endpoint,
			"bogus_rt_for_e2e",
			"bogus_client",
		)
		expect(status).toBe(400)
		expect(body.error).toBe("invalid_grant")
	})

	it("rejects a bogus authorization code with invalid_grant", async () => {
		const res = await fetch(meta.token_endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code: "bogus_code",
				client_id: "bogus",
				code_verifier: "abc",
				redirect_uri: "http://localhost:8765/callback",
			}),
		})
		expect(res.status).toBe(401)
		expect(((await res.json()) as { error?: string }).error).toBe(
			"invalid_grant",
		)
	})

	it("presents login for an unauthenticated authorize request", async () => {
		const { body: client } = await registerClient(meta.registration_endpoint)
		expect(client.client_id).toBeTruthy()
		const url = new URL(meta.authorization_endpoint)
		url.search = new URLSearchParams({
			response_type: "code",
			client_id: client.client_id as string,
			redirect_uri: "http://localhost:8765/callback",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
			scope: "openid profile email offline_access",
			resource: MCP_RESOURCE,
			state: "xyz",
		}).toString()
		const res = await fetch(url, { redirect: "manual" })
		if (res.status === 302) {
			expect(res.headers.get("location")).toMatch(/\/login/)
		} else {
			expect(res.status).toBe(200)
			const body = (await res.json()) as { redirect?: boolean; url?: string }
			expect(body.redirect).toBe(true)
			expect(body.url).toMatch(/\/login/)
		}
	})
})

// Tier D — real OAuth token through /mcp, exercising validateOAuthToken (not the sm_ branch); needs a seeded refresh token.
describe.skipIf(!OAUTH_REFRESH_TOKEN || !OAUTH_CLIENT_ID)(
	"MCP — real OAuth token round-trip",
	() => {
		let s: Session
		let accessToken: string

		beforeAll(async () => {
			const { metadata } = await authServerMetadata()
			const { status, body } = await exchangeRefreshToken(
				metadata.token_endpoint,
				OAUTH_REFRESH_TOKEN as string,
				OAUTH_CLIENT_ID as string,
			)
			expect(status, `refresh exchange failed: ${JSON.stringify(body)}`).toBe(
				200,
			)
			expect(body.access_token).toBeTruthy()
			accessToken = body.access_token as string
		})
		afterAll(async () => {
			await s?.close()
		})

		it("mints an OAuth access token that is not an sm_ API key", () => {
			expect(accessToken.startsWith("sm_")).toBe(false)
		})

		it("connects to /mcp with the OAuth token and resolves identity", async () => {
			s = await connect({ token: accessToken })
			const res = await callTool(s.client, "whoAmI")
			expect(res.isError).toBeFalsy()
			expect(JSON.parse(textOf(res)).userId).toBeTruthy()
		})
	},
)
