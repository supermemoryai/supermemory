import { afterEach, describe, expect, it, vi } from "vitest"
import * as aiSdk from "../ai-sdk"
import * as openAi from "../openai/keenable"

afterEach(() => {
	vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	})
}

type ToolWithExecute = { execute: (args: Record<string, unknown>) => unknown }

function executeTool(tool: unknown, args: Record<string, unknown>) {
	return (tool as ToolWithExecute).execute(args)
}

describe("keenable tools", () => {
	it("ai-sdk webSearch returns ranked results", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				query: "bun 1.3 release",
				mode: "pro",
				results: [
					{
						title: "Bun 1.3",
						url: "https://bun.sh/blog/bun-v1.3",
						snippet: "Release notes",
					},
				],
			}),
		)

		const tool = aiSdk.webSearchTool({ fetch: fetchMock })
		const result = (await executeTool(tool, {
			query: "bun 1.3 release",
			maxResults: 3,
		})) as { success: boolean; count: number; results: unknown[] }

		expect(result.success).toBe(true)
		expect(result.count).toBe(1)
		expect(result.results[0]).toMatchObject({ title: "Bun 1.3" })
	})

	it("ai-sdk fetchPage surfaces page markdown", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				url: "https://example.com",
				title: "Example",
				content: "Hello world",
			}),
		)

		const tool = aiSdk.fetchPageTool({ fetch: fetchMock })
		const result = (await executeTool(tool, {
			url: "https://example.com",
		})) as { success: boolean; content: string }

		expect(result.success).toBe(true)
		expect(result.content).toBe("Hello world")
	})

	it("ai-sdk tools report Keenable failures without throwing", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response("rate limited", { status: 429 }))

		const tool = aiSdk.webSearchTool({ fetch: fetchMock })
		const result = (await executeTool(tool, { query: "q" })) as {
			success: boolean
			error: string
		}

		expect(result.success).toBe(false)
		expect(result.error).toContain("429")
	})

	it("openai executor routes webSearch and fetchPage", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse({
					query: "q",
					results: [{ title: "A", url: "https://a.example" }],
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({
					url: "https://a.example",
					content: "body",
				}),
			)

		const execute = openAi.createKeenableToolCallExecutor({ fetch: fetchMock })

		const search = JSON.parse(
			await execute({
				id: "1",
				type: "function",
				function: {
					name: "webSearch",
					arguments: JSON.stringify({ query: "q" }),
				},
			}),
		)
		const page = JSON.parse(
			await execute({
				id: "2",
				type: "function",
				function: {
					name: "fetchPage",
					arguments: JSON.stringify({ url: "https://a.example" }),
				},
			}),
		)

		expect(search.success).toBe(true)
		expect(search.count).toBe(1)
		expect(page.success).toBe(true)
		expect(page.content).toBe("body")
	})

	it("openai executor rejects unknown functions", async () => {
		const execute = openAi.createKeenableToolCallExecutor({
			fetch: vi.fn(),
		})
		const result = JSON.parse(
			await execute({
				id: "1",
				type: "function",
				function: { name: "searchMemories", arguments: "{}" },
			}),
		)
		expect(result.success).toBe(false)
		expect(result.error).toContain("Unknown function")
	})

	it("exposes keenable tool definitions", () => {
		const definitions = openAi.getKeenableToolDefinitions()
		expect(definitions.map((tool) => tool.function.name)).toEqual([
			"webSearch",
			"fetchPage",
		])
	})
})
