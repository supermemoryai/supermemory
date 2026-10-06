import type { Supermemory } from "supermemory"
import type {
	LanguageModelV2CallOptions,
	LanguageModelV2Message,
} from "@ai-sdk/provider"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
	type AddConversationParams,
	formatConversationText,
} from "../../src/conversations-client"
import { createLogger } from "../../src/shared"
import { saveMemoryAfterResponse } from "../../src/vercel/middleware"

const addConversationMock = vi.hoisted(() => vi.fn())

vi.mock("../../src/conversations-client", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../src/conversations-client")>()),
	addConversation: addConversationMock,
}))

const persistMessages = async (
	params: LanguageModelV2CallOptions,
	assistantResponseText: string,
	includeToolCalls = true,
) => {
	let captured: AddConversationParams | undefined
	addConversationMock.mockImplementation(
		async (conversation: AddConversationParams) => {
			captured = conversation
			return { id: "conversation-id", status: "queued" }
		},
	)

	await saveMemoryAfterResponse(
		{} as Supermemory,
		"user-id",
		"conversation-id",
		assistantResponseText,
		params,
		createLogger(false),
		"test-api-key",
		"https://api.example.com",
		includeToolCalls,
	)

	expect(captured?.namespace).toBe("user-id")
	expect(captured?.id).toBe("conversation-id")
	return captured?.messages
}

afterEach(() => {
	addConversationMock.mockReset()
})

describe("formatConversationText", () => {
	it("renders roles, tool calls, and images as plain text", () => {
		expect(
			formatConversationText([
				{ role: "user", content: "Hi" },
				{
					role: "assistant",
					content: "",
					tool_calls: [
						{
							id: "call-1",
							type: "function",
							function: { name: "search", arguments: '{"q":"x"}' },
						},
					],
				},
				{
					role: "user",
					content: [
						{ type: "text", text: "Look" },
						{ type: "image_url", imageUrl: { url: "https://x.test/a.png" } },
						{
							type: "image_url",
							imageUrl: { url: "data:image/png;base64,AA" },
						},
					],
				},
			]),
		).toBe(
			'User: Hi\n\nAssistant: [tool call: search({"q":"x"})]\n\nUser: Look [image: https://x.test/a.png] [image]',
		)
	})
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

	it("preserves order when tool result is followed by assistant text in one message", async () => {
		const params: LanguageModelV2CallOptions = {
			prompt: [
				{
					role: "assistant",
					content: [
						{
							type: "tool-call",
							toolCallId: "call-6",
							toolName: "search",
							input: { query: "project" },
						},
						{
							type: "tool-result",
							toolCallId: "call-6",
							toolName: "search",
							output: {
								type: "json",
								value: { memory: "Project memory" },
							},
						},
						{ type: "text", text: "Here is what I found." },
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
						id: "call-6",
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
				tool_call_id: "call-6",
			},
			{
				role: "assistant",
				content: [{ type: "text", text: "Here is what I found." }],
			},
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

	it("drops tool calls and tool results by default", async () => {
		const params: LanguageModelV2CallOptions = {
			prompt: [
				{
					role: "user",
					content: [{ type: "text", text: "Search my memories" }],
				},
				{
					role: "assistant",
					content: [
						{ type: "text", text: "I will search." },
						{
							type: "tool-call",
							toolCallId: "call-7",
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
							toolCallId: "call-7",
							toolName: "search",
							output: { type: "json", value: { memory: "Project memory" } },
						},
					],
				} as unknown as LanguageModelV2Message,
			],
		}

		expect(await persistMessages(params, "Found it", false)).toEqual([
			{
				role: "user",
				content: [{ type: "text", text: "Search my memories" }],
			},
			{
				role: "assistant",
				content: [{ type: "text", text: "I will search." }],
			},
			{ role: "assistant", content: "Found it" },
		])
	})
})
