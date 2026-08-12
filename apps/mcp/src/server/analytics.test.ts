import type { McpServer, ServerContext } from "@modelcontextprotocol/server"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import {
	createTrackedToolServer,
	posthogEventForToolExecution,
	type McpToolAnalytics,
} from "./analytics"

function testServer() {
	let callback: ((...args: unknown[]) => unknown) | undefined
	const registerTool = vi.fn(
		(
			_name: string,
			_config: unknown,
			handler: (...args: unknown[]) => unknown,
		) => {
			callback = handler
			return {}
		},
	)

	return {
		server: { registerTool } as unknown as McpServer,
		invoke(...args: unknown[]) {
			if (!callback) throw new Error("Tool was not registered")
			return callback(...args)
		},
	}
}

const context = {
	mcpReq: { envelope: {} },
} as unknown as ServerContext

describe("MCP tool analytics", () => {
	it("records sanitized completion metadata without tool content", async () => {
		const harness = testServer()
		const record = vi.fn()
		const analytics: McpToolAnalytics = { record }
		const server = createTrackedToolServer(harness.server, analytics, () => ({
			name: "claude",
			version: "1.2.3",
		}))

		server.registerTool(
			"search_memory",
			{
				inputSchema: z.object({ query: z.string(), containerTag: z.string() }),
			},
			async () => ({
				content: [{ type: "text" as const, text: "secret result" }],
			}),
		)

		await harness.invoke(
			{ query: "private query", containerTag: "private-space" },
			context,
		)

		expect(record).toHaveBeenCalledOnce()
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				toolName: "search_memory",
				surface: "model_tool",
				outcome: "success",
				spaceExplicit: true,
				client: { name: "claude", version: "1.2.3" },
			}),
		)
		expect(JSON.stringify(record.mock.calls[0])).not.toContain("private query")
		expect(JSON.stringify(record.mock.calls[0])).not.toContain("private-space")
		expect(JSON.stringify(record.mock.calls[0])).not.toContain("secret result")
	})

	it("treats returned MCP errors as failed executions", async () => {
		const harness = testServer()
		const record = vi.fn()
		const server = createTrackedToolServer(
			harness.server,
			{ record },
			() => null,
		)

		server.registerTool(
			"save-memory",
			{ inputSchema: z.object({}) },
			async () => ({
				content: [{ type: "text" as const, text: "failed" }],
				isError: true,
			}),
		)

		await harness.invoke({}, context)

		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				surface: "app_action",
				outcome: "error",
				errorType: "tool_result",
			}),
		)
	})

	it("records thrown error categories and preserves the rejection", async () => {
		const harness = testServer()
		const record = vi.fn()
		const server = createTrackedToolServer(
			harness.server,
			{ record },
			() => null,
		)

		server.registerTool(
			"fetch-graph-data",
			{ inputSchema: z.object({}) },
			async () => {
				throw new TypeError("sensitive failure")
			},
		)

		await expect(harness.invoke({}, context)).rejects.toThrow(
			"sensitive failure",
		)
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				surface: "app_internal",
				outcome: "error",
				errorType: "TypeError",
			}),
		)
		expect(JSON.stringify(record.mock.calls[0])).not.toContain(
			"sensitive failure",
		)
	})

	it("uses the existing user identity and company group", () => {
		const event = posthogEventForToolExecution(
			{
				userId: "user_123",
				organizationId: "org_123",
				oauthClientId: "client_123",
			},
			{
				toolName: "guided-save",
				surface: "app_launcher",
				outcome: "success",
				durationMs: 42,
				spaceExplicit: false,
			},
		)

		expect(event).toEqual({
			distinctId: "user_123",
			event: "mcp_tool_executed",
			groups: { company: "org_123" },
			properties: {
				app: "mcp",
				tool_name: "guided-save",
				outcome: "success",
				duration_ms: 42,
				mcp_runtime: "stateless",
				mcp_surface: "app_launcher",
				space_explicit: false,
				oauth_client_id: "client_123",
			},
		})
	})
})
