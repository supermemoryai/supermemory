import { LRUCache } from "lru-cache"
import type OpenAI from "openai"
import { APIPromise } from "openai/core"
import type { Supermemory } from "supermemory"
import {
	addConversation,
	type ContentPart as ConversationContentPart,
	type ConversationMessage,
	toConversationImageUrl,
} from "../conversations-client"
import {
	TurnMemory,
	buildTurnRecall,
	createSupermemoryClient,
	replaceMemoryContext,
	stripMemoryContext,
	turnKey,
	turnKeys,
	withTurnMemory,
	wrapMemoryContext,
} from "../shared"
import { createLogger, type Logger } from "../vercel/logger"

// Keep canonicalization stable across duplicate package copies and hot reloads.
const BASE_CLIENT_SYMBOL = Symbol.for("@supermemory/tools/openai/base-client")
const baseClientByWrapper = new WeakMap<OpenAI, OpenAI>()

const getBaseClient = (client: OpenAI) =>
	(Reflect.get(client, BASE_CLIENT_SYMBOL) as OpenAI | undefined) ??
	baseClientByWrapper.get(client) ??
	client

const cloneWithOverrides = <T extends object>(
	source: T,
	overrides: Partial<T>,
): T => {
	const descriptors = Object.getOwnPropertyDescriptors(source)

	for (const key of Reflect.ownKeys(overrides) as Array<keyof T>) {
		const current = Object.getOwnPropertyDescriptor(source, key)
		Reflect.set(descriptors, key, {
			configurable: current?.configurable ?? true,
			enumerable: current?.enumerable ?? false,
			value: overrides[key],
			writable: current && "writable" in current ? current.writable : true,
		})
	}

	return Object.create(Object.getPrototypeOf(source), descriptors) as T
}

const normalizeBaseUrl = (url?: string): string => {
	const defaultUrl = "https://api.supermemory.ai"
	return url?.trim().replace(/\/+$/, "") || defaultUrl
}

type AfterResponse<T> = (value: T) => T

type ResponsesTurn = { conversation: ConversationMessage[]; userText: string }

const deferAPIPromise = <T>(
	start: () => Promise<{
		request: APIPromise<T>
		afterResponse?: AfterResponse<T>
	}>,
): APIPromise<T> => {
	const ready = start()

	const responsePromise = ready.then(async ({ request }) => ({
		response: await request.asResponse(),
		options: {} as never,
		controller: new AbortController(),
	}))

	return new APIPromise<T>(responsePromise, async () => {
		const { request, afterResponse } = await ready
		const value = await request
		return (afterResponse ? afterResponse(value) : value) as typeof value
	})
}

type StreamLike = AsyncIterable<unknown> & { controller?: AbortController }

// Rebuilt with the caller's own Stream class so tee() and toReadableStream() keep working.
const observeStream = <T>(
	value: T,
	onChunk: (chunk: unknown) => void,
	onDone: () => void,
): T => {
	const stream = value as unknown as StreamLike
	if (
		typeof stream?.[Symbol.asyncIterator] !== "function" ||
		!stream.controller
	) {
		return value
	}
	const StreamClass = stream.constructor as new (
		iterator: () => AsyncIterator<unknown>,
		controller: AbortController,
	) => T
	async function* iterate() {
		for await (const chunk of stream) {
			onChunk(chunk)
			yield chunk
		}
		onDone()
	}
	return new StreamClass(() => iterate(), stream.controller)
}

