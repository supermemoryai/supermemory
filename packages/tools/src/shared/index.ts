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
