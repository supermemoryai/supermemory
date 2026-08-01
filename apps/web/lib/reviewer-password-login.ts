export const MCP_REVIEWER_EMAIL = "test@supermemory.com"

export function normalizeReviewerPasswordEmail(value: unknown): string | null {
	if (typeof value !== "string") return null
	const normalized = value.trim().toLowerCase()
	return normalized || null
}

export function shouldUseReviewerPasswordLogin({
	submittedEmail,
}: {
	submittedEmail: string
}): boolean {
	return normalizeReviewerPasswordEmail(submittedEmail) === MCP_REVIEWER_EMAIL
}