export interface OpenAIMiddlewareOptions {
	/** Namespace for memory search (e.g., user ID, project ID). Required. */
	namespace: string
	/** ID that groups messages into a single document. Required. */
	id: string
	/** Enable detailed logging of memory search and injection (default: false). */
	verbose?: boolean
	/**
	 * Memory retrieval mode (default: "profile"):
	 * - "profile": The user profile, fetched once per conversation, in the system message or `instructions`
	 * - "query": Search results for each user message, appended to that message
	 * - "full": Both: the profile once in the system message or `instructions`, plus per-message search results
	 */
	mode?: "profile" | "query" | "full"
	/**
	 * Memory persistence mode (default: "always"):
	 * - "always": Save each finished turn to Supermemory in the background
	 * - "never": Only retrieve memories, don't store new ones
	 */
	addMemory?: "always" | "never"
	/** Supermemory API key (falls back to SUPERMEMORY_API_KEY). */
	apiKey?: string
	/** Custom Supermemory API base URL (default: "https://api.supermemory.ai"). */
	baseUrl?: string
}

const extractTextContent = (content: unknown): string => {
	if (typeof content === "string") return content.trim()
	if (!Array.isArray(content)) return ""

	return content
		.flatMap((part) => {
			if (!part || typeof part !== "object") return []
			const { type, text } = part as { type?: unknown; text?: unknown }
			if (
				(type === "text" || type === "input_text" || type === "output_text") &&
				typeof text === "string" &&
				text.trim()
			) {
				return [text.trim()]
			}
			return []
		})
		.join("\n")
}

const convertConversationContent = (
	content: unknown,
): string | ConversationContentPart[] => {
	if (typeof content === "string") return stripMemoryContext(content)
	if (!Array.isArray(content)) return ""

	const converted: ConversationContentPart[] = []
	for (const value of content) {
		if (!value || typeof value !== "object") continue
		const part = value as {
			type?: unknown
			text?: unknown
			image_url?: { url?: unknown }
		}
		if (part.type === "text" && typeof part.text === "string") {
			const text = stripMemoryContext(part.text)
			if (text) converted.push({ type: "text", text })
		} else if (
			part.type === "image_url" &&
			typeof part.image_url?.url === "string"
		) {
			converted.push({
				type: "image_url",
				imageUrl: { url: part.image_url.url },
			})
		}
	}

	return converted
}

// System and developer messages are the caller's own prompt, never user memory.
const convertChatConversationMessages = (
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): ConversationMessage[] => {
	return messages
		.filter(
			(message) => message.role !== "system" && message.role !== "developer",
		)
		.map((message) => ({
			role: message.role === "function" ? "tool" : message.role,
			content: convertConversationContent(message.content),
			...("name" in message && message.name && { name: message.name }),
			...("tool_calls" in message &&
				message.tool_calls && { tool_calls: message.tool_calls }),
			...("tool_call_id" in message &&
				message.tool_call_id && { tool_call_id: message.tool_call_id }),
		})) as ConversationMessage[]
}

const convertResponsesConversationMessages = (
	input: unknown,
): ConversationMessage[] => {
	if (typeof input === "string") {
		const content = stripMemoryContext(input)
		return content.trim() ? [{ role: "user", content }] : []
	}
	if (!Array.isArray(input)) return []

	const messages: ConversationMessage[] = []
	for (const item of input) {
		if (!item || typeof item !== "object") continue
		const structuredItem = item as {
			type?: unknown
			call_id?: unknown
			name?: unknown
			arguments?: unknown
			output?: unknown
		}
		if (
			structuredItem.type === "function_call" &&
			typeof structuredItem.call_id === "string" &&
			typeof structuredItem.name === "string" &&
			typeof structuredItem.arguments === "string"
		) {
			messages.push({
				role: "assistant",
				content: "",
				tool_calls: [
					{
						id: structuredItem.call_id,
						type: "function",
						function: {
							name: structuredItem.name,
							arguments: structuredItem.arguments,
						},
					},
				],
			})
			continue
		}
		if (
			structuredItem.type === "function_call_output" &&
			typeof structuredItem.call_id === "string" &&
			typeof structuredItem.output === "string"
		) {
			messages.push({
				role: "tool",
				content: structuredItem.output,
				tool_call_id: structuredItem.call_id,
			})
			continue
		}

		const message = item as { role?: unknown; content?: unknown }
		if (message.role !== "user" && message.role !== "assistant") continue

		const role = message.role
		if (typeof message.content === "string") {
			const content = stripMemoryContext(message.content)
			if (content.trim()) messages.push({ role, content })
			continue
		}
		if (!Array.isArray(message.content)) continue

		const content: ConversationContentPart[] = []
		for (const part of message.content) {
			if (!part || typeof part !== "object") continue
			const value = part as {
				type?: unknown
				text?: unknown
				image_url?: unknown
			}
			if (
				(value.type === "text" ||
					value.type === "input_text" ||
					value.type === "output_text") &&
				typeof value.text === "string"
			) {
				const text = stripMemoryContext(value.text)
				if (text) content.push({ type: "text", text })
			} else if (value.type === "input_image") {
				const url = toConversationImageUrl(value.image_url)
				if (url) content.push({ type: "image_url", imageUrl: { url } })
			}
		}

		if (content.length > 0) messages.push({ role, content })
	}

	return messages
}

