import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { z } from "zod/v3"
import { app } from "@holocron.so/vite/app"
import { AGENT_PROMPT } from "../snippets/agent-prompt.jsx"
import { readRequestBody, type ChatEnvironment } from "./chat"
import { searchDocumentation } from "./search-docs"

export async function docsMcp(request: Request, env: ChatEnvironment) {
	const headers = { "Cache-Control": "no-store" }
	if (request.method !== "POST") {
		return new Response("Method not allowed", {
			status: 405,
			headers: { ...headers, Allow: "POST" },
		})
	}
	const origin = request.headers.get("Origin")
	if (origin && origin !== new URL(request.url).origin) {
		return new Response("Invalid origin", { status: 403, headers })
	}
	const { success } = await env.CHAT_RATE_LIMITER.limit({
		key: `mcp:${request.headers.get("CF-Connecting-IP") ?? "local"}`,
	})
	if (!success)
		return new Response("Rate limited", {
			status: 429,
			headers: { ...headers, "Retry-After": "60" },
		})
	let parsedBody: unknown
	try {
		parsedBody = JSON.parse(await readRequestBody(request))
	} catch {
		return new Response("Invalid or oversized JSON request", {
			status: 400,
			headers,
		})
	}
	const server = new McpServer({ name: "supermemory-docs", version: "1.0.0" })
	server.registerResource(
		"skill",
		"supermemory://docs/skill",
		{ mimeType: "text/markdown" },
		async (uri) => ({
			contents: [
				{ uri: uri.href, mimeType: "text/markdown", text: AGENT_PROMPT },
			],
		}),
	)
	server.registerResource(
		"documentation",
		"https://supermemory.ai/docs/llms-full.txt",
		{ mimeType: "text/markdown" },
		async (uri) => {
			const response = await app.handle(new Request(uri))
			if (!response.ok) throw new Error("Documentation export is unavailable")
			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "text/markdown",
						text: await response.text(),
					},
				],
			}
		},
	)
	server.registerTool(
		"search_docs",
		{
			description:
				"Search the public Supermemory documentation and API reference. Returns source excerpts and canonical URLs.",
			inputSchema: { query: z.string().min(1).max(2_000) },
		},
		async ({ query }) => {
			if (!env.SUPERMEMORY_API_KEY) {
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: "Documentation search is not configured yet.",
						},
					],
				}
			}
			try {
				const results = await searchDocumentation(query, env)
				return { content: [{ type: "text", text: JSON.stringify(results) }] }
			} catch {
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: "Documentation search is temporarily unavailable.",
						},
					],
				}
			}
		},
	)
	const transport = new WebStandardStreamableHTTPServerTransport({
		enableJsonResponse: true,
	})
	await server.connect(transport)
	try {
		const response = await transport.handleRequest(request, { parsedBody })
		response.headers.set("Cache-Control", "no-store")
		return response
	} finally {
		await server.close()
	}
}
