import type Supermemory from "supermemory"
import type {
	LanguageModelV2CallOptions,
	LanguageModelV2Message,
} from "@ai-sdk/provider"
import { afterEach, describe, expect, it } from "bun:test"
import { createLogger } from "../../src/shared"
import { saveMemoryAfterResponse } from "../../src/vercel/middleware"

const originalFetch = globalThis.fetch

const persistMessages = async (
	params: LanguageModelV2CallOptions,
	assistantResponseText: string,
) => {
	let messages: unknown[] | undefined

	const fetchStub: typeof fetch = Object.assign(
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = typeof input === "string" ? input : input.toString()
			expect(url).toContain("/v4/conversations")

			const body = typeof init?.body === "string" ? init.body : ""
			messages = (JSON.parse(body) as { messages: unknown[] }).messages

			return new Response(
				JSON.stringify({
					id: "document-id",
					conversationId: "conversation-id",
					status: "done",
				}),
				{ status: 200 },
			)
		},
		{ preconnect: originalFetch.preconnect },
	)

	globalThis.fetch = fetchStub

	await saveMemoryAfterResponse(
		{} as Supermemory,
		"user-id",
		"conversation-id",
		assistantResponseText,
		params,
		createLogger(false),
		"test-api-key",
		"https://api.example.com",
	)

	return messages
}

afterEach(() => {
	globalThis.fetch = originalFetch
})

describe("convertToConversationMessages", () => {
	it("preserves a tool-call and tool-result round trip", async () => {
		const params: LanguageModelV2CallOptions = {
			prompt: [
				{
					role: "user",
					content: [{ type: "text", text: "Search my memories" }],
				},
				{
					role: "assistant",
					content: [
						{
							type: "tool-call",
							toolCallId: "call-1",
							toolName: "search",
							input: { query: "project" },
						},
					],
				} as unknown as LanguageModelV2Message,
				{
					role: "tool",
					content: [
						{
							type: "tool-result",
							toolCallId: "call-1",
							toolName: "search",
							output: {
								type: "json",
								value: { memory: "Project memory" },
							},
						},
					],
				} as unknown as LanguageModelV2Message,
			],
		}

		expect(await persistMessages(params, "Found it")).toEqual([
			{
				role: "user",
				content: [{ type: "text", text: "Search my memories" }],
			},
			{
				role: "assistant",
				content: "",
				tool_calls: [
					{
						id: "call-1",
						type: "function",
						function: {
							name: "search",
							arguments: '{"query":"project"}',
						},
					},
				],
			},
			{
				role: "tool",
				content: '{"memory":"Project memory"}',
				tool_call_id: "call-1",
			},
			{ role: "assistant", content: "Found it" },
		])
	})

	it("keeps assistant text alongside tool calls", async () => {
		const params: LanguageModelV2CallOptions = {
			prompt: [
				{
					role: "assistant",
					content: [
						{ type: "text", text: "I will search." },
						{
							type: "tool-call",
							toolCallId: "call-2",
							toolName: "search",
							input: {},
						},
					],
				} as unknown as LanguageModelV2Message,
			],
		}

		expect(await persistMessages(params, "")).toEqual([
			{
				role: "assistant",
				content: [{ type: "text", text: "I will search." }],
				tool_calls: [
					{
						id: "call-2",
						type: "function",
						function: { name: "search", arguments: "{}" },
					},
				],
			},
		])
	})

	it("serializes a tool call with no input as empty JSON object", async () => {
		const params: LanguageModelV2CallOptions = {
			prompt: [
				{
					role: "assistant",
					content: [
						{
							type: "tool-call",
							toolCallId: "call-4",
							toolName: "now",
							input: undefined,
						},
					],
				} as unknown as LanguageModelV2Message,
			],
		}

		expect(await persistMessages(params, "")).toEqual([
			{
				role: "assistant",
				content: "",
				tool_calls: [
					{
						id: "call-4",
						type: "function",
						function: { name: "now", arguments: "{}" },
					},
				],
			},
		])
	})

	it("does not abort the save when tool-call input is not JSON-serializable", async () => {
		const params: LanguageModelV2CallOptions = {
			prompt: [
				{
					role: "user",
					content: [{ type: "text", text: "hi" }],
				},
				{
					role: "assistant",
					content: [
						{
							type: "tool-call",
							toolCallId: "call-5",
							toolName: "search",
							input: { cursor: BigInt(1) },
						},
					],
				} as unknown as LanguageModelV2Message,
			],
		}

		expect(await persistMessages(params, "done")).toEqual([
			{
				role: "user",
				content: [{ type: "text", text: "hi" }],
			},
			{
				role: "assistant",
				content: "",
				tool_calls: [
					{
						id: "call-5",
						type: "function",
						function: { name: "search", arguments: "{}" },
					},
				],
			},
			{ role: "assistant", content: "done" },
		])
	})

	it("unwraps text tool output", async () => {
		const params: LanguageModelV2CallOptions = {
			prompt: [
				{
					role: "tool",
					content: [
						{
							type: "tool-result",
							toolCallId: "call-3",
							toolName: "search",
							output: {
								type: "text",
								value: "No memories found",
							},
						},
					],
				} as unknown as LanguageModelV2Message,
			],
		}

		expect(await persistMessages(params, "")).toEqual([
			{
				role: "tool",
				content: "No memories found",
				tool_call_id: "call-3",
			},
		])
	})
})
