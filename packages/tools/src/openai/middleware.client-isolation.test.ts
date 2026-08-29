import OpenAI from "openai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { withSupermemory } from "./index"

const MEMORY_BASE_URL = "https://memory.test"

type CapturedCall = {
	params: unknown
	requestOptions: unknown
	receiver: unknown
}

function createBaseClient() {
	const client = new OpenAI({ apiKey: "openai-test-key" })
	const chatCalls: CapturedCall[] = []
	const responseCalls: CapturedCall[] = []

	const chatCreate = function (
		this: unknown,
		params: unknown,
		requestOptions?: unknown,
	) {
		chatCalls.push({ params, receiver: this, requestOptions })
		return Promise.resolve({ choices: [], id: "chat-response" })
	}
	const responsesCreate = function (
		this: unknown,
		params: unknown,
		requestOptions?: unknown,
	) {
		responseCalls.push({ params, receiver: this, requestOptions })
		return Promise.resolve({ id: "responses-response", output: [] })
	}

	Object.defineProperty(client.chat.completions, "create", {
		configurable: true,
		value: chatCreate,
		writable: true,
	})
	Object.defineProperty(client.responses, "create", {
		configurable: true,
		value: responsesCreate,
		writable: true,
	})

	return {
		chatCalls,
		chatCreate,
		client,
		responseCalls,
		responsesCreate,
	}
}

function wrapClient(
	client: OpenAI,
	containerTag: string,
	customId = containerTag,
	addMemory: "always" | "never" = "never",
) {
	return withSupermemory(client, {
		addMemory,
		baseUrl: MEMORY_BASE_URL,
		containerTag,
		customId,
		mode: "profile",
	})
}

function systemContent(call: CapturedCall) {
	const params =
		call.params as OpenAI.Chat.Completions.ChatCompletionCreateParams
	const systemMessage = params.messages.find(
		(message) => message.role === "system",
	)
	return typeof systemMessage?.content === "string" ? systemMessage.content : ""
}

function callAt(calls: CapturedCall[], index: number) {
	const call = calls[index]
	if (!call) throw new Error(`Expected captured call at index ${index}`)
	return call
}

