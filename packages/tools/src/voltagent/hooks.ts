/**
 * VoltAgent hooks for Supermemory integration.
 *
 * Provides onPrepareMessages and onEnd hooks that inject memories
 * and save conversations.
 */

import type {
	VoltAgentHooks,
	HookPrepareMessagesArgs,
	HookEndArgs,
	VoltAgentMessage,
	SupermemoryVoltAgent,
} from "./types"
import {
	createSupermemoryContext,
	enhanceMessagesWithMemories,
	saveConversation,
} from "./middleware"

const getInputMessages = (input: unknown): VoltAgentMessage[] => {
	if (typeof input === "string") {
		return input.trim() ? [{ role: "user", content: input }] : []
	}
	if (Array.isArray(input)) return input as VoltAgentMessage[]
	if (
		input &&
		typeof input === "object" &&
		"messages" in input &&
		Array.isArray(input.messages)
	) {
		return input.messages as VoltAgentMessage[]
	}
	return []
}

const getOutputText = (output: unknown): string => {
	if (typeof output === "string") return output
	if (!output || typeof output !== "object") return ""
	if ("text" in output && typeof output.text === "string") return output.text
	if ("content" in output && typeof output.content === "string") {
		return output.content
	}
	return ""
}

/**
 * Creates Supermemory hooks for VoltAgent agents.
 *
 * These hooks intercept the agent lifecycle to inject memories
 * before LLM calls and save conversations after completion.
 *
 * @param containerTag - The container tag/user ID for scoping memories
 * @param options - Configuration options for memory behavior
 * @returns VoltAgent hooks object with onPrepareMessages and onEnd
 *
 * @example
 * ```typescript
 * import { createSupermemoryHooks } from "@supermemory/tools/voltagent"
 *
 * const hooks = createSupermemoryHooks("user-123", {
 *   mode: "full",
 *   addMemory: "always",
 *   customId: "conv-456",
 * })
 *
 * const agent = new Agent({
 *   name: "my-agent",
 *   instructions: "You are a helpful assistant",
 *   model: openai("gpt-4o"),
 *   hooks
 * })
 * ```
 */
export function createSupermemoryHooks(
	containerTag: string,
	options: SupermemoryVoltAgent,
): VoltAgentHooks {
	const ctx = createSupermemoryContext(containerTag, options)

	return {
		onPrepareMessages: async (args: HookPrepareMessagesArgs) => {
			try {
				// VoltAgent 2.x supplies canonical UI messages directly on the hook.
				const inputMessages = (args.rawMessages ??
					args.messages) as unknown as VoltAgentMessage[]
				const preparedMessages = args.messages as unknown as VoltAgentMessage[]

				ctx.logger.debug("onPrepareMessages called", {
					messageCount: args.messages.length,
					inputMessageCount: inputMessages.length,
					agentName: args.agent.name,
				})

				const enhancedMessages = await enhanceMessagesWithMemories(
					inputMessages,
					ctx,
					preparedMessages,
				)

				ctx.logger.debug("Messages enhanced with memories", {
					originalCount: args.messages.length,
					enhancedCount: enhancedMessages.length,
				})

				return {
					messages: enhancedMessages as unknown as typeof args.messages,
				}
			} catch (error) {
				ctx.logger.error("Error in onPrepareMessages", {
					error: error instanceof Error ? error.message : "Unknown error",
				})
				return { messages: args.messages }
			}
		},

		onEnd: async (args: HookEndArgs): Promise<void> => {
			try {
				ctx.logger.debug("onEnd called", {
					agentName: args.agent.name,
					hasContext: !!args.context,
					hasOutput: !!args.output,
				})

				let messages: VoltAgentMessage[] = []

				if (args.context?.input && args.output) {
					const inputMessages = getInputMessages(args.context.input)
					const outputText = getOutputText(args.output)

					if (inputMessages.length > 0 && outputText) {
						messages = [
							...inputMessages,
							{ role: "assistant" as const, content: outputText },
						]
					}
				}

				if (messages.length === 0) {
					ctx.logger.debug("No messages to save, skipping")
					return
				}

				await saveConversation(messages, ctx)
			} catch (error) {
				ctx.logger.error("Error in onEnd", {
					error: error instanceof Error ? error.message : "Unknown error",
				})
			}
		},
	}
}

/**
 * Merges Supermemory hooks with existing hooks from an agent config.
 * Preserves existing hooks and adds Supermemory hooks.
 *
 * @param existingHooks - Existing hooks from agent config (if any)
 * @param supermemoryHooks - Supermemory hooks to merge
 * @returns Merged hooks object
 */
export function mergeHooks(
	existingHooks: VoltAgentHooks | undefined,
	supermemoryHooks: VoltAgentHooks,
): VoltAgentHooks {
	if (!existingHooks) {
		return supermemoryHooks
	}

	const mergedHooks: VoltAgentHooks = { ...existingHooks }

	if (existingHooks.onPrepareMessages && supermemoryHooks.onPrepareMessages) {
		const existingOnPrepareMessages = existingHooks.onPrepareMessages
		const supermemoryOnPrepareMessages = supermemoryHooks.onPrepareMessages

		mergedHooks.onPrepareMessages = async (args) => {
			const resultAfterExisting = await existingOnPrepareMessages(args)
			const messagesAfterExisting =
				resultAfterExisting?.messages || args.messages

			return await supermemoryOnPrepareMessages({
				...args,
				messages: messagesAfterExisting,
			})
		}
	} else if (supermemoryHooks.onPrepareMessages) {
		mergedHooks.onPrepareMessages = supermemoryHooks.onPrepareMessages
	}

	if (existingHooks.onEnd && supermemoryHooks.onEnd) {
		const existingOnEnd = existingHooks.onEnd
		const supermemoryOnEnd = supermemoryHooks.onEnd

		mergedHooks.onEnd = async (args) => {
			await supermemoryOnEnd(args)
			await existingOnEnd(args)
		}
	} else if (supermemoryHooks.onEnd) {
		mergedHooks.onEnd = supermemoryHooks.onEnd
	}

	if (existingHooks.onStart && supermemoryHooks.onStart) {
		const existingOnStart = existingHooks.onStart
		const supermemoryOnStart = supermemoryHooks.onStart

		mergedHooks.onStart = async (args) => {
			await existingOnStart(args)
			await supermemoryOnStart(args)
		}
	} else if (supermemoryHooks.onStart) {
		mergedHooks.onStart = supermemoryHooks.onStart
	}

	return mergedHooks
}
