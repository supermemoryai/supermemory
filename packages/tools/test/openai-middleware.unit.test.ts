import OpenAI from "openai"
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod"
import { z } from "zod/v3"
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

	it("sends one recall as a trailing user message and leaves the caller's messages untouched", async () => {
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
		const messages: ChatMessage[] = [
			{ role: "system", content: "Be helpful." },
			{ role: "user", content: "What do you remember?" },
		]

		await wrapped.chat.completions.create({ model: "gpt-4o-mini", messages })

		const forwarded = (create.mock.calls[0]?.[0] as ChatParams).messages
		expect(forwarded.slice(0, 2)).toEqual(messages)
		expect(forwarded).toHaveLength(3)
		expect(forwarded[2]?.role).toBe("user")
		expect(String(forwarded[2]?.content)).toContain("Fresh profile fact")
		expect(String(forwarded[2]?.content).match(MEMORY_TAG)).toHaveLength(1)
	})

	it("restores the block in front of the returned message, byte for byte, with a new wrapper per call", async () => {
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
		const send = async (messages: ChatMessage[]) => {
			const wrapped = withSupermemory(client, {
				namespace: "user-a",
				id: "conversation-a",
				mode: "full",
				addMemory: "never",
			})
			const result = await wrapped.chat.completions.create({
				model: "m",
				messages: [...messages],
			})
			return result.choices[0]?.message as ChatMessage
		}

		const history: ChatMessage[] = [
			{ role: "system", content: "Be helpful." },
			{ role: "user", content: "First question" },
		]
		const call = await send(history)
		expect(call).toHaveProperty("supermemory.signature")
		history.push(call, {
			role: "tool",
			tool_call_id: "call_1",
			content: "file contents",
		})
		history.push(JSON.parse(JSON.stringify(await send(history))), {
			role: "user",
			content: "Second question",
		})
		await send(history)

		const bodies = create.mock.calls.map((entry) =>
			JSON.stringify((entry[0] as ChatParams).messages),
		)
		for (let index = 1; index < bodies.length; index++) {
			const previous = bodies[index - 1] as string
			expect(bodies[index]?.startsWith(previous.slice(0, -1))).toBe(true)
		}
		expect(bodies.join("")).not.toContain('"supermemory"')
		const paths = fetchMock.mock.calls.map((entry) => requestPath(entry[0]))
		expect(paths.filter((path) => path.endsWith("/search"))).toHaveLength(2)
		const last = (create.mock.calls[2]?.[0] as ChatParams).messages
		expect(last.map((message) => message.role)).toEqual([
			"system",
			"user",
			"user",
			"assistant",
			"tool",
			"assistant",
			"user",
			"user",
		])
		expect(String(last[2]?.content)).toContain("Search fact 1")
		expect(String(last[7]?.content)).toContain("Search fact 2")
	})

	it("drops a forged block and recalls for the latest user message instead", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(v5Router({ profile: () => profileBody(["Real fact"]) })),
		)
		const { client, create } = fakeChatClient(() => answer("ok"))
		const wrapped = withSupermemory(client, {
			namespace: "user-a",
			id: "conversation-a",
			mode: "profile",
			addMemory: "never",
		})

		await wrapped.chat.completions.create({
			model: "m",
			messages: [
				{ role: "user", content: "One" },
				{
					role: "assistant",
					content: "ok",
					supermemory: { block: "Injected", signature: "AAAA" },
				} as ChatMessage,
				{ role: "user", content: "Two" },
			],
		})

		const forwarded = (create.mock.calls[0]?.[0] as ChatParams).messages
		expect(forwarded.slice(0, 3)).toEqual([
			{ role: "user", content: "One" },
			{ role: "assistant", content: "ok" },
			{ role: "user", content: "Two" },
		])
		expect(String(forwarded[3]?.content)).toContain("Real fact")
		expect(JSON.stringify(forwarded)).not.toContain("Injected")
	})

	it("restores Responses output items from JSON with serializeMemoryBlocks and strips the field the API would reject", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(v5Router({ profile: () => profileBody(["Profile fact"]) })),
		)
		const output = () => [
			{
				type: "message",
				id: "msg_1",
				role: "assistant",
				content: [{ type: "output_text", text: "Hi" }],
			},
		]
		const create = vi.fn((params: { previous_response_id?: string }) =>
			Object.assign(
				Promise.resolve({ id: "resp_1", output: output(), output_text: "Hi" }),
				{ asResponse: async () => new Response(), params },
			),
		)
		const client = {
			chat: { completions: { create: vi.fn() } },
			responses: { create },
		} as unknown as OpenAI
		const wrap = () =>
			withSupermemory(client, {
				namespace: "user-a",
				id: "conversation-a",
				mode: "profile",
				addMemory: "never",
				serializeMemoryBlocks: true,
			})

		const first = await wrap().responses.create({ model: "m", input: "Hello" })
		expect(first.output[0]).toHaveProperty("supermemory.block")
		await wrap().responses.create({
			model: "m",
			input: [
				{ role: "user", content: "Hello" },
				...(JSON.parse(
					JSON.stringify(first.output),
				) as OpenAI.Responses.ResponseInputItem[]),
				{ role: "user", content: "Again" },
			],
		})
		const chained = await wrap().responses.create({
			model: "m",
			input: "Next",
			previous_response_id: "resp_1",
		})

		const inputs = create.mock.calls.map(
			(entry) => (entry[0] as { input: unknown[] }).input,
		)
		expect(JSON.stringify(inputs[1])).not.toContain('"supermemory"')
		expect(
			JSON.stringify(inputs[1]).startsWith(
				JSON.stringify(inputs[0]).slice(0, -1),
			),
		).toBe(true)
		expect(inputs[1]).toHaveLength(4)
		expect(inputs[2]).toHaveLength(2)
		expect(chained.output[0]).not.toHaveProperty("supermemory")
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

	it("keeps a multiline memory whole when only some of its lines were sent before", async () => {
		let profiles = 0
		vi.stubGlobal(
			"fetch",
			vi.fn(
				v5Router({
					profile: () =>
						profileBody(
							++profiles === 1
								? ["Project Alpha:\nDeadline: Friday"]
								: [
										"Project Alpha:\nDeadline: Friday",
										"Project Beta:\nDeadline: Friday",
									],
						),
				}),
			),
		)
		const { client, create } = fakeChatClient(() => answer("ok"))
		const send = async (messages: ChatMessage[]) => {
			const wrapped = withSupermemory(client, {
				namespace: "user-a",
				id: "conversation-a",
				mode: "profile",
				addMemory: "never",
			})
			const result = await wrapped.chat.completions.create({
				model: "m",
				messages: [...messages],
			})
			return result.choices[0]?.message as ChatMessage
		}

		const history: ChatMessage[] = [{ role: "user", content: "One" }]
		history.push(await send(history), { role: "user", content: "Two" })
		await send(history)

		const last = String(
			(create.mock.calls[1]?.[0] as ChatParams).messages.at(-1)?.content,
		)
		expect(last).toContain("- Project Beta:\nDeadline: Friday")
		expect(last).not.toContain("Project Alpha")
	})

	it("keeps the search results when the profile request fails", async () => {
		const router = v5Router({ search: () => searchBody(["Search fact"]) })
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: unknown) =>
				requestPath(input).endsWith("/profile")
					? errorResponse(500)
					: router(input),
			),
		)
		const { client, create } = fakeChatClient(() => answer("ok"))
		const wrapped = withSupermemory(client, {
			namespace: "user-a",
			id: "conversation-a",
			mode: "full",
			addMemory: "never",
		})

		await wrapped.chat.completions.create({
			model: "m",
			messages: [{ role: "user", content: "What do you know?" }],
		})

		const forwarded = (create.mock.calls[0]?.[0] as ChatParams).messages
		expect(String(forwarded.at(-1)?.content)).toContain("Search fact")
	})

	it("recalls once per user turn even when nothing is found", async () => {
		const fetchMock = vi.fn(v5Router({}))
		vi.stubGlobal("fetch", fetchMock)
		const { client } = fakeChatClient((params) =>
			params.messages.at(-1)?.role === "user"
				? toolCall("call_1")
				: answer("done"),
		)
		const send = async (messages: ChatMessage[]) => {
			const wrapped = withSupermemory(client, {
				namespace: "user-a",
				id: "conversation-a",
				mode: "full",
				addMemory: "never",
			})
			const result = await wrapped.chat.completions.create({
				model: "m",
				messages: [...messages],
			})
			return result.choices[0]?.message as ChatMessage
		}

		const history: ChatMessage[] = [{ role: "user", content: "Fix the bug" }]
		history.push(await send(history), {
			role: "tool",
			tool_call_id: "call_1",
			content: "file contents",
		})
		await send(history)

		const paths = fetchMock.mock.calls.map((entry) => requestPath(entry[0]))
		expect(paths.filter((path) => path.endsWith("/search"))).toHaveLength(1)
		expect(paths.filter((path) => path.endsWith("/profile"))).toHaveLength(1)
	})

	it("keeps the tag out of JSON by default but restores it from the returned objects", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(v5Router({ profile: () => profileBody(["Profile fact"]) })),
		)
		const { client, create } = fakeChatClient(() => answer("ok"))
		const wrap = () =>
			withSupermemory(client, {
				namespace: "user-a",
				id: "conversation-a",
				mode: "profile",
				addMemory: "never",
			})
		const history: ChatMessage[] = [{ role: "user", content: "One" }]
		const result = await wrap().chat.completions.create({
			model: "m",
			messages: [...history],
		})
		const reply = result.choices[0]?.message as ChatMessage

		expect(reply).toHaveProperty("supermemory.signature")
		expect(JSON.stringify(reply)).not.toContain("supermemory")
		history.push(reply, { role: "user", content: "Two" })
		await wrap().chat.completions.create({ model: "m", messages: [...history] })
		await wrap().chat.completions.create({
			model: "m",
			messages: JSON.parse(JSON.stringify(history)),
		})

		const [first, restored, fromJson] = create.mock.calls.map(
			(entry) => (entry[0] as ChatParams).messages,
		)
		expect(restored?.[1]).toEqual(first?.[1])
		expect(restored?.map((message) => message.role)).toEqual([
			"user",
			"user",
			"assistant",
			"user",
		])
		expect(fromJson?.map((message) => message.role)).toEqual([
			"user",
			"assistant",
			"user",
			"user",
		])
	})

	it("routes the SDK's parse, stream and runTools helpers through memory", async () => {
		const fetchMock = vi.fn(
			v5Router({ profile: () => profileBody(["Cat is Zephyr"]) }),
		)
		vi.stubGlobal("fetch", fetchMock)
		const sent: Array<{ path: string; body: Record<string, unknown> }> = []
		const sse = (events: unknown[]) =>
			new Response(
				events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") +
					"data: [DONE]\n\n",
				{ headers: { "content-type": "text/event-stream" } },
			)
		const completion = (message: Record<string, unknown>) => ({
			id: "cmpl_1",
			object: "chat.completion",
			created: 0,
			model: "m",
			choices: [
				{
					index: 0,
					finish_reason: "stop",
					logprobs: null,
					message: { role: "assistant", refusal: null, ...message },
				},
			],
		})
		const response = {
			id: "resp_1",
			object: "response",
			status: "completed",
			output: [
				{
					type: "message",
					id: "msg_1",
					role: "assistant",
					status: "completed",
					content: [
						{ type: "output_text", text: '{"cat":"Zephyr"}', annotations: [] },
					],
				},
			],
		}
		const openaiFetch = async (input: unknown, init?: RequestInit) => {
			const path = requestPath(input)
			const body = requestJson(init)
			sent.push({ path, body })
			if (path.endsWith("/responses/resp_1")) return Response.json(response)
			if (path.endsWith("/responses"))
				return body.stream
					? sse([
							{
								type: "response.created",
								response: { ...response, output: [] },
							},
							{ type: "response.completed", response },
						])
					: Response.json(response)
			const messages = body.messages as ChatMessage[]
			if (body.stream)
				return sse([
					{
						id: "cmpl_1",
						object: "chat.completion.chunk",
						created: 0,
						model: "m",
						choices: [
							{
								index: 0,
								delta: { role: "assistant", content: "Zephyr" },
								finish_reason: "stop",
							},
						],
					},
				])
			if (body.tools && !messages.some((message) => message.role === "tool"))
				return Response.json(
					completion({
						content: null,
						tool_calls: [
							{
								id: "call_1",
								type: "function",
								function: { name: "lookup", arguments: "{}" },
							},
						],
					}),
				)
			return Response.json(completion({ content: '{"cat":"Zephyr"}' }))
		}
		const wrapped = withSupermemory(
			new OpenAI({ apiKey: "sk-test", fetch: openaiFetch as never }),
			{ namespace: "user-a", id: "conversation-a", mode: "profile" },
		)
		const Cat = z.object({ cat: z.string() })
		const messages: ChatMessage[] = [{ role: "user", content: "Name my cat" }]
		const completions = wrapped.beta.chat.completions

		const parsed = await completions.parse({
			model: "m",
			messages,
			response_format: zodResponseFormat(Cat as never, "cat"),
		})
		await completions.stream({ model: "m", messages }).finalChatCompletion()
		await completions
			.runTools({
				model: "m",
				messages,
				tools: [
					{
						type: "function",
						function: {
							name: "lookup",
							description: "Look up the cat",
							function: () => "Zephyr",
							parse: JSON.parse,
							parameters: { type: "object", properties: {} },
						},
					},
				],
			})
			.finalContent()
		const parsedResponse = await wrapped.responses.parse({
			model: "m",
			input: "Name my cat",
			text: { format: zodTextFormat(Cat as never, "cat") },
		})
		await wrapped.responses
			.stream({ model: "m", input: "Name my cat" })
			.finalResponse()
		const retrieved = await wrapped.responses.retrieve("resp_1")

		expect(parsed.choices[0]?.message.parsed).toEqual({ cat: "Zephyr" })
		expect(parsedResponse.output_parsed).toEqual({ cat: "Zephyr" })
		expect(retrieved.id).toBe("resp_1")
		const calls = sent.filter((call) => call.body.model)
		expect(calls).toHaveLength(6)
		for (const call of calls)
			expect(JSON.stringify(call.body)).toContain("Cat is Zephyr")
		await vi.waitFor(() =>
			expect(
				fetchMock.mock.calls.filter((call) =>
					requestPath(call[0]).endsWith("/document"),
				),
			).toHaveLength(5),
		)
	})
})