const hasPersistableUserConversationMessage = (
	messages: ConversationMessage[],
): boolean => {
	return messages.some(
		(message) =>
			message.role === "user" &&
			(typeof message.content === "string"
				? Boolean(message.content.trim())
				: message.content.length > 0),
	)
}

type ResponsesInputItem = { role?: unknown; type?: unknown; content?: unknown }

const isResponsesUserMessage = (item: unknown): item is ResponsesInputItem =>
	!!item &&
	typeof item === "object" &&
	(item as ResponsesInputItem).role === "user" &&
	((item as ResponsesInputItem).type ?? "message") === "message"

const extractResponsesOutputText = (response: {
	output_text?: unknown
	output?: unknown
}): string => {
	if (typeof response.output_text === "string") return response.output_text
	if (!Array.isArray(response.output)) return ""
	return response.output
		.flatMap((item: { type?: unknown; content?: unknown }) =>
			item?.type === "message" && Array.isArray(item.content)
				? item.content.flatMap((part: { type?: unknown; text?: unknown }) =>
						part?.type === "output_text" && typeof part.text === "string"
							? [part.text]
							: [],
					)
				: [],
		)
		.join("")
}

const hasResponsesFunctionCall = (output: unknown): boolean =>
	Array.isArray(output) &&
	output.some(
		(item: { type?: unknown }) =>
			item?.type === "function_call" || item?.type === "custom_tool_call",
	)

// With a conversation id and messages, saves the whole conversation as one document.
const addMemoryTool = async (
	client: Supermemory,
	namespace: string,
	content: string,
	id: string | undefined,
	logger: Logger,
	conversationMessages?: ConversationMessage[],
	apiKey?: string,
	baseUrl?: string,
): Promise<void> => {
	try {
		if (id && conversationMessages && apiKey) {
			const conversationDocumentId = id.replace("conversation:", "")

			const response = await addConversation({
				id: conversationDocumentId,
				messages: conversationMessages,
				namespace,
				apiKey,
				baseUrl,
				source: "tools-openai",
			})

			logger.info("Conversation saved successfully", {
				namespace,
				id,
				messageCount: conversationMessages.length,
				responseId: response.id,
			})
			return
		}

		const response = await client.add(namespace, {
			content,
			...(id && { id }),
		})

		logger.info("Memory saved successfully", {
			namespace,
			id,
			contentLength: content.length,
			memoryId: response.id,
		})
	} catch (error) {
		logger.error("Error saving memory", {
			error: error instanceof Error ? error.message : "Unknown error",
		})
	}
}

