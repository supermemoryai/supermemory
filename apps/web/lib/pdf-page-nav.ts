/**
 * Pure helpers for the PDF viewer's page navigator: clamping page numbers,
 * choosing the "current" page from per-page visibility, and parsing the
 * jump-to-page input. Kept free of DOM/React so they can be unit tested.
 */

/** Clamp a 1-based page number into [1, total] (total < 1 collapses to 1). */
export function clampPage(page: number, total: number): number {
	const max = Math.max(1, total)
	const rounded = Math.round(page)
	if (rounded < 1) return 1
	if (rounded > max) return max
	return rounded
}

/**
 * Pick the page that occupies the most of the viewport from a map of
 * `pageNumber -> visible ratio`. Ties resolve to the lower page number so
 * scrolling down only advances once a later page is clearly more visible.
 * Returns `fallback` when nothing is visible.
 */
export function pickMostVisiblePage(
	ratios: Map<number, number>,
	fallback: number,
): number {
	let bestPage = fallback
	let bestRatio = 0
	for (const [page, ratio] of ratios) {
		if (ratio <= 0) continue
		if (ratio > bestRatio || (ratio === bestRatio && page < bestPage)) {
			bestPage = page
			bestRatio = ratio
		}
	}
	return bestPage
}

/**
 * Parse a jump-to-page input. Returns a clamped page number, or null when the
 * input isn't a usable positive integer.
 */
export function parsePageInput(value: string, total: number): number | null {
	const trimmed = value.trim()
	if (!/^\d+$/.test(trimmed)) return null
	const parsed = Number.parseInt(trimmed, 10)
	if (!Number.isFinite(parsed) || parsed < 1) return null
	return clampPage(parsed, total)
}
