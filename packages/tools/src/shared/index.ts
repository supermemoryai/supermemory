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

// Signed memory blocks
export {
	MEMORY_BLOCK_KEY,
	RECALL_TIMEOUT_MS,
	createMemoryBlocks,
	placeMemoryBlocks,
	type MemoryBlockOptions,
	type MemoryBlockTag,
	type MemoryBlocks,
	type MemoryMessages,
	type PlacedMemory,
} from "./memory-block"
