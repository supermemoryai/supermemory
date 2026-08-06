export type SearchHit = {
	memory?: string | null
	chunk?: string | null
}

export function buildSearchMemoriesBody(
	query: string,
	containerTag?: string,
): {
	q: string
	searchMode: "hybrid"
	include: { relatedMemories: boolean }
	containerTag?: string
} {
	return {
		q: query,
		// API default is "memories"; hybrid also returns document chunks.
		searchMode: "hybrid",
		include: { relatedMemories: true },
		...(containerTag ? { containerTag } : {}),
	}
}

/** Prefer extracted memory text; fall back to document chunk. */
export function formatSearchHitText(hit: SearchHit): string | null {
	const text = hit.memory || hit.chunk
	if (typeof text !== "string") return null
	const trimmed = text.trim()
	return trimmed.length > 0 ? trimmed : null
}

/** Numbered prompt lines for Included Memories; skips empty hits. */
export function formatSearchHitsForPrompt(
	results: SearchHit[] | null | undefined,
): string[] {
	if (!results?.length) return []
	const lines: string[] = []
	for (const hit of results) {
		const text = formatSearchHitText(hit)
		if (text) lines.push(`${lines.length + 1}. ${text} \n`)
	}
	return lines
}
