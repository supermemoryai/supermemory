import { experimental_createMCPClient } from "@ai-sdk/mcp"
import { dynamicTool, type ToolSet } from "ai"

/** Keep the MCP connection alive for the whole agent loop, then release it. */
export async function withParallelSearch<T>(
	memoryTools: ToolSet,
	signal: AbortSignal | undefined,
	run: (tools: ToolSet) => Promise<T>,
): Promise<T> {
	if (process.env.SDK_PLAYGROUND_PARALLEL_SEARCH !== "true") {
		return run(memoryTools)
	}

	const client = await experimental_createMCPClient({
		name: "supermemory-sdk-playground",
		transport: {
			type: "http",
			url: "https://search.parallel.ai/mcp",
			headers: {
				"User-Agent": "supermemory-sdk-playground/0.1.0",
			},
		},
	})
	let closing: Promise<void> | undefined
	const close = () => {
		closing ??= client.close()
		return closing
	}
	const onAbort = () => {
		void close().catch(() => {})
	}
	signal?.addEventListener("abort", onAbort, { once: true })

	try {
		signal?.throwIfAborted()
		const tools = await client.tools()
		if (!tools.web_search || !tools.web_fetch) {
			throw new Error("Parallel MCP did not provide web_search and web_fetch")
		}
		signal?.throwIfAborted()
		return await run({
			web_search: dynamicTool({
				description: tools.web_search.description,
				inputSchema: tools.web_search.inputSchema,
				execute: tools.web_search.execute,
			}),
			web_fetch: dynamicTool({
				description: tools.web_fetch.description,
				inputSchema: tools.web_fetch.inputSchema,
				execute: tools.web_fetch.execute,
			}),
			...memoryTools,
		})
	} finally {
		signal?.removeEventListener("abort", onAbort)
		await close()
	}
}
