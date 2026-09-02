/**
 * Type definitions for VoltAgent integration.
 *
 * VoltAgent uses hooks to intercept and modify agent behavior. We integrate
 * Supermemory by providing hooks that inject memories before LLM calls.
 */

import type {
	AgentHooks,
	AgentOptions,
	OnEndHookArgs,
	OnPrepareMessagesHookArgs,
	OnStartHookArgs,
} from "@voltagent/core"
import type {
	PromptTemplate,
	MemoryMode,
	AddMemoryMode,
	MemoryPromptData,
} from "../shared"

/**
 * VoltAgent message format used internally by the integration.
 * Compatible with current UI and model message shapes.
 */
export interface VoltAgentMessage {
	role: "system" | "user" | "assistant" | "tool"
	content?:
		| string
		| Array<{ type: string; text?: string; [key: string]: unknown }>
	parts?: Array<{ type: string; text?: string; [key: string]: unknown }>
	[key: string]: unknown
}

/** VoltAgent agent configuration accepted by the integration. */
export type VoltAgentConfig = Omit<AgentOptions, "hooks"> & {
	hooks?: AgentHooks
}

/** Current VoltAgent peer types used by the public integration contract. */
export type VoltAgentHooks = AgentHooks
export type HookStartArgs = OnStartHookArgs
export type HookPrepareMessagesArgs = OnPrepareMessagesHookArgs
export type HookEndArgs = OnEndHookArgs

export type {
	IncludeOptions,
	SearchFilters,
	SupermemoryVoltAgent,
} from "./options"

// Re-export shared types for convenience
export type { PromptTemplate, MemoryMode, AddMemoryMode, MemoryPromptData }
