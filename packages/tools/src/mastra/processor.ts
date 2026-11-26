/**
 * Mastra Processors for Supermemory Integration
 *
 * This module provides input and output processors for Mastra agents that enable:
 * - Memory injection: Fetches relevant user memories before LLM calls
 * - Conversation saving: Persists conversations to Supermemory after responses
 *
 * Processors integrate with Mastra's processor pipeline:
 * - InputProcessor wraps the model for each step, so memories ride in a separate user message
 *   after the latest user message and the reply carries them back into Mastra memory
 * - OutputProcessor runs after the LLM responds, optionally saving the conversation
 *
 * @module
 */

import {
	createLogger,
	createMemoryBlocks,
	normalizeBaseUrl,
	validateApiKey,
	stripMemoryContext,
	type Logger,
	type MemoryBlocks,
	type MemoryMode,
	type PromptTemplate,
} from "../shared"
import { withMemoryBlocks } from "../vercel/middleware"
import type { LanguageModel } from "../vercel/util"
import {
	addConversation,
	type ConversationMessage,
} from "../conversations-client"
import { MASTRA_THREAD_ID_KEY } from "@mastra/core/request-context"
import type {
	SupermemoryMastraOptions,
	Processor,
	ProcessInputStepArgs,
	ProcessInputStepResult,
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

/**
 * Input processor that adds memories to every model call.
 *
 * It wraps the step's model (processInputStep) instead of editing Mastra's messages:
 * - When the latest user message has no memories yet, one recall (profile and search, per
 *   `mode`) is sent as a separate user message after it. The agent instructions and the
 *   stored messages are never changed.
 * - The reply carries that block, signed, in its provider metadata, which Mastra memory stores
 *   with the message. On later calls the block is put back in front of that reply, so history
 *   is resent byte for byte and stays prompt-cacheable. Tool-call steps reuse it.
 * - A block with a missing or bad signature is ignored and the call gets a fresh recall.
 * - Nothing is held in memory between calls, so a new agent per request is fine.
 *
 * The step model must be a resolved AI SDK model, which is what Mastra passes for both a model
 * object and a `provider/model` string.
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
	private blocks: MemoryBlocks

	constructor(options: SupermemoryMastraOptions) {
		this.ctx = createProcessorContext(options)
		this.blocks = createMemoryBlocks({
			namespace: this.ctx.namespace,
			apiKey: this.ctx.apiKey,
			baseUrl: this.ctx.baseUrl,
			source: "tools-mastra",
			mode: this.ctx.mode,
			logger: this.ctx.logger,
			...(this.ctx.promptTemplate && {
				promptTemplate: this.ctx.promptTemplate,
			}),
		})
	}

	/**
	 * Wraps the step's model so the call gets this turn's memories and the reply carries them.
	 *
	 * @param args - Mastra step arguments; only `model` is read
	 * @returns The wrapped model, or nothing when the model is not a resolved AI SDK model
	 */
	processInputStep(args: ProcessInputStepArgs): ProcessInputStepResult {
		const { model } = args
		if (
			!model ||
			typeof model !== "object" ||
			typeof (model as { doStream?: unknown }).doStream !== "function"
		) {
			this.ctx.logger.warn(
				"Supermemory needs a resolved model in processInputStep; skipping memories",
			)
			return {}
		}
		const logger = this.ctx.logger
		return {
			model: withMemoryBlocks(model as unknown as LanguageModel, {
				blocks: this.blocks,
				logger,
				onRecallError: (error) =>
					logger.warn("Memory recall failed; continuing without it", {
						error: error instanceof Error ? error.message : String(error),
					}),
			}) as unknown as typeof model,
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
