import { describe, expect, it } from "vitest"
import { MCP_URL, ORIGIN } from "./helpers"

const initBody = JSON.stringify({
	jsonrpc: "2.0",
	id: 1,
	method: "initialize",
	params: {
		protocolVersion: "2024-11-05",
		capabilities: {},
		clientInfo: { name: "smtest", version: "0.0.1" },
	},
})

const mcpHeaders = (auth?: string) => ({
	"Content-Type": "application/json",
	Accept: "application/json, text/event-stream",
	...(auth ? { Authorization: auth } : {}),
})

// No API key needed — exercises the public surface and auth rejections.
describe("MCP — transport & auth (raw HTTP)", () => {
	it("GET / returns service info", async () => {
		const res = await fetch(`${ORIGIN}/`)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { name?: string; version?: string }
		expect(body.name).toBe("supermemory-mcp")
		expect(body.version).toBeTruthy()
	})

	it("exposes OAuth protected-resource discovery", async () => {
		const res = await fetch(
			`${ORIGIN}/.well-known/oauth-protected-resource/mcp`,
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			resource?: string
			authorization_servers?: string[]
		}
		expect(body.resource).toMatch(/\/mcp$/)
		expect(Array.isArray(body.authorization_servers)).toBe(true)
		expect(body.authorization_servers?.length).toBeGreaterThan(0)
	})

	it("rejects a request with no token (401 + WWW-Authenticate)", async () => {
		const res = await fetch(MCP_URL, {
			method: "POST",
			headers: mcpHeaders(),
			body: initBody,
		})
		expect(res.status).toBe(401)
		expect(res.headers.get("www-authenticate")).toMatch(/Bearer/)
	})

	it("rejects an invalid API key (401 with JSON-RPC error)", async () => {
		const res = await fetch(MCP_URL, {
			method: "POST",
			headers: mcpHeaders("Bearer sm_invalid_key_for_e2e"),
			body: initBody,
		})
		expect(res.status).toBe(401)
		const body = (await res.json()) as { error?: { message?: string } }
		expect(body.error?.message).toMatch(/invalid|expired/i)
	})
})