/**
 * Creates SuperMemory middleware for OpenAI clients.
 *
 * Puts the frozen profile in the system message (Chat Completions) or `instructions` (Responses)
 * and appends search results to the user turn they were retrieved for, replaying earlier turns'
 * blocks unchanged so the prompt prefix stays cacheable; saves each finished turn in the background.
 *
 * @param openaiClient - The OpenAI client to wrap
 * @param namespace - The namespace for memory search (e.g., user ID, project ID)
 * @param options - Optional configuration options for the middleware
 * @param options.id - Conversation ID; one wrapper should serve one conversation
 * @param options.verbose - Enable detailed logging of memory operations (default: false)
 * @param options.mode - Memory search mode: "profile" (all memories), "query" (search-based), or "full" (both) (default: "profile")
 * @param options.addMemory - Automatic memory storage mode: "always" or "never" (default: "always")
 * @param options.apiKey - Supermemory API key (falls back to SUPERMEMORY_API_KEY)
 * @param options.baseUrl - Custom Supermemory API base URL (default: "https://api.supermemory.ai")
 * @returns The wrapped client
 * @throws {Error} When neither options.apiKey nor SUPERMEMORY_API_KEY is set
 *
 * @example
 * ```typescript
 * const openaiWithSupermemory = createOpenAIMiddleware(openai, "user-123", {
 *   id: "conversation-456",
 *   mode: "full",
 *   addMemory: "always",
 *   verbose: true
 * })
 *
 * ```
 */
