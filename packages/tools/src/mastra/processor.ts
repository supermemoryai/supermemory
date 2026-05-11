/**
 * Mastra Processors for Supermemory Integration
 *
 * This module provides input and output processors for Mastra agents that enable:
 * - Memory injection: Fetches relevant user memories before LLM calls
 * - Conversation saving: Persists conversations to Supermemory after responses
 *
 * Processors integrate with Mastra's processor pipeline:
 * - InputProcessor runs before the LLM call, injecting memories into system messages
 * - OutputProcessor runs after the LLM responds, optionally saving the conversation
 *
 * @module
 */

import {
	createLogger,
	normalizeBaseUrl,
	validateApiKey,
	MemoryCache,
	buildMemoriesText,
	extractQueryText,
	type Logger,
	type MemoryMode,
	type PromptTemplate,
} from "../shared"
import {
	addConversation,
	type ConversationMessage,
} from "../conversations-client"
import { MASTRA_THREAD_ID_KEY } from "@mastra/core/request-context"
import type {
	SupermemoryMastraOptions,
	Processor,
	ProcessInputArgs,
	ProcessInputResult,
	ProcessOutputResultArgs,
	MastraDBMessage,
	RequestContext,
} from "./types"

/**
 * Internal context shared between input and output processors.
 */
interface ProcessorContext {
	containerTag: string
	customId: string
	apiKey: string
	baseUrl: string
	mode: MemoryMode
	addMemory: "always" | "never"
	logger: Logger
	promptTemplate?: PromptTemplate
	memoryCache: MemoryCache<string>
}

/**
 * Creates the shared processor context from options.
 */
function createProcessorContext(
	options: SupermemoryMastraOptions,
): ProcessorContext {
	const apiKey = validateApiKey(options.apiKey)
	const baseUrl = normalizeBaseUrl(options.baseUrl)
	const logger = createLogger(options.verbose ?? false)

	return {
		containerTag: options.containerTag,
		customId: options.customId,
		apiKey,
		baseUrl,
		mode: options.mode ?? "profile",
		addMemory: options.addMemory ?? "always",
		logger,
		promptTemplate: options.promptTemplate,
		memoryCache: new MemoryCache<string>(),
	}
}

/**
 * Gets the effective customId from RequestContext (if provided) or falls back to context.
 * Per-request thread ID takes precedence to support dynamic per-conversation IDs in server setups.
 */
function getEffectiveCustomId(
	ctx: ProcessorContext,
	requestContext?: RequestContext,
): string {
	// Per-request thread ID takes precedence over construction-time customId
	if (requestContext) {
		const threadId = requestContext.get(MASTRA_THREAD_ID_KEY) as
			| string
			| undefined
		if (threadId) {
			return threadId
		}
	}
	// Fall back to construction-time customId
	return ctx.customId
}

/**
 * Input processor that injects memories into the system prompt before LLM calls.
 *
 * This processor runs once at the start of agent execution (processInput).
 * It fetches relevant memories from Supermemory based on the user's message
 * and injects them into the system messages.
 *
 * @example
 * ```typescript
 * import { Agent } from "@mastra/core/agent"
 * import { SupermemoryInputProcessor } from "@supermemory/tools/mastra"
 * import { openai } from "@ai-sdk/openai"
 *
 * const agent = new Agent({
 *   id: "my-agent",
 *   name: "My Agent",
 *   model: openai("gpt-4o"),
 *   inputProcessors: [
 *     new SupermemoryInputProcessor({
 *       containerTag: "user-123",
 *       customId: "conv-456",
 *       mode: "full",
 *       verbose: true,
 *     }),
 *   ],
 * })
 * ```
 */
export class SupermemoryInputProcessor implements Processor {
	readonly id = "supermemory-input"
	readonly name = "Supermemory Memory Injection"

	private ctx: ProcessorContext

	constructor(options: SupermemoryMastraOptions) {
		this.ctx = createProcessorContext(options)
	}

