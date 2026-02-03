import Supermemory from "supermemory"

/**
 * Normalizes a base URL by removing trailing slashes.
 *
 * @param url - Optional base URL to normalize
 * @returns Normalized URL without trailing slash, or default API URL
 */
export const normalizeBaseUrl = (url?: string): string => {
	const defaultUrl = "https://api.supermemory.ai"
	if (!url) return defaultUrl
	return url.endsWith("/") ? url.slice(0, -1) : url
}

/**
 * Options for creating a Supermemory client.
 */
export interface CreateSupermemoryClientOptions {
	/** Supermemory API key */
	apiKey: string
	/** Optional custom base URL */
	baseUrl?: string
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
		...(normalizedBaseUrl !== "https://api.supermemory.ai"
			? { baseURL: normalizedBaseUrl }
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
