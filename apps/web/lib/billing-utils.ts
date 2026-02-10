/**
 * Convert tokens to credits
 * 100,000 tokens = 1 credit
 * Uses floor rounding (2.9 credits shows as 2, only shows 3 when it hits 3.0)
 */
export function tokensToCredits(tokens: number): number {
	return Math.floor(tokens / 100_000)
}

/**
 * Format a number with K/M suffix for display
 * @example formatUsageNumber(1500000) => "1.5M"
 * @example formatUsageNumber(50000) => "50K"
 */
export function formatUsageNumber(value: number): string {
	if (value >= 1_000_000) {
		const millions = value / 1_000_000
		return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`
	}
	if (value >= 1_000) {
		const thousands = value / 1_000
		return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`
	}
	return value.toString()
}

/**
 * Calculate usage percentage, clamped between 0 and 100
 */
export function calculateUsagePercent(used: number, limit: number): number {
	if (limit <= 0) return 0
	return Math.min(Math.max((used / limit) * 100, 0), 100)
}

/**
 * Get the number of days remaining until a reset date
 * @param resetAt - Unix timestamp in milliseconds (from Autumn billing)
 * @returns number of days, or null if no date provided
 */
export function getDaysRemaining(
	resetAt: number | null | undefined,
): number | null {
	if (!resetAt) return null
	const end = new Date(resetAt)
	const now = new Date()
	const diffMs = end.getTime() - now.getTime()
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
	return Math.max(0, diffDays)
}
