import {
	Client,
	StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import app from "./index"

const MCP_URL = "https://mcp.supermemory.ai/mcp"
const API_URL = "https://api.test"
const MODERN_PROTOCOL_VERSION = "2026-07-28"

function mockApiKeyValidation() {
	const mockedFetch = vi.fn(async (input: RequestInfo | URL) => {
		const request = new Request(input)
		if (request.url === `${API_URL}/v3/session`) {
			return Response.json({
				user: {
					id: "user_from_auth",
					email: "auth@example.com",
					name: "Auth User",
				},
			})
		}
		throw new Error(`Unexpected upstream request: ${request.url}`)
	})
	vi.stubGlobal("fetch", mockedFetch)
	return mockedFetch
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("MCP Worker entry", () => {
	it("authenticates and serves a modern request sequence", async () => {
		const mockedFetch = mockApiKeyValidation()
		const workerFetch = async (
			input: RequestInfo | URL,
			init?: RequestInit,
		) => {
			const request = new Request(input, init)
			const headers = new Headers(request.headers)
			headers.set("Authorization", "Bearer sm_test")
			return app.request(new Request(request, { headers }), undefined, {
				API_URL,
			})
		}
		const client = new Client(
			{ name: "worker-entry-tests", version: "1.0.0" },
			{ versionNegotiation: { mode: { pin: MODERN_PROTOCOL_VERSION } } },
		)
		const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
			fetch: workerFetch,
		})

		try {
			await client.connect(transport)
			const { tools } = await client.listTools()
			expect(tools.map((tool) => tool.name)).toContain("whoAmI")

			const identity = await client.callTool({ name: "whoAmI", arguments: {} })
			const content = identity.content[0]
			if (content?.type !== "text") throw new Error("Missing whoAmI result")
			expect(JSON.parse(content.text)).toMatchObject({
				userId: "user_from_auth",
				email: "auth@example.com",
				client: { name: "worker-entry-tests", version: "1.0.0" },
				sessionId: null,
			})

			// server/discover, tools/list, and tools/call are independently authenticated.
			expect(mockedFetch).toHaveBeenCalledTimes(3)
		} finally {
			await client.close()
		}
	})

	it("echoes modern routing headers in browser preflight", async () => {
		const requestedHeaders =
			"authorization, content-type, mcp-method, mcp-name, mcp-param-container-tag"
		const response = await app.request(
			MCP_URL,
			{
				method: "OPTIONS",
				headers: {
					Origin: "https://client.example",
					"Access-Control-Request-Method": "POST",
					"Access-Control-Request-Headers": requestedHeaders,
				},
			},
			{ API_URL },
		)

		expect(response.status).toBe(204)
		expect(response.headers.get("access-control-allow-origin")).toBe("*")
		expect(
			response.headers.get("access-control-allow-headers")?.split(","),
		).toEqual(requestedHeaders.split(/\s*,\s*/))
	})

	it("keeps exact routing and bearer authentication at /mcp", async () => {
		const [missingToken, longerPath] = await Promise.all([
			app.request(MCP_URL, { method: "POST" }, { API_URL }),
			app.request(`${MCP_URL}/other`, { method: "POST" }, { API_URL }),
		])

		expect(missingToken.status).toBe(401)
		expect(missingToken.headers.get("www-authenticate")).toContain(
			"oauth-protected-resource/mcp",
		)
		expect(longerPath.status).toBe(404)
	})

	it.each([
		"GET",
		"DELETE",
	])("rejects the session-only %s method after authentication", async (method) => {
		mockApiKeyValidation()
		const response = await app.request(
			MCP_URL,
			{
				method,
				headers: { Authorization: "Bearer sm_test" },
			},
			{ API_URL },
		)

		expect(response.status).toBe(405)
		expect(await response.json()).toMatchObject({
			jsonrpc: "2.0",
			id: null,
			error: { code: -32000, message: "Method not allowed." },
		})
		expect(response.headers.get("mcp-session-id")).toBeNull()
	})
})