export function createOpenAIMiddleware(
	openaiClient: OpenAI,
	namespace: string,
	options?: OpenAIMiddlewareOptions,
) {
	const baseClient = getBaseClient(openaiClient)
	const baseChat = baseClient.chat
	const baseCompletions = baseChat.completions
	const baseResponses = baseClient.responses

	const logger = createLogger(options?.verbose ?? false)
	const apiKey =
		options?.apiKey?.trim() || process.env.SUPERMEMORY_API_KEY?.trim() || ""
	if (!apiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY is not set — provide it via options.apiKey or set the environment variable",
		)
	}
	const baseUrl = normalizeBaseUrl(options?.baseUrl)
	const client = createSupermemoryClient({
		apiKey,
		baseUrl,
		source: "tools-openai",
	})

	const id = options?.id
	const mode = options?.mode ?? "profile"
	const addMemory = options?.addMemory ?? "always"
	const documentId = id ? `conversation:${id}` : undefined

	const originalCreate = baseCompletions.create
	const originalResponsesCreate = baseResponses?.create

	const turnMemory = new TurnMemory()
	let conversationHead: string | undefined
	let serverTurns = 0
	const pendingResponses = new LRUCache<string, ResponsesTurn>({ max: 100 })

	// A new opening message means the wrapper is serving a new conversation, so start fresh.
	const trackConversation = (firstUserKey: string) => {
		if (firstUserKey === conversationHead) return
		turnMemory.reset()
		conversationHead = firstUserKey
	}

	// Tool-only requests get the profile too, so the system prompt never flips between calls.
	const withProfile = (
		messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
	): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
		const system = messages.findIndex(
			(message) => message.role === "system" || message.role === "developer",
		)
		if (system === -1) {
			const profile = wrapMemoryContext(turnMemory.profile)
			return profile
				? [{ role: "system", content: profile }, ...messages]
				: messages
		}
		return messages.map((message, index) =>
			index === system
				? ({
						...message,
						content: withTurnMemory(
							message.content as string | { type: string; text?: string }[],
							turnMemory.profile,
						),
					} as typeof message)
				: message,
		)
	}

	const recallTurn = (key: string, query: string) =>
		turnMemory.recall(
			key,
			buildTurnRecall({
				namespace,
				query,
				mode,
				baseUrl,
				apiKey,
				source: "tools-openai",
				logger,
				promptTemplate: (data) =>
					`${data.userMemories}\n${data.generalSearchMemories}`.trim(),
			}),
		)

	// Fire and forget: a slow or failing save must never hold the caller's response.
	const captureTurn = (
		conversation: ConversationMessage[],
		userText: string,
	) => {
		if (addMemory !== "always") return
		if (id ? !hasPersistableUserConversationMessage(conversation) : !userText) {
			return
		}
		void addMemoryTool(
			client,
			namespace,
			userText,
			documentId,
			logger,
			conversation,
			apiKey,
			baseUrl,
		)
	}

	const prepareResponsesWithMemory = async (
		params: Parameters<typeof originalResponsesCreate>[0],
		requestOptions?: OpenAI.RequestOptions,
	) => {
		if (!originalResponsesCreate) {
			throw new Error(
				"Responses API is not available in this OpenAI client version",
			)
		}

		const forward = (input: typeof params.input) =>
			originalResponsesCreate.call(
				baseResponses,
				{
					...params,
					input,
					instructions:
						typeof params.instructions === "string"
							? replaceMemoryContext(params.instructions, turnMemory.profile)
							: wrapMemoryContext(turnMemory.profile) || params.instructions,
				},
				requestOptions,
			)

		const items: unknown[] =
			typeof params.input === "string"
				? [{ role: "user", content: params.input }]
				: Array.isArray(params.input)
					? params.input
					: []
		type ResponsesResult = Awaited<ReturnType<typeof originalResponsesCreate>>
		type ResponseLike = {
			id?: unknown
			output_text?: unknown
			output?: unknown
		}
		const conversationParam = (params as { conversation?: unknown })
			.conversation
		const conversationKey =
			typeof conversationParam === "string"
				? `conversation:${conversationParam}`
				: typeof (conversationParam as { id?: unknown })?.id === "string"
					? `conversation:${(conversationParam as { id: string }).id}`
					: undefined
		const finishTurn = (turn: ResponsesTurn, response: ResponseLike) => {
			if (hasResponsesFunctionCall(response.output)) {
				if (typeof response.id === "string") {
					pendingResponses.set(response.id, turn)
				}
				if (conversationKey) pendingResponses.set(conversationKey, turn)
				return
			}
			captureTurn(
				[
					...turn.conversation,
					{ role: "assistant", content: extractResponsesOutputText(response) },
				],
				turn.userText,
			)
		}
		const afterResponseFor =
			(turn: ResponsesTurn): AfterResponse<ResponsesResult> =>
			(value) => {
				if (!params.stream) {
					finishTurn(turn, value as ResponseLike)
					return value
				}
				return observeStream(
					value,
					(event) => {
						const { type, response } = event as {
							type?: unknown
							response?: ResponseLike
						}
						if (type === "response.completed" && response) {
							finishTurn(turn, response)
						}
					},
					() => {},
				)
			}

		const userItems = items.filter(isResponsesUserMessage)
		const latestUser = userItems.at(-1)
		if (!latestUser) {
			const pendingKey = params.previous_response_id || conversationKey
			const pending = pendingKey ? pendingResponses.get(pendingKey) : undefined
			if (!pending) return { request: forward(params.input) }
			if (params.previous_response_id) {
				pendingResponses.delete(params.previous_response_id)
			}
			if (conversationKey) pendingResponses.delete(conversationKey)
			return {
				request: forward(params.input),
				afterResponse: afterResponseFor(pending),
			}
		}

		const serverHistory = params.previous_response_id || conversationParam
		const keys = turnKeys(items, (item) => ({
			role: (item as { role?: unknown })?.role,
			text: extractTextContent((item as { content?: unknown })?.content),
		}))
		if (serverHistory) {
			serverTurns++
			for (const [item, key] of keys) {
				keys.set(item, `${serverTurns}\u0000${key}`)
			}
		}
		const firstUser = userItems[0]
		if (firstUser && !serverHistory) {
			trackConversation(keys.get(firstUser) as string)
		}
		await recallTurn(
			keys.get(latestUser) as string,
			turnKey(extractTextContent(latestUser.content)),
		)

		const memories = await Promise.all(
			items.map((item) => {
				const key = keys.get(item)
				return key === undefined ? undefined : turnMemory.get(key)
			}),
		)
		const injected = items.map((item, index) => {
			const memory = memories[index]
			if (memory === undefined || !isResponsesUserMessage(item)) return item
			const content = item.content as string | { type: string; text?: string }[]
			return { ...item, content: withTurnMemory(content, memory, "input_text") }
		})
		const input =
			typeof params.input === "string"
				? ((injected[0] as { content: string }).content as typeof params.input)
				: (injected as typeof params.input)

		return {
			request: forward(input),
			afterResponse: afterResponseFor({
				conversation: convertResponsesConversationMessages(params.input),
				userText: extractTextContent(latestUser.content),
			}),
		}
	}

	const createResponsesWithMemory = (
		params: Parameters<typeof originalResponsesCreate>[0],
		requestOptions?: OpenAI.RequestOptions,
	) => deferAPIPromise(() => prepareResponsesWithMemory(params, requestOptions))

	const prepareCreateWithMemory = async (
		params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
		requestOptions?: OpenAI.RequestOptions,
	) => {
		const messages = Array.isArray(params.messages) ? params.messages : []
		const forward = (
			forwardedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
		) =>
			originalCreate.call(
				baseCompletions,
				{ ...params, messages: withProfile(forwardedMessages) },
				requestOptions,
			)

		const userMessages = messages.filter((message) => message.role === "user")
		const latestUser = userMessages.at(-1)
		if (!latestUser) return { request: forward(messages) }

		const keys = turnKeys(messages, (message) => ({
			role: message.role,
			text: extractTextContent(message.content),
		}))
		trackConversation(keys.get(userMessages[0] ?? latestUser) as string)
		await recallTurn(
			keys.get(latestUser) as string,
			turnKey(extractTextContent(latestUser.content)),
		)

		const memories = await Promise.all(
			messages.map((message) => {
				const key = keys.get(message)
				return key === undefined ? undefined : turnMemory.get(key)
			}),
		)
		const injected = messages.map((message, index) => {
			const memory = memories[index]
			if (memory === undefined || message.role !== "user") return message
			return { ...message, content: withTurnMemory(message.content, memory) }
		})

		const conversation = convertChatConversationMessages(messages)
		const userText = extractTextContent(latestUser.content)
		const finishTurn = (content: string) =>
			captureTurn([...conversation, { role: "assistant", content }], userText)

		type ChatResult = Awaited<ReturnType<typeof originalCreate>>
		const afterResponse: AfterResponse<ChatResult> = (value) => {
			if (!params.stream) {
				const message = (value as OpenAI.Chat.Completions.ChatCompletion)
					.choices?.[0]?.message
				if (message && !message.tool_calls?.length) {
					finishTurn(message.content ?? "")
				}
				return value
			}
			let text = ""
			let calledTool = false
			return observeStream(
				value,
				(chunk) => {
					const delta = (chunk as OpenAI.Chat.Completions.ChatCompletionChunk)
						.choices?.[0]?.delta
					if (delta?.content) text += delta.content
					if (delta?.tool_calls?.length) calledTool = true
				},
				() => {
					if (!calledTool) finishTurn(text)
				},
			)
		}

		return { request: forward(injected), afterResponse }
	}

	const createWithMemory = (
		params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
		requestOptions?: OpenAI.RequestOptions,
	) => deferAPIPromise(() => prepareCreateWithMemory(params, requestOptions))

	const wrappedCompletions = cloneWithOverrides(baseCompletions, {
		create: createWithMemory as typeof originalCreate,
	})
	const wrappedChat = cloneWithOverrides(baseChat, {
		completions: wrappedCompletions,
	})
	const wrappedResponses =
		baseResponses && originalResponsesCreate
			? cloneWithOverrides(baseResponses, {
					create: createResponsesWithMemory as typeof originalResponsesCreate,
				})
			: undefined
	const wrappedClient = cloneWithOverrides(baseClient, {
		chat: wrappedChat,
		...(wrappedResponses ? { responses: wrappedResponses } : {}),
	})

	Object.defineProperty(wrappedClient, BASE_CLIENT_SYMBOL, {
		value: baseClient,
	})
	baseClientByWrapper.set(wrappedClient, baseClient)
	return wrappedClient
}
