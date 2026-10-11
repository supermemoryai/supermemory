import { experimental_createMCPClient } from "@ai-sdk/mcp"
import { dynamicTool, type ToolSet } from "ai"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

/** Keep the MCP connection alive for the whole agent loop, then release it. */
export async function withParallelSearch<T>(
	memoryTools: ToolSet,
	signal: AbortSignal | undefined,
	run: (tools: ToolSet) => Promise<T>,
): Promise<T> {
	if (process.env.SDK_PLAYGROUND_PARALLEL_SEARCH !== "true") {
		return run(memoryTools)
	}

	signal?.throwIfAborted()
	const transport = new StreamableHTTPClientTransport(
		new URL("https://search.parallel.ai/mcp"),
		{
			requestInit: {
				headers: { "User-Agent": "supermemory-sdk-playground/0.1.0" },
			},
			fetch: (url, init) =>
				fetch(url, {
					...init,
					signal: AbortSignal.any([
						...(signal ? [signal] : []),
						...(init?.signal ? [init.signal] : []),
						AbortSignal.timeout(init?.method === "DELETE" ? 1_000 : 30_000),
					]),
				}),
		},
	)
	// SDK transport close aborts immediately; session deletion is best effort
	// and bounded so an unavailable server cannot keep a cancelled chat alive.
	const closeTransport = transport.close.bind(transport)
	let closing: Promise<void> | undefined
	const close = () => {
		closing ??= (async () => {
			try {
				if (!signal?.aborted) await transport.terminateSession()
			} catch {
				// Always release local streams even if the server cannot delete its session.
			} finally {
				await closeTransport()
			}
		})()
		return closing
	}
	transport.close = close
	const onAbort = () => {
		void close().catch(() => {})
	}
	signal?.addEventListener("abort", onAbort, { once: true })

	try {
		signal?.throwIfAborted()
		const client = await experimental_createMCPClient({
			name: "supermemory-sdk-playground",
			transport,
		})
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
