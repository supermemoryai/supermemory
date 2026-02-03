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
	 * When using the output processor, set this to enable automatic conversation saving.
	 * The threadId is used to group messages into a single conversation.
	 */
	threadId?: string
}

export type { PromptTemplate, MemoryMode, AddMemoryMode, MemoryPromptData }
