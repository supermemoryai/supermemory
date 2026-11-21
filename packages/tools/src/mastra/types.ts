/**
 * Type definitions for Mastra integration.
 *
 * We import core types directly from @mastra/core to ensure perfect compatibility.
 * Custom types are only defined where @mastra/core doesn't export what we need.
 */

import type {
	PromptTemplate,
	MemoryMode,
	AddMemoryMode,
	MemoryPromptData,
} from "../shared"

// Re-export Mastra core types for consumers
export type {
	Processor,
	ProcessInputArgs,
	ProcessInputResult,
	ProcessOutputResultArgs,
	ProcessorMessageResult,
	InputProcessor,
	OutputProcessor,
} from "@mastra/core/processors"

export type {
	MastraDBMessage,
	MastraMessageContentV2,
	MessageList,
} from "@mastra/core/agent"

export type { RequestContext } from "@mastra/core/request-context"

/**
 * Configuration options for the Supermemory Mastra processor.
 */
export interface SupermemoryMastraOptions {
	/** Namespace (e.g. user ID) for scoping memories. Required. */
	namespace: string
	/** ID that groups messages into a single document for contextual memory generation. Required. */
	id: string
	/** Supermemory API key (falls back to SUPERMEMORY_API_KEY env var) */
	apiKey?: string
	/** Custom Supermemory API base URL */
	baseUrl?: string
	/**
	 * Memory retrieval mode (default: "profile"):
	 * - "profile": The user profile, fetched once per conversation on the first user message
	 * - "query": Search results for each user message
	 * - "full": Both; the profile comes with the first user message's block
	 *
	 * Memories are appended to the user message they were retrieved for and replayed unchanged
	 * on later calls. A failed or timed-out fetch is retried on the next user message.
	 */
	mode?: MemoryMode
	/** Memory persistence mode (default: "always") */
	addMemory?: AddMemoryMode
	/** Enable detailed logging of memory search and injection */
	verbose?: boolean
	/** Custom function to format memory data into the block appended to the user message */
	promptTemplate?: PromptTemplate
}

export type { PromptTemplate, MemoryMode, AddMemoryMode, MemoryPromptData }
