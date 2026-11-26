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
	MEMORY_BLOCK_KEY,
	createMemoryBlocks,
	createSupermemoryClient,
	placeMemoryBlocks,
	stripMemoryContext,
	type MemoryBlockTag,
	type MemoryMessages,
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

// SDK helpers (parse, stream, runTools) call create through this._client; a proxy keeps the SDK's private fields reachable.
const routeHelpersThrough = (
	baseClient: object,
	overrides: Record<PropertyKey, unknown>,
	resources: unknown[],
) => {
	const helperClient = new Proxy(baseClient, {
		get(target, key) {
			if (Object.hasOwn(overrides, key)) return overrides[key]
			const value = Reflect.get(target, key, target)
			return typeof value === "function" ? value.bind(target) : value
		},
	})
	for (const resource of resources) {
		if (!resource) continue
		Object.defineProperty(resource, "_client", {
			value: helperClient,
			configurable: true,
			writable: true,
		})
	}
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
	 * - "profile": The user profile
	 * - "query": Search results for the latest user message
	 * - "full": Both, in one block
	 *
	 * The block is sent as a separate user message after the latest user message.
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

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

const tagOf = (item: unknown): unknown =>
	item && typeof item === "object"
		? (item as Record<string, unknown>)[MEMORY_BLOCK_KEY]
		: undefined

// The API rejects unknown fields on replayed Responses items, so the tag never leaves the wrapper.
const withoutTag = <T>(item: T): T => {
	if (tagOf(item) === undefined) return item
	const { [MEMORY_BLOCK_KEY]: _tag, ...rest } = item as Record<string, unknown>
	return rest as T
}

const setTag = (target: unknown, tag: MemoryBlockTag) => {
	if (target && typeof target === "object") {
		Object.assign(target, {
			[MEMORY_BLOCK_KEY]: { block: tag.block, signature: tag.signature },
		})
	}
}

const chatMessages: MemoryMessages<ChatMessage> = {
	tagOf: (message) =>
		message.role === "assistant" ? tagOf(message) : undefined,
	isUser: (message) => message.role === "user",
	textOf: (message) => extractTextContent(message.content),
	blockMessage: (block) => ({ role: "user", content: block }),
}

const responsesItems: MemoryMessages<unknown> = {
	tagOf: (item) => (isResponsesUserMessage(item) ? undefined : tagOf(item)),
	isUser: isResponsesUserMessage,
	textOf: (item) => extractTextContent((item as ResponsesInputItem).content),
	blockMessage: (block) => ({
		role: "user",
		content: [{ type: "input_text", text: block }],
	}),
}

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
 * When the latest user message has no memories yet, sends one recall as a separate user message
 * after it, leaving your messages, system prompt and `instructions` unchanged. The returned
 * assistant message (Chat Completions, non-streaming) or first output item (Responses with
 * client-sent history) carries that block, signed, in a `supermemory` field. Send it back as is
 * and the wrapper puts the block in front of it and strips the field, so earlier turns are resent
 * byte for byte; a missing or bad signature means no block is restored. With
 * `previous_response_id` or a conversation, OpenAI keeps the block in its stored history.
 * Each finished turn is saved in the background. Nothing is held in memory between calls.
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

	const pendingResponses = new LRUCache<string, ResponsesTurn>({ max: 100 })
	const blocks = createMemoryBlocks({
		namespace,
		apiKey,
		baseUrl,
		source: "tools-openai",
		mode,
		logger,
		promptTemplate: (data) =>
			`${data.userMemories}\n${data.generalSearchMemories}`.trim(),
	})

	const placeBlocks = async <M>(
		items: readonly M[],
		adapter: MemoryMessages<M>,
	) => {
		const placed = await placeMemoryBlocks(blocks, items, adapter)
		if (placed.error !== undefined) {
			logger.warn("Memory recall failed; continuing without it", {
				error:
					placed.error instanceof Error
						? placed.error.message
						: String(placed.error),
			})
		}
		return { messages: placed.messages.map(withoutTag), tag: placed.tag }
	}

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

		const items: unknown[] =
			typeof params.input === "string"
				? [{ role: "user", content: params.input }]
				: Array.isArray(params.input)
					? params.input
					: []
		const placed = await placeBlocks(items, responsesItems)
		const input = (
			typeof params.input === "string" &&
			placed.messages.length === items.length
				? params.input
				: placed.messages
		) as typeof params.input
		const forward = () =>
			originalResponsesCreate.call(
				baseResponses,
				{ ...params, input },
				requestOptions,
			)

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
		const tag =
			params.previous_response_id || conversationParam ? undefined : placed.tag
		const tagOutput = (output: unknown) => {
			if (tag && Array.isArray(output)) setTag(output[0], tag)
		}
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
			(turn: ResponsesTurn | undefined): AfterResponse<ResponsesResult> =>
			(value) => {
				if (!params.stream) {
					tagOutput((value as ResponseLike).output)
					if (turn) finishTurn(turn, value as ResponseLike)
					return value
				}
				return observeStream(
					value,
					(event) => {
						const { type, response, item, output_index } = event as {
							type?: unknown
							response?: ResponseLike
							item?: unknown
							output_index?: unknown
						}
						if (
							(type === "response.output_item.added" ||
								type === "response.output_item.done") &&
							output_index === 0
						) {
							tagOutput([item])
						}
						if (type === "response.completed" && response) {
							tagOutput(response.output)
							if (turn) finishTurn(turn, response)
						}
					},
					() => {},
				)
			}

		const latestUser = items.filter(isResponsesUserMessage).at(-1)
		if (!latestUser) {
			const pendingKey = params.previous_response_id || conversationKey
			const pending = pendingKey ? pendingResponses.get(pendingKey) : undefined
			if (params.previous_response_id) {
				pendingResponses.delete(params.previous_response_id)
			}
			if (conversationKey) pendingResponses.delete(conversationKey)
			return { request: forward(), afterResponse: afterResponseFor(pending) }
		}

		return {
			request: forward(),
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
		const placed = await placeBlocks(messages, chatMessages)
		const request = originalCreate.call(
			baseCompletions,
			{ ...params, messages: placed.messages },
			requestOptions,
		)

		const latestUser = messages
			.filter((message) => message.role === "user")
			.at(-1)
		if (!latestUser) return { request }

		const conversation = convertChatConversationMessages(messages)
		const userText = extractTextContent(latestUser.content)
		const finishTurn = (content: string) =>
			captureTurn([...conversation, { role: "assistant", content }], userText)

		type ChatResult = Awaited<ReturnType<typeof originalCreate>>
		const afterResponse: AfterResponse<ChatResult> = (value) => {
			if (!params.stream) {
				const message = (value as OpenAI.Chat.Completions.ChatCompletion)
					.choices?.[0]?.message
				if (message && placed.tag) setTag(message, placed.tag)
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

		return { request, afterResponse }
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
	const baseBetaCompletions = baseClient.beta?.chat?.completions
	const wrappedBetaCompletions = baseBetaCompletions
		? cloneWithOverrides(baseBetaCompletions, {})
		: undefined
	const wrappedBeta = wrappedBetaCompletions
		? cloneWithOverrides(baseClient.beta, {
				chat: cloneWithOverrides(baseClient.beta.chat, {
					completions: wrappedBetaCompletions,
				}),
			})
		: undefined
	const overrides = {
		chat: wrappedChat,
		...(wrappedResponses ? { responses: wrappedResponses } : {}),
		...(wrappedBeta ? { beta: wrappedBeta } : {}),
	}
	const wrappedClient = cloneWithOverrides(baseClient, overrides)
	routeHelpersThrough(baseClient, overrides, [
		wrappedChat,
		wrappedCompletions,
		wrappedResponses,
		wrappedBetaCompletions,
	])

	Object.defineProperty(wrappedClient, BASE_CLIENT_SYMBOL, {
		value: baseClient,
	})
	baseClientByWrapper.set(wrappedClient, baseClient)
	return wrappedClient
}
