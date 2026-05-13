/**
 * Format a date/timestamp into a human-readable relative time string.
 * Accepts ISO string, epoch milliseconds (number), Date object, or null/undefined.
 */
export function formatRelativeTime(
	date: string | number | Date | null | undefined,
): string {
	if (!date) return "Never"
	const d = typeof date === "number" ? new Date(date) : new Date(date)
	if (Number.isNaN(d.getTime())) return "Never"
	const now = new Date()
	const diffMs = now.getTime() - d.getTime()

	// Handle future dates (e.g. slight server clock skew)
	if (diffMs < 0) return "Just now"

	const diffMinutes = Math.floor(diffMs / (1000 * 60))
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
	const diffDays = Math.floor(diffHours / 24)

	if (diffMinutes < 1) return "Just now"
	if (diffMinutes < 60) return `${diffMinutes}m ago`
	if (diffHours < 24) return `${diffHours}h ago`
	if (diffDays === 1) return "Yesterday"
	if (diffDays < 7) return `${diffDays} days ago`
	return d.toLocaleDateString()
}

/** Map backend trigger type enum to user-facing display label */
export const TRIGGER_TYPE_LABELS: Record<string, string> = {
	event: "Webhook",
	cron: "Scheduled",
	manual: "Manual",
}

/** Canonical provider → display name map. Import this everywhere instead of duplicating. */
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
	"google-drive": "Google Drive",
	notion: "Notion",
	onedrive: "OneDrive",
	gmail: "Gmail",
	github: "GitHub",
	"web-crawler": "Web Crawler",
	s3: "S3",
}

/** Provider type union matching the backend import endpoint */
export type ImportProvider =
	| "google-drive"
	| "notion"
	| "onedrive"
	| "gmail"
	| "github"
	| "web-crawler"
	| "s3"
