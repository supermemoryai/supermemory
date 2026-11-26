import type { Supermemory } from "supermemory"
import {
	addConversation,
	type ContentPart,
	type ConversationMessage,
} from "../conversations-client"
import {
	MEMORY_BLOCK_KEY,
	createLogger,
	createMemoryBlocks,
	createSupermemoryClient,
	normalizeBaseUrl,
	placeMemoryBlocks,
	type Logger,
	type MemoryBlockTag,
	type MemoryBlocks,
	type MemoryMessages,
	type MemoryMode,
	type PromptTemplate,
} from "../shared"
import {
	type LanguageModel,
	type LanguageModelCallOptions,
	type LanguageModelMessage,
	type LanguageModelStreamPart,
	imageFilePartUrl,
} from "./util"
import { extractQueryText } from "./memory-prompt"

const safeJsonStringify = (value: unknown): string => {
	try {
		return JSON.stringify(value) ?? ""
	} catch {
		return ""
	}
}

const serializeToolOutput = (output: unknown): string => {
	if (typeof output === "string") return output
	if (typeof output !== "object" || output === null) {
		return safeJsonStringify(output)
	}

	const wrapper = output as {
		type?: unknown
		value?: unknown
		reason?: unknown
	}

	if (
		(wrapper.type === "text" || wrapper.type === "error-text") &&
		typeof wrapper.value === "string"
	) {
		return wrapper.value
	}
	if (
		wrapper.type === "json" ||
		wrapper.type === "error-json" ||
		wrapper.type === "content"
	) {
		return safeJsonStringify(wrapper.value)
	}
	if (wrapper.type === "execution-denied") {
		return typeof wrapper.reason === "string" && wrapper.reason
			? wrapper.reason
			: "Tool execution denied"
	}

	return safeJsonStringify(output)
}

export const convertToConversationMessages = (
	params: LanguageModelCallOptions,
	assistantResponseText: string,
	includeToolCalls = false,
): ConversationMessage[] => {
	const messages: ConversationMessage[] = []

	for (const msg of params.prompt) {
		if (msg.role === "system") continue

		if (typeof msg.content === "string") {
			if (msg.content) {
				messages.push({
					role: msg.role as "user" | "assistant" | "tool",
					content: msg.content,
				})
			}
			continue
		}

		let contentParts: ContentPart[] = []
		let toolCalls: NonNullable<ConversationMessage["tool_calls"]> = []

		// Flush any pending assistant/user content accumulated so far. Called
		// before each tool-result so a tool result never jumps ahead of the
		// text/tool-calls that preceded it (or behind text that follows it),
		// preserving the original chronology for memory extraction.
		const flushContent = () => {
			if (contentParts.length > 0 || toolCalls.length > 0) {
				messages.push({
					role: msg.role as "user" | "assistant" | "tool",
					content: contentParts.length > 0 ? contentParts : "",
					...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
				})
				contentParts = []
				toolCalls = []
			}
		}

		for (const content of msg.content) {
			if (content.type === "text" && content.text) {
				contentParts.push({
					type: "text",
					text: content.text,
				})
			} else if (content.type === "file") {
				const url = imageFilePartUrl(content)
				if (url) {
					contentParts.push({ type: "image_url", imageUrl: { url } })
				}
			} else if (
				includeToolCalls &&
				content.type === "tool-call" &&
				msg.role === "assistant"
			) {
				toolCalls.push({
					id: content.toolCallId,
					type: "function",
					function: {
						name: content.toolName,
						arguments: safeJsonStringify(content.input) || "{}",
					},
				})
			} else if (includeToolCalls && content.type === "tool-result") {
				flushContent()
				messages.push({
					role: "tool",
					content: serializeToolOutput(content.output),
					tool_call_id: content.toolCallId,
				})
			}
		}

		flushContent()
	}

	if (assistantResponseText) {
		messages.push({
			role: "assistant",
			content: assistantResponseText,
		})
	}

	return messages
}

export const saveMemoryAfterResponse = async (
	_client: Supermemory,
	namespace: string,
	id: string,
	assistantResponseText: string,
	params: LanguageModelCallOptions,
	logger: Logger,
	apiKey: string,
	baseUrl: string,
	includeToolCalls = false,
): Promise<void> => {
	try {
		const conversationMessages = convertToConversationMessages(
			params,
			assistantResponseText,
			includeToolCalls,
		)

		const response = await addConversation({
			id,
			messages: conversationMessages,
			namespace,
			apiKey,
			baseUrl,
			source: "tools-ai-sdk",
		})

		logger.info("Conversation saved successfully", {
			namespace,
			id,
			messageCount: conversationMessages.length,
			responseId: response.id,
		})
	} catch (error) {
		logger.error("Error saving memory", {
			error: error instanceof Error ? error.message : "Unknown error",
		})
	}
}

