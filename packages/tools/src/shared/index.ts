// Types
export type {
	MemoryPromptData,
	MemorySearchResult,
	ProfileSearchResult,
	PromptTemplate,
	MemoryMode,
	AddMemoryMode,
	Logger,
	ProfileStructure,
	ProfileEntry,
	ProfileMarkdownData,
	SupermemoryBaseOptions,
} from "./types"

// Logger
export { createLogger } from "./logger"

// Prompt builder
export {
	defaultPromptTemplate,
	convertProfileToMarkdown,
	formatMemoriesForPrompt,
} from "./prompt-builder"

// Cache
export { MemoryCache, makeTurnKey } from "./cache"

// Context
export {
	normalizeBaseUrl,
	createSupermemoryClient,
	validateApiKey,
	type CreateSupermemoryClientOptions,
} from "./context"

// Memory client
export {
	PROFILE_SEARCH_THRESHOLD,
	supermemoryProfileSearch,
	buildMemoriesText,
	extractQueryText,
	getLastUserMessageText,
	type BuildMemoriesTextOptions,
	type GenericMessage,
} from "./memory-client"

// SDK-owned prompt context
export {
	MEMORY_CONTEXT_START,
	MEMORY_CONTEXT_END,
	stripMemoryContext,
	wrapMemoryContext,
	replaceMemoryContext,
} from "./memory-context"

// Per-turn memory placement
export {
	RECALL_TIMEOUT_MS,
	TurnMemory,
	TurnMemoryByConversation,
	buildTurnRecall,
	turnKey,
	turnKeys,
	withTurnMemory,
	type BuildTurnRecallOptions,
	type FrozenProfile,
	type TurnRecall,
	type TurnRecallFetcher,
	type TurnSearch,
} from "./turn-memory"
