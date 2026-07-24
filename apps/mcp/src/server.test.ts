import {
	Client,
	StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client"
import { createMcpHandler } from "@modelcontextprotocol/server"
import { describe, expect, it } from "vitest"
import { createServer, type AuthProps } from "./server"

const MCP_URL = "https://mcp.supermemory.ai/mcp"
const MODERN_PROTOCOL_VERSION = "2026-07-28"
const AUTH_PROPS: AuthProps = {
	userId: "user_test",
	apiKey: "sm_test",
	email: "test@example.com",
	name: "Test User",
}

function handler(props: AuthProps = AUTH_PROPS) {
	return createMcpHandler(() => createServer({}, props))
}

function clientFor(props: AuthProps = AUTH_PROPS) {
	const mcpHandler = handler(props)
	const requests: Array<{
		method: string
		rpcMethod?: string
		headers: Headers
	}> = []
	const workerFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		const request = new Request(input, init)
		const body =
			request.method === "POST"
				? ((await request.clone().json()) as { method?: string })
				: undefined
		requests.push({
			method: request.method,
			rpcMethod: body?.method,
			headers: new Headers(request.headers),
		})
		return mcpHandler.fetch(request)
	}

	const client = new Client(
		{ name: "supermemory-mcp-tests", version: "1.0.0" },
		{ versionNegotiation: { mode: { pin: MODERN_PROTOCOL_VERSION } } },
	)
	const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
		fetch: workerFetch,
	})

	return { client, transport, requests }
}

async function parseMcpResponse(response: Response) {
	const text = await response.text()
	if (response.headers.get("content-type")?.includes("text/event-stream")) {
		const data = text.split("\n").find((line) => line.startsWith("data:"))
		if (!data) throw new Error(`Missing SSE data frame: ${text}`)
		return JSON.parse(data.slice("data:".length).trim()) as Record<
			string,
			unknown
		>
	}
	return JSON.parse(text) as Record<string, unknown>
}

describe("MCP SDK v2 HTTP server", () => {
	it("serves modern discovery and request-local tools without a session", async () => {
		const { client, transport, requests } = clientFor()
		try {
			await client.connect(transport)

			expect(client.getProtocolEra()).toBe("modern")
			expect(client.getNegotiatedProtocolVersion()).toBe(
				MODERN_PROTOCOL_VERSION,
			)
			expect(client.getServerVersion()).toEqual({
				name: "supermemory",
				version: "4.0.0",
			})

			const { tools } = await client.listTools()
			expect(tools.map((tool) => tool.name)).toEqual(
				expect.arrayContaining([
					"memory",
					"recall",
					"listMemories",
					"listProjects",
					"whoAmI",
					"memory-graph",
				]),
			)

			const memoryGraph = tools.find((tool) => tool.name === "memory-graph")
			expect(memoryGraph?._meta).toMatchObject({
				"ui/resourceUri": "ui://memory-graph/mcp-app.html",
				ui: { resourceUri: "ui://memory-graph/mcp-app.html" },
			})

			const { resources } = await client.listResources()
			expect(resources.map((resource) => resource.uri)).toEqual(
				expect.arrayContaining([
					"supermemory://profile",
					"supermemory://projects",
					"ui://memory-graph/mcp-app.html",
				]),
			)
			expect(
				(await client.listPrompts()).prompts.map((prompt) => prompt.name),
			).toContain("context")

			const identity = await client.callTool({ name: "whoAmI", arguments: {} })
			expect(identity.isError).toBeFalsy()
			const content = identity.content[0]
			expect(content?.type).toBe("text")
			if (content?.type !== "text")
				throw new Error("Missing whoAmI text result")
			expect(JSON.parse(content.text)).toMatchObject({
				userId: AUTH_PROPS.userId,
				email: AUTH_PROPS.email,
				client: { name: "supermemory-mcp-tests", version: "1.0.0" },
				sessionId: null,
			})

			expect(requests.map((request) => request.rpcMethod)).toEqual([
				"server/discover",
				"tools/list",
				"resources/list",
				"prompts/list",
				"tools/call",
			])
			for (const request of requests) {
				expect(request.method).toBe("POST")
				expect(request.headers.get("MCP-Protocol-Version")).toBe(
					MODERN_PROTOCOL_VERSION,
				)
				expect(request.headers.get("Mcp-Method")).toBe(request.rpcMethod)
			}
			expect(requests.at(-1)?.headers.get("Mcp-Name")).toBe("whoAmI")
		} finally {
			await client.close()
		}
	})

	it("keeps root project scoping in request-local tool schemas", async () => {
		const plain = clientFor()
		const scoped = clientFor({ ...AUTH_PROPS, containerTag: "project_root" })
		try {
			await Promise.all([
				plain.client.connect(plain.transport),
				scoped.client.connect(scoped.transport),
			])
			const [plainTools, scopedTools] = await Promise.all([
				plain.client.listTools(),
				scoped.client.listTools(),
			])
			const properties = (
				tools: typeof plainTools.tools,
				name: string,
			): Record<string, unknown> =>
				(tools.find((tool) => tool.name === name)?.inputSchema.properties ??
					{}) as Record<string, unknown>

			expect(properties(plainTools.tools, "memory")).toHaveProperty(
				"containerTag",
			)
			expect(properties(scopedTools.tools, "memory")).not.toHaveProperty(
				"containerTag",
			)
		} finally {
			await Promise.all([plain.client.close(), scoped.client.close()])
		}
	})

	it("retains stateless 2025 initialize and tool discovery compatibility", async () => {
		const mcpHandler = handler()
		const headers = {
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
		}
		const initialize = await mcpHandler.fetch(
			new Request(MCP_URL, {
				method: "POST",
				headers,
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "initialize",
					params: {
						protocolVersion: "2025-06-18",
						capabilities: {},
						clientInfo: { name: "legacy-test", version: "1.0.0" },
					},
				}),
			}),
		)
		const initialized = (await parseMcpResponse(initialize)) as {
			result?: { protocolVersion?: string; serverInfo?: unknown }
		}

		expect(initialize.status).toBe(200)
		expect(initialize.headers.get("content-type")).toContain(
			"text/event-stream",
		)
		expect(initialize.headers.get("mcp-session-id")).toBeNull()
		expect(initialized.result).toMatchObject({
			protocolVersion: "2025-06-18",
			serverInfo: { name: "supermemory", version: "4.0.0" },
		})

		const listedResponse = await mcpHandler.fetch(
			new Request(MCP_URL, {
				method: "POST",
				headers: { ...headers, "MCP-Protocol-Version": "2025-06-18" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 2,
					method: "tools/list",
				}),
			}),
		)
		const listed = (await parseMcpResponse(listedResponse)) as {
			result?: { tools?: Array<{ name: string }> }
		}
		expect(listedResponse.status).toBe(200)
		expect(listedResponse.headers.get("mcp-session-id")).toBeNull()
		expect(listed.result?.tools?.map((tool) => tool.name)).toContain("recall")
	})
})