/**
 * Configuration options for the Supermemory middleware.
 */
interface SupermemoryMiddlewareOptions {
	/** Namespace for memory search (e.g., user ID, project ID) */
	namespace: string
	/** Supermemory API key */
	apiKey: string
	/** ID that groups messages into a single document. Required. */
	id: string
	/** Enable detailed logging of memory search and injection */
	verbose?: boolean
	/**
	 * Memory retrieval mode:
	 * - "profile": Retrieves user profile memories (static + dynamic) without query filtering
	 * - "query": Searches memories based on semantic similarity to the user's message
	 * - "full": Combines both profile and query-based results
	 */
	mode?: MemoryMode
	/**
	 * Memory persistence mode:
	 * - "always": Automatically save conversations as memories
	 * - "never": Only retrieve memories, don't store new ones
	 */
	addMemory?: "always" | "never"
	/** Custom Supermemory API base URL */
	baseUrl?: string
	/**
	 * Persist assistant tool calls and tool results as part of the saved
	 * conversation. Off by default: tool payloads are often large and
	 * low-signal, and would pollute memory extraction.
	 */
	includeToolCalls?: boolean
	promptTemplate?: PromptTemplate
	/** Max wait (ms) for the pre-LLM memory retrieval. `withSupermemory` sets this internally. */
	memoryRetrievalTimeoutMs?: number
}

interface SupermemoryMiddlewareContext {
	client: Supermemory
	logger: Logger
	namespace: string
	id: string
	mode: MemoryMode
	addMemory: "always" | "never"
	includeToolCalls: boolean
	normalizedBaseUrl: string
	apiKey: string
	blocks: MemoryBlocks
}

export const createSupermemoryContext = (
	options: SupermemoryMiddlewareOptions,
): SupermemoryMiddlewareContext => {
	const {
		namespace,
		apiKey,
		id,
		verbose = false,
		mode = "profile",
		addMemory = "always",
		baseUrl,
		includeToolCalls = false,
		promptTemplate,
		memoryRetrievalTimeoutMs,
	} = options

	const logger = createLogger(verbose)
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

	const client = createSupermemoryClient({
		apiKey,
		baseUrl: normalizedBaseUrl,
		source: "tools-ai-sdk",
	})

	return {
		client,
		logger,
		namespace,
		id,
		mode,
		addMemory,
		includeToolCalls,
		normalizedBaseUrl,
		apiKey,
		blocks: createMemoryBlocks({
			namespace,
			apiKey,
			baseUrl: normalizedBaseUrl,
			source: "tools-ai-sdk",
			mode,
			logger,
			...(promptTemplate && { promptTemplate }),
			...(memoryRetrievalTimeoutMs !== undefined && {
				timeoutMs: memoryRetrievalTimeoutMs,
			}),
		}),
	}
}

const promptMessages: MemoryMessages<LanguageModelMessage> = {
	tagOf: (message) =>
		message.role === "assistant"
			? message.content.find((part) => part.providerOptions?.[MEMORY_BLOCK_KEY])
					?.providerOptions?.[MEMORY_BLOCK_KEY]
			: undefined,
	isUser: (message) => message.role === "user",
	textOf: (message) =>
		extractQueryText(
			{ prompt: [message] } as LanguageModelCallOptions,
			"query",
		),
	blockMessage: (block) => ({
		role: "user",
		content: [{ type: "text", text: block }],
	}),
}

export interface PreparedCall {
	params: LanguageModelCallOptions
	tag?: MemoryBlockTag
	error?: unknown
}

export const transformParamsWithMemory = async (
	params: LanguageModelCallOptions,
	blocks: MemoryBlocks,
): Promise<PreparedCall> => {
	const placed = await placeMemoryBlocks(blocks, params.prompt, promptMessages)
	return {
		params: { ...params, prompt: placed.messages },
		...(placed.tag && { tag: placed.tag }),
		...(placed.error !== undefined && { error: placed.error }),
	}
}

