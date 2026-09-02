export type AddMemoryMode = "always" | "never"
export type MemoryMode = "profile" | "query" | "full"

export interface MiddlewareRuntimeConfig {
	addMemory: AddMemoryMode
	verbose: boolean
	includeToolCalls: boolean
	skipMemoryOnError: boolean
}

export const DEFAULT_MIDDLEWARE_CONFIG: MiddlewareRuntimeConfig = {
	addMemory: "always",
	verbose: false,
	includeToolCalls: false,
	skipMemoryOnError: true,
}

export function normalizeMiddlewareConfig(
	input?: Partial<MiddlewareRuntimeConfig> | null,
): MiddlewareRuntimeConfig {
	if (!input) return { ...DEFAULT_MIDDLEWARE_CONFIG }
	return {
		addMemory: input.addMemory ?? DEFAULT_MIDDLEWARE_CONFIG.addMemory,
		verbose: input.verbose ?? DEFAULT_MIDDLEWARE_CONFIG.verbose,
		includeToolCalls:
			input.includeToolCalls ?? DEFAULT_MIDDLEWARE_CONFIG.includeToolCalls,
		skipMemoryOnError:
			input.skipMemoryOnError ?? DEFAULT_MIDDLEWARE_CONFIG.skipMemoryOnError,
	}
}
