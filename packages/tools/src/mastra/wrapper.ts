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
 * - Output processor: Saves conversations after responses (when addMemory is "always")
 *
 * @param config - The Mastra agent configuration to enhance
 * @param options - Configuration options including required containerTag and customId
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
 *   {
 *     containerTag: "user-123",
 *     customId: "conv-456",
 *     mode: "full",
 *     addMemory: "always",
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
	options: SupermemoryMastraOptions,
): T {
	// Runtime guard for breaking API change - catch old 3-arg signature usage
	if (
		typeof options !== "object" ||
		options === null ||
		!options.containerTag ||
		!options.customId
	) {
		throw new Error(
			"withSupermemory: options must be an object with required containerTag and customId fields. " +
				"The API changed in v2.0.0 — see https://docs.supermemory.ai/integrations/mastra for the new signature.",
		)
	}

	validateApiKey(options.apiKey)

	const inputProcessor = new SupermemoryInputProcessor(options)
	const outputProcessor = new SupermemoryOutputProcessor(options)

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
