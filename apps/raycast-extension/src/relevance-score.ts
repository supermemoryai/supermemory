export function formatRelevanceScore(score: number | undefined) {
	return score === undefined ? undefined : `${Math.round(score * 100)}%`
}
