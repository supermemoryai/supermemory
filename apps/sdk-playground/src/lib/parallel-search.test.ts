import { afterEach, expect, mock, test } from "bun:test"
import { MockLanguageModelV2, mockValues } from "ai/test"

let model: MockLanguageModelV2
mock.module("@ai-sdk/openai", () => ({
	createOpenAI: () => () => model,
}))

const { runTypeScriptChat } = await import("./chat-handlers")
const { withParallelSearch } = await import("./parallel-search")
const realFetch = globalThis.fetch
const originalFlag = process.env.SDK_PLAYGROUND_PARALLEL_SEARCH
const requests: Array<{ url: string; headers: Headers; method: string }> = []

afterEach(() => {
	globalThis.fetch = realFetch
	if (originalFlag === undefined)
		delete process.env.SDK_PLAYGROUND_PARALLEL_SEARCH
	else process.env.SDK_PLAYGROUND_PARALLEL_SEARCH = originalFlag
	requests.length = 0
})

const usage = { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
const response = (content: Array<{ type: "text"; text: string }>) => ({
	content,
	finishReason: "stop" as const,
	usage,
	warnings: [],
})
const request = {
	sdkId: "ts-ai-sdk-tools",
	messages: [
		{
			role: "user" as const,
			content: "Find the MCP specification and read it",
		},
	],
	namespace: "parallel-search-test",
	conversationId: "parallel-search-test",
}
// The model fixture never calls Supermemory; no saved or environment keys are used.
const keys = { openaiApiKey: "fixture", supermemoryApiKey: "fixture" }

function interceptMcp(live = false, failList = false) {
	globalThis.fetch = (async (input, init) => {
		const url = input instanceof Request ? input.url : String(input)
		expect(url).toBe("https://search.parallel.ai/mcp")
		const headers = new Headers(init?.headers)
		expect(headers.get("user-agent")).toStartWith(
			"supermemory-sdk-playground/0.1.0",
		)
		expect(headers.has("authorization")).toBe(false)
		if (init?.method !== "POST") {
			requests.push({ url, headers, method: init?.method ?? "GET" })
			if (live) return realFetch(input, init)
			return new Response(null, {
				status: init?.method === "DELETE" ? 204 : 405,
			})
		}
		const body = JSON.parse(String(init?.body))
		requests.push({ url, headers, method: body.method })
		if (live) return realFetch(input, init)
		if (body.id === undefined) return new Response(null, { status: 202 })
		if (failList && body.method === "tools/list") {
			return new Response("Unavailable", { status: 503 })
		}
		const result =
			body.method === "initialize"
				? {
						protocolVersion: "2024-11-05",
						capabilities: { tools: {} },
						serverInfo: { name: "fixture", version: "1" },
					}
				: body.method === "tools/list"
					? {
							tools: [
								{
									name: "web_search",
									description: "Search",
									inputSchema: {
										type: "object",
										properties: {
											objective: { type: "string" },
											search_queries: {
												type: "array",
												items: { type: "string" },
											},
										},
										required: ["objective", "search_queries"],
									},
								},
								{
									name: "web_fetch",
									description: "Fetch",
									inputSchema: {
										type: "object",
										properties: {
											urls: { type: "array", items: { type: "string" } },
										},
										required: ["urls"],
									},
								},
							],
						}
					: {
							content: [
								{
									type: "text",
									text: "Model Context Protocol specification: https://modelcontextprotocol.io/specification",
								},
							],
						}
		return Response.json(
			{ jsonrpc: "2.0", id: body.id, result },
			{ headers: { "mcp-session-id": "fixture-session" } },
		)
	}) as typeof fetch
}

test("default tools mode does not connect to Parallel", async () => {
	delete process.env.SDK_PLAYGROUND_PARALLEL_SEARCH
	globalThis.fetch = (() => {
		throw new Error("Unexpected network request")
	}) as unknown as typeof fetch
	model = new MockLanguageModelV2({
		doGenerate: response([{ type: "text", text: "Memory tools ready" }]),
	})
	const result = await runTypeScriptChat(request, keys)
	expect(result.text).toBe("Memory tools ready")
	const names = model.doGenerateCalls[0].tools?.map((tool) => tool.name)
	expect(names).toHaveLength(7)
	expect(names).not.toContain("web_search")
})

test("opt-in agent dispatches search and fetch and receives their results", async () => {
	process.env.SDK_PLAYGROUND_PARALLEL_SEARCH = "true"
	interceptMcp(process.env.PARALLEL_MCP_LIVE === "true")
	const next = mockValues<
		Awaited<ReturnType<MockLanguageModelV2["doGenerate"]>>
	>(
		{
			content: [
				{
					type: "tool-call",
					toolCallId: "search",
					toolName: "web_search",
					input: JSON.stringify({
						objective: "Find the Model Context Protocol specification",
						search_queries: ["Model Context Protocol specification"],
					}),
				},
			],
			finishReason: "tool-calls",
			usage,
			warnings: [],
		},
		{
			content: [
				{
					type: "tool-call",
					toolCallId: "fetch",
					toolName: "web_fetch",
					input: JSON.stringify({
						urls: ["https://modelcontextprotocol.io/specification"],
					}),
				},
			],
			finishReason: "tool-calls",
			usage,
			warnings: [],
		},
		response([{ type: "text", text: "Search and fetch results received" }]),
	)
	model = new MockLanguageModelV2({ doGenerate: async () => next() })
	const result = await runTypeScriptChat(request, keys)
	expect(result.toolTrace.map((entry) => entry.toolName)).toEqual([
		"web_search",
		"web_fetch",
	])
	for (const entry of result.toolTrace) {
		expect(JSON.stringify(entry.result)).toContain("modelcontextprotocol.io")
		expect(entry.result).not.toHaveProperty("isError", true)
	}
	expect(JSON.stringify(model.doGenerateCalls[2].prompt)).toContain(
		"modelcontextprotocol.io",
	)
	expect(model.doGenerateCalls[0].tools).toHaveLength(9)
	expect(requests.map((entry) => entry.method)).toContain("initialize")
	expect(requests.map((entry) => entry.method)).toContain("tools/list")
	expect(
		requests.filter((entry) => entry.method === "tools/call"),
	).toHaveLength(2)
	if (process.env.PARALLEL_MCP_LIVE !== "true") {
		expect(requests.filter((entry) => entry.method === "DELETE")).toHaveLength(
			1,
		)
	}
})

test("opt-in discovery errors fail the request", async () => {
	process.env.SDK_PLAYGROUND_PARALLEL_SEARCH = "true"
	interceptMcp(false, true)
	model = new MockLanguageModelV2()
	await expect(runTypeScriptChat(request, keys)).rejects.toThrow()
	expect(model.doGenerateCalls).toHaveLength(0)
	expect(requests.filter((entry) => entry.method === "DELETE")).toHaveLength(1)
})

test("connection closes once when the agent fails or is cancelled", async () => {
	process.env.SDK_PLAYGROUND_PARALLEL_SEARCH = "true"
	interceptMcp()
	model = new MockLanguageModelV2({
		doGenerate: async () => {
			throw new Error("Model failed")
		},
	})
	await expect(runTypeScriptChat(request, keys)).rejects.toThrow("Model failed")
	expect(requests.filter((entry) => entry.method === "DELETE")).toHaveLength(1)
	requests.length = 0
	const controller = new AbortController()
	await expect(
		withParallelSearch({}, controller.signal, async () => {
			controller.abort(new Error("Cancelled"))
			controller.signal.throwIfAborted()
		}),
	).rejects.toThrow("Cancelled")
	expect(requests.filter((entry) => entry.method === "DELETE")).toHaveLength(1)
})
