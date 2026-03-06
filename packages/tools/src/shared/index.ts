// Types
export type {
	MemoryPromptData,
	PromptTemplate,
	MemoryMode,
	SearchMode,
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
	supermemoryHybridSearch,
	buildMemoriesText,
	extractQueryText,
	getLastUserMessageText,
	type BuildMemoriesTextOptions,
	type GenericMessage,
	type SearchResultItem,
	type SearchResponse,
} from "./memory-client"
