import { useAction, useQuery } from "convex/react"
import { useState, useCallback } from "react"
import type { FunctionReference } from "convex/server"
import type {
	AddMemoryArgs,
	SearchMemoriesArgs,
	ProfileArgs,
	SearchResponse,
	ProfileResponse,
	Memory,
	ApiLog,
	ApiStats,
} from "../client/index"

/**
 * React Hooks for Supermemory Convex Component
 *
 * These hooks provide reactive access to Supermemory data with automatic
 * re-rendering when data changes.
 */

/**
 * Add memories to Supermemory
 *
 * @example
 * ```tsx
 * function ChatApp() {
 *   const add = addMemory();
 *   await add({ content: "Hello", containerTag: "user_123" });
 * }
 * ```
 */
export function addMemory(componentPath = "supermemory") {
	const action =
		`${componentPath}:actions.add` as unknown as FunctionReference<"action">
	const addAction = useAction(action)

	return useCallback(
		async (args: AddMemoryArgs) => {
			return await addAction(args)
		},
		[addAction],
	)
}

/**
 * Search Supermemory with reactive results
 *
 * @example
 * ```tsx
 * const { results, isLoading, search } = searchMemories({
 *   q: "typescript", containerTag: "user_123"
 * });
 * ```
 */
export function searchMemories(
	args: SearchMemoriesArgs | null,
	componentPath = "supermemory",
) {
	const action =
		`${componentPath}:actions.search` as unknown as FunctionReference<"action">
	const searchAction = useAction(action)
	const [results, setResults] = useState<SearchResponse | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const search = useCallback(
		async (searchArgs?: SearchMemoriesArgs) => {
			const finalArgs = searchArgs || args
			if (!finalArgs) return

			setIsLoading(true)
			setError(null)

			try {
				const response = await searchAction(finalArgs)
				setResults(response as SearchResponse)
			} catch (err) {
				setError(err instanceof Error ? err : new Error("Search failed"))
			} finally {
				setIsLoading(false)
			}
		},
		[searchAction, args],
	)

	return { results, isLoading, error, search }
}

/**
 * Get user profile
 *
 * @example
 * ```tsx
 * const { profile, isLoading, refresh } = getProfile({
 *   containerTag: "user_123"
 * });
 * ```
 */
export function getProfile(
	args: ProfileArgs | null,
	componentPath = "supermemory",
) {
	const action =
		`${componentPath}:actions.profile` as unknown as FunctionReference<"action">
	const profileAction = useAction(action)
	const [profile, setProfile] = useState<ProfileResponse | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const refresh = useCallback(
		async (profileArgs?: ProfileArgs) => {
			const finalArgs = profileArgs || args
			if (!finalArgs) return

			setIsLoading(true)
			setError(null)

			try {
				const response = await profileAction(finalArgs)
				setProfile(response as ProfileResponse)
			} catch (err) {
				setError(err instanceof Error ? err : new Error("Profile fetch failed"))
			} finally {
				setIsLoading(false)
			}
		},
		[profileAction, args],
	)

	return { profile, isLoading, error, refresh }
}

/**
 * List memories reactively
 *
 * @example
 * ```tsx
 * const memories = listMemories({ containerTag: "user_123" });
 * // memories includes content + extractedMemories for each entry
 * ```
 */
export function listMemories(
	args: {
		containerTag: string
		source?: "chat" | "document" | "manual"
		limit?: number
	},
	componentPath = "supermemory",
) {
	const query =
		`${componentPath}:queries.listMemories` as unknown as FunctionReference<"query">
	return useQuery(query, args) as Memory[] | undefined
}


// Export all types
export type {
	AddMemoryArgs,
	SearchMemoriesArgs,
	ProfileArgs,
	SearchResponse,
	ProfileResponse,
	Memory,
} from "../client/index"
