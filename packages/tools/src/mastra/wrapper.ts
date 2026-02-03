/**
 * Wrapper utilities for enhancing Mastra agent configurations with Supermemory.
 *
 * Since Mastra Agent instances have private properties that can't be modified
 * after construction, we provide utilities that work with agent configs.
 *
 * @module
 */

import { validateApiKey } from "../shared"
import {
	SupermemoryInputProcessor,
	SupermemoryOutputProcessor,
} from "./processor"
import type { SupermemoryMastraOptions, Processor } from "./types"

/**
 * Minimal AgentConfig interface representing the properties we need to enhance.
 * This avoids a direct dependency on @mastra/core while staying type-safe.
 */
interface AgentConfig {
	id: string
	name?: string
	inputProcessors?: Processor[]
	outputProcessors?: Processor[]
	[key: string]: unknown
}

/**
 * Enhances a Mastra agent configuration with Supermemory memory capabilities.
 *
 * This function takes an agent config object and returns a new config with
 * Supermemory processors injected. Use this before creating your Agent instance.
 *
 * The enhanced config includes:
 * - Input processor: Fetches relevant memories before LLM calls
 * - Output processor: Optionally saves conversations after responses
 *
 * @param config - The Mastra agent configuration to enhance
 * @param containerTag - The container tag/user ID for scoping memories
 * @param options - Configuration options for memory behavior
 * @returns Enhanced agent config with Supermemory processors injected
 *
 * @example
 * ```typescript
 * import { Agent } from "@mastra/core/agent"
 * import { withSupermemory } from "@supermemory/tools/mastra"
 * import { openai } from "@ai-sdk/openai"
 *
 * const config = withSupermemory(
 *   {
 *     id: "my-agent",
 *     name: "My Agent",
 *     model: openai("gpt-4o"),
 *     instructions: "You are a helpful assistant.",
 *   },
 *   "user-123",
 *   {
 *     mode: "full",
 *     addMemory: "always",
 *     threadId: "conv-456",
 *   }
 * )
 *
 * const agent = new Agent(config)
 * ```
 *
 * @throws {Error} When neither `options.apiKey` nor `process.env.SUPERMEMORY_API_KEY` are set
 */
export function withSupermemory<T extends AgentConfig>(
	config: T,
	containerTag: string,
	options: SupermemoryMastraOptions = {},
): T {
	validateApiKey(options.apiKey)

	const inputProcessor = new SupermemoryInputProcessor(containerTag, options)
	const outputProcessor = new SupermemoryOutputProcessor(containerTag, options)

	const existingInputProcessors = config.inputProcessors ?? []
	const existingOutputProcessors = config.outputProcessors ?? []

	// Supermemory input processor runs first (before other processors)
	const mergedInputProcessors: Processor[] = [
		inputProcessor,
		...existingInputProcessors,
	]

	// Supermemory output processor runs last (after other processors)
	const mergedOutputProcessors: Processor[] = [
		...existingOutputProcessors,
		outputProcessor,
	]

	return {
		...config,
		inputProcessors: mergedInputProcessors,
		outputProcessors: mergedOutputProcessors,
	}
}
