import { LRUCache } from "lru-cache"
import type { Supermemory } from "supermemory"
import {
	addConversation,
	type ContentPart,
	type ConversationMessage,
} from "../conversations-client"
import {
	createLogger,
	createSupermemoryClient,
	normalizeBaseUrl,
	buildMemoriesText,
	defaultPromptTemplate,
	supermemoryProfileSearch,
	type ProfileStructure,
	type Logger,
	type PromptTemplate,
	type MemoryMode,
} from "../shared"
import { type LanguageModelCallOptions, imageFilePartUrl } from "./util"
import {
	extractQueryText,
	injectMemoriesIntoParams,
	injectTurnMemoriesIntoParams,
	turnKey,
} from "./memory-prompt"

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
	/** Max wait (ms) for the pre-LLM profile retrieval. Omit for no limit (e.g. tests). `withSupermemory` sets this internally. */
	memoryRetrievalTimeoutMs?: number
}

const MAX_TURNS = 500
const EMPTY_PROFILE: ProfileStructure["profile"] = { static: [], dynamic: [] }

interface TurnState {
	memories: string
	failure?: { error: unknown }
	pending?: Promise<void>
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
	promptTemplate?: PromptTemplate
	memoryRetrievalTimeoutMs?: number
	profile?: { data: ProfileStructure["profile"]; text: string }
	profileRequest?: Promise<ProfileStructure["profile"]>
	turns: LRUCache<string, TurnState>
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
		promptTemplate,
		...(memoryRetrievalTimeoutMs !== undefined
			? { memoryRetrievalTimeoutMs }
			: {}),
		turns: new LRUCache({ max: MAX_TURNS }),
	}
}

// A failed fetch is dropped so the next user turn retries it instead of running without a profile for good.
const loadProfile = (
	ctx: SupermemoryMiddlewareContext,
	signal?: AbortSignal,
): Promise<ProfileStructure["profile"]> => {
	if (ctx.profile) return Promise.resolve(ctx.profile.data)
	ctx.profileRequest ??= supermemoryProfileSearch(
		ctx.namespace,
		"",
		ctx.normalizedBaseUrl,
		ctx.apiKey,
		"tools-ai-sdk",
		signal,
	)
		.then(async ({ profile }) => {
			const text = await buildMemoriesText({
				namespace: ctx.namespace,
				queryText: "",
				mode: "profile",
				baseUrl: ctx.normalizedBaseUrl,
				apiKey: ctx.apiKey,
				source: "tools-ai-sdk",
				logger: ctx.logger,
				promptTemplate: ctx.promptTemplate,
				profile,
			})
			ctx.profile = { data: profile, text }
			return profile
		})
		.finally(() => {
			ctx.profileRequest = undefined
		})
	return ctx.profileRequest
}

// Profile and search share one timeout; a failed profile never drops this turn's search results.
const retrieveTurn = async (
	ctx: SupermemoryMiddlewareContext,
	query: string,
): Promise<Omit<TurnState, "pending">> => {
	const controller =
		(ctx.memoryRetrievalTimeoutMs ?? 0) > 0 ? new AbortController() : undefined
	const timeoutId = controller
		? setTimeout(() => controller.abort(), ctx.memoryRetrievalTimeoutMs)
		: undefined
	const signal = controller?.signal
	const profile = ctx.mode === "query" ? undefined : loadProfile(ctx, signal)
	const template = ctx.promptTemplate ?? defaultPromptTemplate

	try {
		const [profileResult, searchResult] = await Promise.allSettled([
			profile,
			ctx.mode !== "profile" && query
				? buildMemoriesText({
						namespace: ctx.namespace,
						queryText: query,
						mode: ctx.mode,
						baseUrl: ctx.normalizedBaseUrl,
						apiKey: ctx.apiKey,
						source: "tools-ai-sdk",
						logger: ctx.logger,
						promptTemplate: (data) => template({ ...data, userMemories: "" }),
						...(signal && { signal }),
						...(profile && { profile: profile.catch(() => EMPTY_PROFILE) }),
					})
				: "",
		])
		const memories =
			searchResult.status === "fulfilled" ? searchResult.value : ""
		const failed = [profileResult, searchResult].find(
			(result): result is PromiseRejectedResult => result.status === "rejected",
		)
		return { memories, ...(failed && { failure: { error: failed.reason } }) }
	} finally {
		if (timeoutId !== undefined) clearTimeout(timeoutId)
	}
}

export const injectCachedMemories = (
	params: LanguageModelCallOptions,
	ctx: SupermemoryMiddlewareContext,
): LanguageModelCallOptions =>
	injectMemoriesIntoParams(
		injectTurnMemoriesIntoParams(
			params,
			(key) => ctx.turns.get(key)?.memories ?? "",
		),
		ctx.profile?.text ?? "",
		ctx.logger,
	)

// Tool steps reuse their turn as is; only a new or regenerated user turn retries a failed retrieval.
export const transformParamsWithMemory = async (
	params: LanguageModelCallOptions,
	ctx: SupermemoryMiddlewareContext,
): Promise<LanguageModelCallOptions> => {
	const users = params.prompt.filter((message) => message.role === "user")
	const user = users.at(-1)
	if (user) {
		const query = extractQueryText({ ...params, prompt: [user] }, "query")
		const key = turnKey(users.length - 1, query)
		const fresh = params.prompt.at(-1)?.role === "user"
		let turn = ctx.turns.get(key)
		if (!turn || (fresh && turn.failure && !turn.pending)) {
			const next: TurnState = { memories: turn?.memories ?? "" }
			next.pending = retrieveTurn(ctx, query).then((result) => {
				next.memories = result.memories
				next.failure = result.failure
				next.pending = undefined
			})
			ctx.turns.set(key, next)
			turn = next
		}
		await turn.pending
		if (turn.failure) throw turn.failure.error
	}
	return injectCachedMemories(params, ctx)
}

export const extractAssistantResponseText = (content: unknown[]): string => {
	return (content as Array<{ type: string; text?: string }>)
		.map((item) => (item.type === "text" ? item.text || "" : ""))
		.join("")
}
