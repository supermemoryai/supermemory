export function buildSearchMemoriesBody(
	query: string,
	containerTag?: string,
): {
	q: string
	include: { relatedMemories: boolean }
	containerTag?: string
} {
	return {
		q: query,
		include: { relatedMemories: true },
		...(containerTag ? { containerTag } : {}),
	}
}
