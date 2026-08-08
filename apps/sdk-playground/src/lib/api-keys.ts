export interface PlaygroundApiKeys {
	supermemoryApiKey: string
	openaiApiKey: string
}

export const API_KEYS_STORAGE_KEY = "sdk-playground-api-keys"

export function resolveApiKeys(
	input?: Partial<PlaygroundApiKeys> | null,
): PlaygroundApiKeys | null {
	const supermemoryApiKey =
		input?.supermemoryApiKey?.trim() || process.env.SUPERMEMORY_API_KEY?.trim()
	const openaiApiKey =
		input?.openaiApiKey?.trim() || process.env.OPENAI_API_KEY?.trim()

	if (!supermemoryApiKey || !openaiApiKey) return null

	return { supermemoryApiKey, openaiApiKey }
}

export function readStoredApiKeys(): Partial<PlaygroundApiKeys> {
	if (typeof window === "undefined") return {}
	try {
		const raw = localStorage.getItem(API_KEYS_STORAGE_KEY)
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
	localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys))
}

/** Temporarily set process env for SDKs that only read SUPERMEMORY_API_KEY from env. */
export async function withPlaygroundEnvKeys<T>(
	keys: PlaygroundApiKeys,
	fn: () => Promise<T>,
): Promise<T> {
	const previous = {
		SUPERMEMORY_API_KEY: process.env.SUPERMEMORY_API_KEY,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
	}

	process.env.SUPERMEMORY_API_KEY = keys.supermemoryApiKey
	process.env.OPENAI_API_KEY = keys.openaiApiKey

	try {
		return await fn()
	} finally {
		if (previous.SUPERMEMORY_API_KEY !== undefined) {
			process.env.SUPERMEMORY_API_KEY = previous.SUPERMEMORY_API_KEY
		} else {
			delete process.env.SUPERMEMORY_API_KEY
		}
		if (previous.OPENAI_API_KEY !== undefined) {
			process.env.OPENAI_API_KEY = previous.OPENAI_API_KEY
		} else {
			delete process.env.OPENAI_API_KEY
		}
	}
}
