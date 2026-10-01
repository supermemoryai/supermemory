import {
	deduplicateMemoriesForMode,
	type ProfileWithMemories,
} from "../../../../packages/tools/src/tools-shared"
import { wrapMemoryContext } from "../../../../packages/tools/src/shared/memory-context"
import {
	convertProfileToMarkdown,
	defaultPromptTemplate,
} from "../../../../packages/tools/src/shared/prompt-builder"

export type MemoryMode = "profile" | "query" | "full"
export type MiddlewareFlavor = "ai-sdk" | "openai"

export interface MemoryProfileSlice {
	static: unknown[]
	dynamic: unknown[]
	searchResults: unknown[]
}

export interface ReconstructedMemoryBlock {
	profile: {
		static: string[]
		dynamic: string[]
		searchResults: string[]
	}
	block: string
}

/** Reconstruct the exact SDK-owned block from a post-response profile snapshot. */
export function reconstructSdkMemoryBlock(
	mode: MemoryMode,
	profile: MemoryProfileSlice,
	flavor: MiddlewareFlavor,
): ReconstructedMemoryBlock {
	const deduplicated = deduplicateMemoriesForMode(
		mode,
		profile as ProfileWithMemories,
	)
	const visibleProfile = {
		static: deduplicated.static,
		dynamic: deduplicated.dynamic,
		searchResults: mode === "profile" ? [] : deduplicated.searchResults,
	}

	const userMemories =
		mode === "query"
			? ""
			: convertProfileToMarkdown({
					profile: {
						static: visibleProfile.static,
						dynamic: visibleProfile.dynamic,
					},
					searchResults: { results: [] },
				})
	const generalSearchMemories =
		mode !== "profile" && visibleProfile.searchResults.length > 0
			? `Search results for user's recent message: \n${visibleProfile.searchResults
					.map((memory) => `- ${memory}`)
					.join("\n")}`
			: ""

	const memories =
		flavor === "ai-sdk"
			? defaultPromptTemplate({
					userMemories,
					generalSearchMemories,
					searchResults: [],
				})
			: `${userMemories}\n${generalSearchMemories}`.trim()

	return {
		profile: visibleProfile,
		block: wrapMemoryContext(memories),
	}
}