describe("OpenAI middleware client isolation", () => {
	const originalApiKey = process.env.SUPERMEMORY_API_KEY
	let profileTags: string[]
	let conversations: Array<{
		containerTags?: string[]
		conversationId?: string
	}>

	beforeEach(() => {
		process.env.SUPERMEMORY_API_KEY = "supermemory-test-key"
		profileTags = []
		conversations = []

		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: unknown, init?: RequestInit) => {
				const url = String(input)
				const body = init?.body ? JSON.parse(String(init.body)) : {}

				if (url === `${MEMORY_BASE_URL}/v4/profile`) {
					const containerTag = String(body.containerTag)
					profileTags.push(containerTag)
					return Response.json({
						profile: {
							dynamic: [],
							static: [{ memory: `secret-${containerTag}` }],
						},
						searchResults: { results: [] },
					})
				}

				if (url === `${MEMORY_BASE_URL}/v4/conversations`) {
					conversations.push(body)
					return Response.json({
						conversationId: body.conversationId,
						id: "memory-id",
						status: "queued",
					})
				}

				throw new Error(`Unexpected fetch: ${url}`)
			}),
		)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		if (originalApiKey === undefined) {
			delete process.env.SUPERMEMORY_API_KEY
		} else {
			process.env.SUPERMEMORY_API_KEY = originalApiKey
		}
	})

	it("leaves prototype-provided SDK create methods on the base client", () => {
		const client = new OpenAI({ apiKey: "openai-test-key" })
		const chatCreate = client.chat.completions.create
		const responsesCreate = client.responses.create

		expect(Object.hasOwn(client.chat.completions, "create")).toBe(false)
		expect(Object.hasOwn(client.responses, "create")).toBe(false)

		const wrapped = wrapClient(client, "tenant-a")

		expect(Object.hasOwn(client.chat.completions, "create")).toBe(false)
		expect(Object.hasOwn(client.responses, "create")).toBe(false)
		expect(client.chat.completions.create).toBe(chatCreate)
		expect(client.responses.create).toBe(responsesCreate)
		expect(Object.hasOwn(wrapped.chat.completions, "create")).toBe(true)
		expect(Object.hasOwn(wrapped.responses, "create")).toBe(true)
	})

	it("wraps a frozen SDK client without mutating its resources", async () => {
		const { chatCalls, chatCreate, client, responseCalls, responsesCreate } =
			createBaseClient()

		Object.freeze(client.chat.completions)
		Object.freeze(client.chat)
		Object.freeze(client.responses)
		Object.freeze(client)
		const chatDescriptor = Object.getOwnPropertyDescriptor(
			client.chat.completions,
			"create",
		)
		const responsesDescriptor = Object.getOwnPropertyDescriptor(
			client.responses,
			"create",
		)

		const wrapped = wrapClient(client, "tenant-a")
		const requestOptions = { timeout: 321 }

		expect(wrapped).not.toBe(client)
		expect(wrapped).toBeInstanceOf(OpenAI)
		expect(wrapped.chat).not.toBe(client.chat)
		expect(wrapped.chat.completions).not.toBe(client.chat.completions)
		expect(wrapped.responses).not.toBe(client.responses)
		expect(wrapped.files).toBe(client.files)
		expect(
			Object.getOwnPropertyDescriptor(client.chat.completions, "create"),
		).toEqual(chatDescriptor)
		expect(Object.getOwnPropertyDescriptor(client.responses, "create")).toEqual(
			responsesDescriptor,
		)
		expect(client.chat.completions.create).toBe(chatCreate)
		expect(client.responses.create).toBe(responsesCreate)

		await wrapped.chat.completions.create(
			{
				messages: [{ content: "hello", role: "user" }],
				model: "gpt-4o-mini",
			},
			requestOptions,
		)
		await wrapped.responses.create(
			{ input: "hello", model: "gpt-4o-mini" },
			requestOptions,
		)

		expect(chatCalls[0]?.receiver).toBe(client.chat.completions)
		expect(chatCalls[0]?.requestOptions).toBe(requestOptions)
		expect(responseCalls[0]?.receiver).toBe(client.responses)
		expect(responseCalls[0]?.requestOptions).toBe(requestOptions)
	})

	it("isolates Chat and Responses memory lookup across wrappers and rewraps", async () => {
		const { chatCalls, chatCreate, client, responseCalls, responsesCreate } =
			createBaseClient()
		const tenantA = wrapClient(client, "tenant-a")
		const tenantB = wrapClient(client, "tenant-b")

		expect(tenantA).not.toBe(tenantB)
		expect(client.chat.completions.create).toBe(chatCreate)
		expect(client.responses.create).toBe(responsesCreate)

		await tenantB.chat.completions.create({
			messages: [{ content: "hello", role: "user" }],
			model: "gpt-4o-mini",
		})
		await tenantA.chat.completions.create({
			messages: [{ content: "hello", role: "user" }],
			model: "gpt-4o-mini",
		})
		await tenantB.responses.create({
			input: "hello",
			model: "gpt-4o-mini",
		})

		expect(profileTags).toEqual(["tenant-b", "tenant-a", "tenant-b"])
		const tenantBChat = systemContent(callAt(chatCalls, 0))
		const tenantAChat = systemContent(callAt(chatCalls, 1))
		expect(tenantBChat).toContain("secret-tenant-b")
		expect(tenantBChat).not.toContain("secret-tenant-a")
		expect(tenantAChat).toContain("secret-tenant-a")
		expect(tenantAChat).not.toContain("secret-tenant-b")
		expect(
			(responseCalls[0]?.params as { instructions?: string }).instructions,
		).toContain("secret-tenant-b")

		const tenantC = wrapClient(tenantA, "tenant-c")
		await tenantC.chat.completions.create({
			messages: [{ content: "hello", role: "user" }],
			model: "gpt-4o-mini",
		})
		await tenantA.chat.completions.create({
			messages: [{ content: "hello", role: "user" }],
			model: "gpt-4o-mini",
		})

		expect(profileTags.slice(-2)).toEqual(["tenant-c", "tenant-a"])
		const tenantCChat = systemContent(callAt(chatCalls, 2))
		expect(tenantCChat).toContain("secret-tenant-c")
		expect(tenantCChat).not.toContain("secret-tenant-a")
		expect(systemContent(callAt(chatCalls, 3))).toContain("secret-tenant-a")
	})

	it("saves a shared client's conversation only for the selected wrapper", async () => {
		const { client } = createBaseClient()
		wrapClient(client, "tenant-a", "thread-a", "always")
		const tenantB = wrapClient(client, "tenant-b", "thread-b", "always")

		await tenantB.chat.completions.create({
			messages: [{ content: "private tenant B message", role: "user" }],
			model: "gpt-4o-mini",
		})

		expect(profileTags).toEqual(["tenant-b"])
		expect(conversations).toEqual([
			expect.objectContaining({
				containerTags: ["tenant-b"],
				conversationId: "thread-b",
			}),
		])
	})

	it("unwraps a facade created by another middleware module instance", async () => {
		const firstModule = await import("./middleware")
		vi.resetModules()
		const secondModule = await import("./middleware")
		const { chatCalls, client } = createBaseClient()
		const options = {
			addMemory: "never" as const,
			baseUrl: MEMORY_BASE_URL,
			containerTag: "provided-separately",
			customId: "thread",
			mode: "profile" as const,
		}

		expect(firstModule.createOpenAIMiddleware).not.toBe(
			secondModule.createOpenAIMiddleware,
		)
		const tenantA = firstModule.createOpenAIMiddleware(
			client,
			"tenant-a",
			options,
		)
		const tenantB = secondModule.createOpenAIMiddleware(
			tenantA,
			"tenant-b",
			options,
		)

		await tenantB.chat.completions.create({
			messages: [{ content: "hello", role: "user" }],
			model: "gpt-4o-mini",
		})

		expect(profileTags).toEqual(["tenant-b"])
		const content = systemContent(callAt(chatCalls, 0))
		expect(content).toContain("secret-tenant-b")
		expect(content).not.toContain("secret-tenant-a")
	})
})
