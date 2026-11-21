/**
 * Mastra Processors for Supermemory Integration
 *
 * This module provides input and output processors for Mastra agents that enable:
 * - Memory injection: Fetches relevant user memories before LLM calls
 * - Conversation saving: Persists conversations to Supermemory after responses
 *
 * Processors integrate with Mastra's processor pipeline:
 * - InputProcessor runs before the LLM call, adding the profile to the system messages and
 *   search results to the user's turn
 * - OutputProcessor runs after the LLM responds, optionally saving the conversation
 *
 * @module
 */

import {
	createLogger,
	normalizeBaseUrl,
	validateApiKey,
	buildTurnRecall,
	replaceMemoryContext,
	stripMemoryContext,
	turnKey,
	turnKeys,
	withTurnMemory,
	wrapMemoryContext,
	TurnMemoryByConversation,
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
	namespace: string
	id: string
	apiKey: string
	baseUrl: string
	mode: MemoryMode
	addMemory: "always" | "never"
	logger: Logger
	promptTemplate?: PromptTemplate
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
		namespace: options.namespace,
		id: options.id,
		apiKey,
		baseUrl,
		mode: options.mode ?? "profile",
		addMemory: options.addMemory ?? "always",
		logger,
		promptTemplate: options.promptTemplate,
	}
}

/**
 * Gets the effective id from RequestContext (if provided) or falls back to context.
 * Per-request thread ID takes precedence to support dynamic per-conversation IDs in server setups.
 */
function getEffectiveId(
	ctx: ProcessorContext,
	requestContext?: RequestContext,
): string {
	// Per-request thread ID takes precedence over construction-time id
	if (requestContext) {
		const threadId = requestContext.get(MASTRA_THREAD_ID_KEY) as
			| string
			| undefined
		if (threadId) {
			return threadId
		}
	}
	// Fall back to construction-time id
	return ctx.id
}

const messageText = (message: MastraDBMessage): string => {
	const { parts, content } = message.content
	if (Array.isArray(parts) && parts.length > 0) {
		return parts
			.flatMap((part) =>
				part.type === "text" && typeof part.text === "string"
					? [part.text]
					: [],
			)
			.join(" ")
	}
	return typeof content === "string" ? content : ""
}

const withMessageMemory = (
	message: MastraDBMessage,
	memories: string,
): MastraDBMessage => {
	const { parts, content } = message.content
	const textParts =
		Array.isArray(parts) && parts.length > 0
			? parts
			: [
					{
						type: "text" as const,
						text: typeof content === "string" ? content : "",
					},
				]
	return {
		...message,
		content: {
			...message.content,
			parts: withTurnMemory(textParts, memories) as typeof parts,
		},
	}
}

/**
 * Input processor that adds memories to the prompt before LLM calls.
 *
 * This processor runs once at the start of agent execution (processInput):
 * - The profile ("profile" and "full" modes) is fetched once per conversation and appended to the
 *   first system message (the agent instructions) as a separate block, or added as a system
 *   message when there is none. It stays byte-identical on every call.
 * - Search results ("query" and "full" modes) are appended to the user message they were
 *   retrieved for, and earlier messages keep the block they first received.
 * - A failed or timed-out fetch is retried on the next user message.
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
 *       namespace: "user-123",
 *       id: "conv-456",
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
	private turns = new TurnMemoryByConversation()

	constructor(options: SupermemoryMastraOptions) {
		this.ctx = createProcessorContext(options)
	}

	async processInput(args: ProcessInputArgs): Promise<ProcessInputResult> {
		const { messages, messageList, requestContext, systemMessages } = args

		const users = messages.filter((message) => message.role === "user")
		const latest = users.at(-1)
		if (!latest) return messageList

		const keys = turnKeys(messages, (message) => ({
			role: message.role,
			text: messageText(message),
		}))
		const memory = this.turns.for(getEffectiveId(this.ctx, requestContext))
		const query = turnKey(messageText(latest))
		await memory.recall(
			keys.get(latest) as string,
			buildTurnRecall({
				namespace: this.ctx.namespace,
				query,
				mode: this.ctx.mode,
				baseUrl: this.ctx.baseUrl,
				apiKey: this.ctx.apiKey,
				source: "tools-mastra",
				logger: this.ctx.logger,
				promptTemplate: this.ctx.promptTemplate,
			}),
		)

		const blocks = await Promise.all(
			messages.map((message) => {
				const key = keys.get(message)
				return key === undefined ? undefined : memory.get(key)
			}),
		)
		const profile = wrapMemoryContext(memory.profile)
		if (!profile && blocks.every((block) => !block)) return messageList
		const system = systemMessages.findIndex(
			(message) =>
				message.role === "system" && typeof message.content === "string",
		)
		return {
			messages: messages.map((message, index) => {
				const block = blocks[index]
				return block === undefined ? message : withMessageMemory(message, block)
			}),
			systemMessages:
				system === -1
					? profile
						? [...systemMessages, { role: "system" as const, content: profile }]
						: systemMessages
					: systemMessages.map((message, index) =>
							index === system
								? ({
										...message,
										content: replaceMemoryContext(
											message.content as string,
											memory.profile,
										),
									} as (typeof systemMessages)[number])
								: message,
						),
		}
	}
}

/**
 * Output processor that saves conversations to Supermemory after generation completes.
 *
 * This processor runs once after generation completes (processOutputResult).
 * When addMemory is set to "always", it saves the conversation to Supermemory
 * as one document per conversation.
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
 *       namespace: "user-123",
 *       id: "conv-456",
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

		const effectiveId = getEffectiveId(this.ctx, requestContext)

		try {
			const conversationMessages = this.convertToConversationMessages(messages)

			if (conversationMessages.length === 0) {
				this.ctx.logger.debug("No messages to save")
				return messages
			}

			const response = await addConversation({
				id: effectiveId,
				messages: conversationMessages,
				namespace: this.ctx.namespace,
				apiKey: this.ctx.apiKey,
				baseUrl: this.ctx.baseUrl,
				source: "tools-mastra",
			})

			this.ctx.logger.info("Conversation saved successfully", {
				namespace: this.ctx.namespace,
				id: effectiveId,
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
				result.push({ role, content: stripMemoryContext(content.content) })
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
						text: stripMemoryContext(part.text),
					}))
					.filter((part) => part.text)

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
 * @param options - Configuration options including required namespace and id
 * @returns Configured SupermemoryInputProcessor instance
 *
 * @example
 * ```typescript
 * import { Agent } from "@mastra/core/agent"
 * import { createSupermemoryProcessor } from "@supermemory/tools/mastra"
 * import { openai } from "@ai-sdk/openai"
 *
 * const processor = createSupermemoryProcessor({
 *   namespace: "user-123",
 *   id: "conv-456",
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
 * @param options - Configuration options including required namespace and id
 * @returns Configured SupermemoryOutputProcessor instance
 *
 * @example
 * ```typescript
 * import { Agent } from "@mastra/core/agent"
 * import { createSupermemoryOutputProcessor } from "@supermemory/tools/mastra"
 * import { openai } from "@ai-sdk/openai"
 *
 * const processor = createSupermemoryOutputProcessor({
 *   namespace: "user-123",
 *   id: "conv-456",
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
 *   namespace: "user-123",
 *   id: "conv-456",
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
