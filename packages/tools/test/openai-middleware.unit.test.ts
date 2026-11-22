import type OpenAI from "openai"
import {
	errorResponse,
	profileBody,
	requestJson,
	requestPath,
	searchBody,
	v5Router,
} from "./v5-fetch"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { withSupermemory } from "../src/openai"

type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParams
type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

const MEMORY_TAG = /<supermemory context="user-memories" readonly>/g

const fakeChatClient = (reply: (params: ChatParams) => unknown) => {
	const create = vi.fn((params: ChatParams) =>
		Object.assign(Promise.resolve(reply(params)), {
			asResponse: async () => new Response(),
		}),
	)
	const client = {
		chat: { completions: { create } },
	} as unknown as OpenAI
	return { client, create }
}

const answer = (content: string) => ({
	choices: [{ index: 0, message: { role: "assistant", content } }],
})

const toolCall = (id: string) => ({
	choices: [
		{
			index: 0,
			message: {
				role: "assistant",
				content: null,
				tool_calls: [
					{
						id,
						type: "function",
						function: { name: "read_file", arguments: "{}" },
					},
				],
			},
		},
	],
})

describe("OpenAI middleware memory context", () => {
	const originalApiKey = process.env.SUPERMEMORY_API_KEY

	beforeEach(() => {
		process.env.SUPERMEMORY_API_KEY = "sm_test_key"
	})

	afterEach(() => {
		if (originalApiKey === undefined) delete process.env.SUPERMEMORY_API_KEY
		else process.env.SUPERMEMORY_API_KEY = originalApiKey
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	it("appends the profile to the caller's system message and leaves the user turn untouched", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(v5Router({ profile: () => profileBody(["Fresh profile fact"]) })),
		)
		const { client, create } = fakeChatClient(() => answer("ok"))
		const wrapped = withSupermemory(client, {
			namespace: "user-a",
			id: "conversation-a",
			mode: "profile",
			addMemory: "never",
		})

		await wrapped.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{ role: "system", content: "Be helpful." },
				{ role: "user", content: "What do you remember?" },
			],
		})

		const forwarded = create.mock.calls[0]?.[0] as ChatParams
		const system = String(forwarded.messages[0]?.content)
		expect(system.startsWith("Be helpful.\n")).toBe(true)
		expect(system).toContain("Fresh profile fact")
		expect(system.match(MEMORY_TAG)).toHaveLength(1)
		expect(forwarded.messages[1]).toEqual({
			role: "user",
			content: "What do you remember?",
		})
	})

	it("recalls once per user turn and re-sends earlier turns byte for byte", async () => {
		let searches = 0
		const fetchMock = vi.fn(
			v5Router({
				profile: () => profileBody(["Profile fact"]),
				search: () => searchBody([`Search fact ${++searches}`]),
			}),
		)
		vi.stubGlobal("fetch", fetchMock)
		const { client, create } = fakeChatClient((params) =>
			params.messages.at(-1)?.role === "user"
				? toolCall("call_1")
				: answer("done"),
		)
		const wrapped = withSupermemory(client, {
			namespace: "user-a",
			id: "conversation-a",
			mode: "full",
			addMemory: "never",
		})

		const history: ChatMessage[] = [
			{ role: "system", content: "Be helpful." },
			{ role: "user", content: "First question" },
		]
		await wrapped.chat.completions.create({ model: "m", messages: history })
		history.push(
			{
				role: "assistant",
				content: null,
				tool_calls: [
					{
						id: "call_1",
						type: "function",
						function: { name: "read_file", arguments: "{}" },
					},
				],
			},
			{ role: "tool", tool_call_id: "call_1", content: "file contents" },
		)
		await wrapped.chat.completions.create({ model: "m", messages: history })
		history.push(
			{ role: "assistant", content: "done" },
			{ role: "user", content: "Second question" },
		)
		await wrapped.chat.completions.create({ model: "m", messages: history })

		const bodies = create.mock.calls.map((call) =>
			JSON.stringify((call[0] as ChatParams).messages),
		)
		for (let index = 1; index < bodies.length; index++) {
			const previous = bodies[index - 1] as string
			expect(bodies[index]?.startsWith(previous.slice(0, -1))).toBe(true)
		}
		const paths = fetchMock.mock.calls.map((call) => requestPath(call[0]))
		expect(paths.filter((path) => path.endsWith("/profile"))).toHaveLength(1)
		expect(paths.filter((path) => path.endsWith("/search"))).toHaveLength(2)
		const last = (create.mock.calls[2]?.[0] as ChatParams).messages
		expect(String(last[0]?.content)).toContain("Profile fact")
		expect(String(last[1]?.content)).toContain("Search fact 1")
		expect(String(last[1]?.content)).not.toContain("Profile fact")
		expect(String(last[5]?.content)).toContain("Search fact 2")
		expect(String(last[5]?.content)).not.toContain("Profile fact")
	})

	it("retries a failed profile on the next turn without changing the earlier one", async () => {
		let profileCalls = 0
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: unknown) => {
				if (requestPath(input).endsWith("/profile") && ++profileCalls === 1) {
					return errorResponse(503)
				}
				return v5Router({ profile: () => profileBody(["Late profile"]) })(input)
			}),
		)
		const { client, create } = fakeChatClient(() => answer("ok"))
		const wrapped = withSupermemory(client, {
			namespace: "user-a",
			id: "conversation-a",
			mode: "profile",
			addMemory: "never",
		})

		const history: ChatMessage[] = [{ role: "user", content: "One" }]
		await wrapped.chat.completions.create({ model: "m", messages: history })
		history.push(
			{ role: "assistant", content: "ok" },
			{ role: "user", content: "Two" },
		)
		await wrapped.chat.completions.create({ model: "m", messages: history })

		const first = (create.mock.calls[0]?.[0] as ChatParams).messages
		const second = (create.mock.calls[1]?.[0] as ChatParams).messages
		expect(first).toEqual([{ role: "user", content: "One" }])
		expect(second[0]?.role).toBe("system")
		expect(String(second[0]?.content)).toContain("Late profile")
		expect(second.slice(1)).toEqual(history)
		expect(profileCalls).toBe(2)
	})

	it("never refetches a profile that was fetched, even when it was empty", async () => {
		const fetchMock = vi.fn(v5Router({ profile: () => profileBody() }))
		vi.stubGlobal("fetch", fetchMock)
		const { client } = fakeChatClient(() => answer("ok"))
		const wrapped = withSupermemory(client, {
			namespace: "user-a",
			id: "conversation-a",
			mode: "profile",
			addMemory: "never",
		})

		const history: ChatMessage[] = [{ role: "user", content: "One" }]
		await wrapped.chat.completions.create({ model: "m", messages: history })
		history.push(
			{ role: "assistant", content: "ok" },
			{ role: "user", content: "Two" },
		)
		await wrapped.chat.completions.create({ model: "m", messages: history })

		const profileCalls = fetchMock.mock.calls.filter((call) =>
			requestPath(call[0]).endsWith("/profile"),
		)
		expect(profileCalls).toHaveLength(1)
	})

	it("starts the model call without memories when recall exceeds its budget", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				(_input: unknown, init?: RequestInit) =>
					new Promise<Response>((_resolve, reject) => {
						init?.signal?.addEventListener("abort", () =>
							reject(new DOMException("aborted", "AbortError")),
						)
					}),
			),
		)
		const { client, create } = fakeChatClient(() => answer("ok"))
		const wrapped = withSupermemory(client, {
			namespace: "user-a",
			id: "conversation-a",
			mode: "full",
			addMemory: "never",
		})

		const started = performance.now()
		await wrapped.chat.completions.create({
			model: "m",
			messages: [{ role: "user", content: "Hello" }],
		})
		const elapsed = performance.now() - started

		expect(elapsed).toBeLessThan(4000)
		expect((create.mock.calls[0]?.[0] as ChatParams).messages).toEqual([
			{ role: "user", content: "Hello" },
		])
	})

	it("saves the turn once after the final answer and never uploads the system prompt", async () => {
		const fetchMock = vi.fn(v5Router({}))
		vi.stubGlobal("fetch", fetchMock)
		const { client } = fakeChatClient((params) =>
			params.messages.at(-1)?.role === "user"
				? toolCall("call_1")
				: answer("Final answer"),
		)
		const wrapped = withSupermemory(client, {
			namespace: "user-a",
			id: "conversation-a",
			mode: "profile",
		})

		const history: ChatMessage[] = [
			{ role: "system", content: "SECRET_SYSTEM_PROMPT" },
			{ role: "developer", content: "SECRET_DEVELOPER_PROMPT" },
			{ role: "user", content: "Fix the bug" },
		]
		await wrapped.chat.completions.create({ model: "m", messages: history })
		history.push(
			{
				role: "assistant",
				content: null,
				tool_calls: [
					{
						id: "call_1",
						type: "function",
						function: { name: "read_file", arguments: "{}" },
					},
				],
			},
			{ role: "tool", tool_call_id: "call_1", content: "file contents" },
		)
		await wrapped.chat.completions.create({ model: "m", messages: history })
		await vi.waitFor(() =>
			expect(
				fetchMock.mock.calls.filter((call) =>
					requestPath(call[0]).endsWith("/document"),
				),
			).toHaveLength(1),
		)

		const upload = fetchMock.mock.calls.find((call) =>
			requestPath(call[0]).endsWith("/document"),
		)
		const content = String(requestJson(upload?.[1] as RequestInit).content)
		expect(content).toContain("Fix the bug")
		expect(content).toContain("Final answer")
		expect(content).not.toContain("SECRET_SYSTEM_PROMPT")
		expect(content).not.toContain("SECRET_DEVELOPER_PROMPT")
	})
})
