import type OpenAI from "openai"

/**
 * Novita AI configuration options
 */
export interface NovitaMiddlewareOptions {
	/** Optional conversation ID to group messages for contextual memory generation */
	conversationId?: string
	/** Enable detailed logging of memory operations (default: false) */
	verbose?: boolean
	/**
	 * Memory retrieval mode:
	 * - "profile": Retrieves user profile memories (static + dynamic) without query filtering
	 * - "query": Searches memories based on semantic similarity to the user's message
	 * - "full": Combines both profile and query-based results
	 */
	mode?: "profile" | "query" | "full"
	/**
	 * Memory persistence mode:
	 * - "always": Automatically save conversations as memories
	 * - "never": Only retrieve memories, don't store new ones
	 */
	addMemory?: "always" | "never"
	/** Custom Supermemory API base URL */
	baseUrl?: string
}

/**
 * Novita AI client options
 */
export interface NovitaClientOptions {
	/** Novita API key (falls back to NOVITA_API_KEY env var) */
	apiKey?: string
	/** Custom base URL (default: https://api.novita.ai/openai) */
	baseURL?: string
	/** Organization ID */
	organization?: string
}

/**
 * Available Novita AI models
 * @see https://novita.ai/models
 */
export const NOVITA_MODELS = {
	/**
	 * Default model - MoE architecture with function calling, structured output, reasoning, and vision
	 * Context: 262,144 tokens | Max Output: 262,144 tokens
	 */
	DEFAULT: "moonshotai/kimi-k2.5",

	/**
	 * GLM-5 - MoE architecture with function calling, structured output, reasoning
	 * Context: 202,800 tokens | Max Output: 131,072 tokens
	 */
	GLM_5: "zai-org/glm-5",

	/**
	 * MiniMax M2.5 - MoE architecture with function calling, structured output, reasoning
	 * Context: 204,800 tokens | Max Output: 131,100 tokens
	 */
	MINIMAX_M2_5: "minimax/minimax-m2.5",
} as const

/**
 * Novita AI embedding models
 */
export const NOVITA_EMBEDDING_MODELS = {
	/**
	 * Qwen3 Embedding - 1024 dimensions, max 8,192 input tokens
	 */
	DEFAULT: "qwen/qwen3-embedding-0.6b",
} as const

/**
 * Novita AI API endpoints
 */
export const NOVITA_ENDPOINTS = {
	/** OpenAI-compatible endpoint */
	OPENAI: "https://api.novita.ai/openai",
	/** Anthropic-compatible endpoint */
	ANTHROPIC: "https://api.novita.ai/anthropic",
} as const

export type NovitaModel = (typeof NOVITA_MODELS)[keyof typeof NOVITA_MODELS]
export type NovitaEmbeddingModel =
	(typeof NOVITA_EMBEDDING_MODELS)[keyof typeof NOVITA_EMBEDDING_MODELS]