	async processInput(args: ProcessInputArgs): Promise<ProcessInputResult> {
		const { messages, messageList, requestContext } = args

		try {
			const queryText = extractQueryText(
				messages as unknown as Array<{
					role: string
					content: string | Array<{ type: string; text?: string }>
				}>,
				this.ctx.mode,
			)

			if (this.ctx.mode !== "profile" && !queryText) {
				this.ctx.logger.debug("No user message found, skipping memory search")
				return messageList
			}

			const effectiveThreadId = getEffectiveCustomId(this.ctx, requestContext)
			const turnKey = MemoryCache.makeTurnKey(
				this.ctx.containerTag,
				effectiveThreadId,
				this.ctx.mode,
				queryText || "",
			)

			const cachedMemories = this.ctx.memoryCache.get(turnKey)
			if (cachedMemories) {
				this.ctx.logger.debug("Using cached memories", { turnKey })
				messageList.addSystem(cachedMemories, "supermemory")
				return messageList
			}

			this.ctx.logger.info("Starting memory search", {
				containerTag: this.ctx.containerTag,
				threadId: effectiveThreadId,
				mode: this.ctx.mode,
			})

			const memories = await buildMemoriesText({
				containerTag: this.ctx.containerTag,
				queryText: queryText || "",
				mode: this.ctx.mode,
				baseUrl: this.ctx.baseUrl,
				apiKey: this.ctx.apiKey,
				logger: this.ctx.logger,
				promptTemplate: this.ctx.promptTemplate,
			})

			if (memories) {
				this.ctx.memoryCache.set(turnKey, memories)
				messageList.addSystem(memories, "supermemory")
				this.ctx.logger.debug("Injected memories into system prompt", {
					length: memories.length,
				})
			}

			return messageList
		} catch (error) {
			this.ctx.logger.error("Error fetching memories", {
				error: error instanceof Error ? error.message : "Unknown error",
			})
			return messageList
		}
	}
}

/**
 * Output processor that saves conversations to Supermemory after generation completes.
 *
 * This processor runs once after generation completes (processOutputResult).
 * When addMemory is set to "always", it saves the conversation to Supermemory
 * using the /v4/conversations API for thread-based storage.
 *
 * @example
 * ```typescript
 * import { Agent } from "@mastra/core/agent"
 * import { SupermemoryOutputProcessor } from "@supermemory/tools/mastra"
 * import { openai } from "@ai-sdk/openai"
 *
 * const agent = new Agent({
 *   id: "my-agent",
 *   name: "My Agent",
 *   model: openai("gpt-4o"),
 *   outputProcessors: [
 *     new SupermemoryOutputProcessor({
 *       containerTag: "user-123",
 *       customId: "conv-456",
 *       addMemory: "always",
 *     }),
 *   ],
 * })
 * ```
 */
export class SupermemoryOutputProcessor implements Processor {
	readonly id = "supermemory-output"
	readonly name = "Supermemory Conversation Save"

	private ctx: ProcessorContext

	constructor(options: SupermemoryMastraOptions) {
		this.ctx = createProcessorContext(options)
	}

	async processOutputResult(
		args: ProcessOutputResultArgs,
	): Promise<MastraDBMessage[]> {
		const { messages, requestContext } = args

		if (this.ctx.addMemory !== "always") {
			return messages
		}

		const effectiveCustomId = getEffectiveCustomId(this.ctx, requestContext)

		try {
			const conversationMessages = this.convertToConversationMessages(messages)

			if (conversationMessages.length === 0) {
				this.ctx.logger.debug("No messages to save")
				return messages
			}

			const response = await addConversation({
				conversationId: effectiveCustomId,
				messages: conversationMessages,
				containerTags: [this.ctx.containerTag],
				apiKey: this.ctx.apiKey,
				baseUrl: this.ctx.baseUrl,
			})

			this.ctx.logger.info("Conversation saved successfully", {
				containerTag: this.ctx.containerTag,
				customId: effectiveCustomId,
				messageCount: conversationMessages.length,
				responseId: response.id,
			})
		} catch (error) {
			this.ctx.logger.error("Error saving conversation", {
				error: error instanceof Error ? error.message : "Unknown error",
			})
		}

		return messages
	}

