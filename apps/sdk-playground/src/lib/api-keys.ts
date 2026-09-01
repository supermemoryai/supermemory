export interface PlaygroundApiKeys {
	supermemoryApiKey: string
	openaiApiKey: string
}

export const API_KEYS_STORAGE_KEY = "sdk-playground-api-keys"

interface ResolveApiKeyOptions {
	allowEnvironment?: boolean
}

export function resolveSupermemoryApiKey(
	input?: Partial<PlaygroundApiKeys> | null,
	options: ResolveApiKeyOptions = {},
): string | null {
	const provided = input?.supermemoryApiKey?.trim()
	if (provided) return provided
	if (options.allowEnvironment === false) return null
	return process.env.SUPERMEMORY_API_KEY?.trim() || null
}

export function resolveOpenAiApiKey(
	input?: Partial<PlaygroundApiKeys> | null,
	options: ResolveApiKeyOptions = {},
): string | null {
	const provided = input?.openaiApiKey?.trim()
	if (provided) return provided
	if (options.allowEnvironment === false) return null
	return process.env.OPENAI_API_KEY?.trim() || null
}

export function resolveApiKeys(
	input?: Partial<PlaygroundApiKeys> | null,
	options: ResolveApiKeyOptions = {},
): PlaygroundApiKeys | null {
	const supermemoryApiKey = resolveSupermemoryApiKey(input, options)
	const openaiApiKey = resolveOpenAiApiKey(input, options)

	if (!supermemoryApiKey || !openaiApiKey) return null

	return { supermemoryApiKey, openaiApiKey }
}

export function readStoredApiKeys(): Partial<PlaygroundApiKeys> {
	if (typeof window === "undefined") return {}
	try {
		const raw = sessionStorage.getItem(API_KEYS_STORAGE_KEY)
		if (!raw) return {}
		const parsed = JSON.parse(raw) as Partial<PlaygroundApiKeys>
		return {
			supermemoryApiKey: parsed.supermemoryApiKey ?? "",
			openaiApiKey: parsed.openaiApiKey ?? "",
		}
	} catch {
		return {}
	}
}

export function storeApiKeys(keys: Partial<PlaygroundApiKeys>) {
	if (typeof window === "undefined") return
	sessionStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys))
}

export function clearStoredApiKeys() {
	if (typeof window === "undefined") return
	sessionStorage.removeItem(API_KEYS_STORAGE_KEY)
}
