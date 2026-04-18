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
	SearchMode,
	MemoryPromptData,
	SupermemoryBaseOptions,
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
 * Extends base options with Mastra-specific settings.
 */
export interface SupermemoryMastraOptions extends SupermemoryBaseOptions {
	/**
	 * Container tag for scoping memories (e.g., user ID)
	 */
	containerTag: string

	/**
	 * Custom ID for grouping messages into the same document (e.g., conversation ID)
	 */
	customId: string
}

export type {
	PromptTemplate,
	MemoryMode,
	AddMemoryMode,
	SearchMode,
	MemoryPromptData,
}