	private convertToConversationMessages(
		messages: MastraDBMessage[],
	): ConversationMessage[] {
		const result: ConversationMessage[] = []

		for (const msg of messages) {
			if (msg.role === "system") {
				continue
			}

			const role = msg.role as "user" | "assistant"
			const content = msg.content

			if (content.content && typeof content.content === "string") {
				result.push({ role, content: content.content })
				continue
			}

			if (content.parts && Array.isArray(content.parts)) {
				const textParts = content.parts
					.filter(
						(part): part is { type: "text"; text: string } =>
							part.type === "text" &&
							"text" in part &&
							typeof part.text === "string",
					)
					.map((part) => ({
						type: "text" as const,
						text: part.text,
					}))

				if (textParts.length > 0) {
					result.push({ role, content: textParts })
				}
			}
		}

		return result
	}
}

/**
 * Creates a Supermemory input processor for memory injection.
 *
 * @param options - Configuration options including required containerTag and customId
 * @returns Configured SupermemoryInputProcessor instance
 *
 * @example
 * ```typescript
 * import { Agent } from "@mastra/core/agent"
 * import { createSupermemoryProcessor } from "@supermemory/tools/mastra"
 * import { openai } from "@ai-sdk/openai"
 *
 * const processor = createSupermemoryProcessor({
 *   containerTag: "user-123",
 *   customId: "conv-456",
 *   mode: "full",
 *   verbose: true,
 * })
 *
 * const agent = new Agent({
 *   id: "my-agent",
 *   name: "My Agent",
 *   model: openai("gpt-4o"),
 *   inputProcessors: [processor],
 * })
 * ```
 */
export function createSupermemoryProcessor(
	options: SupermemoryMastraOptions,
): SupermemoryInputProcessor {
	return new SupermemoryInputProcessor(options)
}

/**
 * Creates a Supermemory output processor for saving conversations.
 *
 * @param options - Configuration options including required containerTag and customId
 * @returns Configured SupermemoryOutputProcessor instance
 *
 * @example
 * ```typescript
 * import { Agent } from "@mastra/core/agent"
 * import { createSupermemoryOutputProcessor } from "@supermemory/tools/mastra"
 * import { openai } from "@ai-sdk/openai"
 *
 * const processor = createSupermemoryOutputProcessor({
 *   containerTag: "user-123",
 *   customId: "conv-456",
 *   addMemory: "always",
 * })
 *
 * const agent = new Agent({
 *   id: "my-agent",
 *   name: "My Agent",
 *   model: openai("gpt-4o"),
 *   outputProcessors: [processor],
 * })
 * ```
 */
export function createSupermemoryOutputProcessor(
	options: SupermemoryMastraOptions,
): SupermemoryOutputProcessor {
	return new SupermemoryOutputProcessor(options)
}

/**
 * Creates both input and output processors with shared configuration.
 *
 * Use this when you want both memory injection and conversation saving
 * with consistent settings across both processors.
 *
 * @param options - Configuration options shared by both processors
 * @returns Object containing both input and output processors
 *
 * @example
 * ```typescript
 * import { Agent } from "@mastra/core/agent"
 * import { createSupermemoryProcessors } from "@supermemory/tools/mastra"
 * import { openai } from "@ai-sdk/openai"
 *
 * const { input, output } = createSupermemoryProcessors({
 *   containerTag: "user-123",
 *   customId: "conv-456",
 *   mode: "full",
 *   addMemory: "always",
 * })
 *
 * const agent = new Agent({
 *   id: "my-agent",
 *   name: "My Agent",
 *   model: openai("gpt-4o"),
 *   inputProcessors: [input],
 *   outputProcessors: [output],
 * })
 * ```
 */
export function createSupermemoryProcessors(
	options: SupermemoryMastraOptions,
): {
	input: SupermemoryInputProcessor
	output: SupermemoryOutputProcessor
} {
	return {
		input: new SupermemoryInputProcessor(options),
		output: new SupermemoryOutputProcessor(options),
	}
}
