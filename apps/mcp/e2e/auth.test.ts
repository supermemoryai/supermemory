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

// No credentials needed — exercises the public surface and auth rejections.
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

	it("serves an MCP Server Card at the reserved location", async () => {
		const res = await fetch(`${MCP_URL}/server-card`, {
			headers: { Accept: "application/mcp-server-card+json" },
		})
		expect(res.status).toBe(200)
		expect(res.headers.get("content-type")).toBe(
			"application/mcp-server-card+json",
		)
		expect(res.headers.get("access-control-allow-origin")).toBe("*")
		const card = (await res.json()) as {
			$schema?: string
			name?: string
			remotes?: { type?: string; url?: string }[]
		}
		expect(card.$schema).toBe(
			"https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
		)
		expect(card.name).toMatch(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/)
		expect(card.remotes?.[0]).toMatchObject({ type: "streamable-http" })
		expect(card.remotes?.[0]?.url).toMatch(/\/mcp$/)
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

	it("rejects an opaque API key as an invalid OAuth token", async () => {
		const res = await fetch(MCP_URL, {
			method: "POST",
			headers: mcpHeaders("Bearer sm_invalid_key_for_e2e"),
			body: initBody,
		})
		expect(res.status).toBe(401)
		const body = (await res.json()) as { error?: { message?: string } }
		expect(body.error?.message).toMatch(/invalid|expired/i)
	})

	it("rejects a malformed OAuth bearer without API introspection", async () => {
		const res = await fetch(MCP_URL, {
			method: "POST",
			headers: mcpHeaders("Bearer not-a-jwt"),
			body: initBody,
		})
		expect(res.status).toBe(401)
		const body = (await res.json()) as { error?: { message?: string } }
		expect(body.error?.message).toMatch(/invalid|expired/i)
	})
})
