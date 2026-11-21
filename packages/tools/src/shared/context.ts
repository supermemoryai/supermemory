import { Supermemory } from "supermemory"
import { version } from "../../package.json"

/**
 * Normalizes a base URL by removing trailing slashes.
 *
 * @param url - Optional base URL to normalize
 * @returns Normalized URL without trailing slash, or default API URL
 */
export const normalizeBaseUrl = (url?: string): string => {
	const defaultUrl = "https://api.supermemory.ai"
	const trimmed = url?.trim().replace(/\/+$/, "")
	return trimmed || defaultUrl
}

export type SupermemorySource =
	| "tools-ai-sdk"
	| "tools-openai"
	| "tools-mastra"
	| "tools-voltagent"
	| "tools-claude-memory"

// The API attributes usage to the wrapper and release from these two headers.
export function sourceHeaders(source: SupermemorySource) {
	return { "x-sm-source": source, "x-sm-plugin-version": version }
}

/**
 * Options for creating a Supermemory client.
 */
export interface CreateSupermemoryClientOptions {
	/** Supermemory API key */
	apiKey: string
	/** Optional custom base URL */
	baseUrl?: string
	/** Wrapper the requests come from, sent as `x-sm-source` */
	source: SupermemorySource
}

/**
 * Creates a configured Supermemory client instance.
 *
 * @param options - Client configuration options
 * @returns Configured Supermemory client
 */
export function createSupermemoryClient(
	options: CreateSupermemoryClientOptions,
): Supermemory {
	const normalizedBaseUrl = normalizeBaseUrl(options.baseUrl)

	return new Supermemory({
		apiKey: options.apiKey,
		headers: sourceHeaders(options.source),
		...(normalizedBaseUrl !== "https://api.supermemory.ai"
			? { baseUrl: normalizedBaseUrl }
			: {}),
	})
}

/**
 * Validates that an API key is provided either via options or environment variable.
 *
 * @param apiKey - Optional API key from options
 * @returns The validated API key
 * @throws Error if no API key is available
 */
export function validateApiKey(apiKey?: string): string {
	const providedApiKey = apiKey ?? process.env.SUPERMEMORY_API_KEY

	if (!providedApiKey) {
		throw new Error(
			"SUPERMEMORY_API_KEY is not set — provide it via `options.apiKey` or set `process.env.SUPERMEMORY_API_KEY`",
		)
	}

	return providedApiKey
}