const withTag = <P>(part: P, tag: MemoryBlockTag): P => ({
	...part,
	providerMetadata: {
		...(part as { providerMetadata?: object }).providerMetadata,
		[MEMORY_BLOCK_KEY]: { block: tag.block, signature: tag.signature },
	},
})

// The first text or tool call carries the tag because frameworks keep its metadata when they store the reply.
export const tagGeneratedContent = <P extends { type: string }>(
	content: P[],
	tag: MemoryBlockTag,
): P[] => {
	const index = content.findIndex(
		(part) => part.type === "text" || part.type === "tool-call",
	)
	return content.map((part, at) => (at === index ? withTag(part, tag) : part))
}

const tagStream = (
	tag: MemoryBlockTag | undefined,
	onText: (delta: string) => void,
	onDone: () => void,
) => {
	let tagged: string | undefined
	return new TransformStream<LanguageModelStreamPart, LanguageModelStreamPart>({
		transform(chunk, controller) {
			if (chunk.type === "text-delta") onText(chunk.delta)
			if (!tag) return controller.enqueue(chunk)
			if (tagged === undefined && chunk.type === "tool-call") {
				tagged = ""
				return controller.enqueue(withTag(chunk, tag))
			}
			if (tagged === undefined && chunk.type === "text-start") {
				tagged = chunk.id
			}
			const textChunk =
				chunk.type === "text-start" ||
				chunk.type === "text-delta" ||
				chunk.type === "text-end"
			controller.enqueue(
				textChunk && chunk.id === tagged ? withTag(chunk, tag) : chunk,
			)
		},
		flush: onDone,
	})
}

const WRAPPED_MODEL = Symbol.for("@supermemory/tools/memory-blocks")

export interface MemoryBlockModelOptions {
	blocks: MemoryBlocks
	logger: Logger
	onRecallError: (error: unknown) => void
	onFinish?: (params: LanguageModelCallOptions, text: string) => void
}

// Recalls into a trailing user message and tags the reply with the signed block; Mastra's doGenerate returns a stream, so both shapes are tagged.
export const withMemoryBlocks = <T extends LanguageModel>(
	model: T,
	options: MemoryBlockModelOptions,
): T => {
	if (Reflect.get(model, WRAPPED_MODEL)) return model
	const prepare = async (params: LanguageModelCallOptions) => {
		const prepared = await transformParamsWithMemory(params, options.blocks)
		if (prepared.error !== undefined) options.onRecallError(prepared.error)
		return prepared
	}
	const piped = <R extends { stream: ReadableStream<LanguageModelStreamPart> }>(
		result: R,
		params: LanguageModelCallOptions,
		tag: MemoryBlockTag | undefined,
	): R => {
		let text = ""
		return {
			...result,
			stream: result.stream.pipeThrough(
				tagStream(
					tag,
					(delta) => {
						text += delta
					},
					() => options.onFinish?.(params, text),
				),
			),
		}
	}
	const fail = (message: string, error: unknown) => {
		options.logger.error(message, {
			error: error instanceof Error ? error.message : "Unknown error",
		})
		return error
	}
	return new Proxy(model, {
		get(target, prop, receiver) {
			if (prop === WRAPPED_MODEL) return true
			if (prop === "doGenerate") {
				return async (params: LanguageModelCallOptions) => {
					const prepared = await prepare(params)
					try {
						// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility across V2, V3 and V4
						const result = await target.doGenerate(prepared.params as any)
						const content =
							prepared.tag && Array.isArray(result.content)
								? tagGeneratedContent(result.content, prepared.tag)
								: result.content
						if (result.stream) {
							return piped({ ...result, content }, params, prepared.tag)
						}
						options.onFinish?.(
							params,
							extractAssistantResponseText(result.content as unknown[]),
						)
						return { ...result, content }
					} catch (error) {
						throw fail("Error generating response", error)
					}
				}
			}
			if (prop === "doStream") {
				return async (params: LanguageModelCallOptions) => {
					const prepared = await prepare(params)
					try {
						// biome-ignore lint/suspicious/noExplicitAny: Union type compatibility across V2, V3 and V4
						const result = await target.doStream(prepared.params as any)
						return piped(result, params, prepared.tag)
					} catch (error) {
						throw fail("Error streaming response", error)
					}
				}
			}
			return Reflect.get(target, prop, receiver)
		},
	}) as T
}

export const extractAssistantResponseText = (content: unknown[]): string => {
	return (content as Array<{ type: string; text?: string }>)
		.map((item) => (item.type === "text" ? item.text || "" : ""))
		.join("")
}
