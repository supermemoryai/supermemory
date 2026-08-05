export const SPACE_HIGHLIGHTS_CACHE_NAME = "space-highlights-v2"
export const LEGACY_SPACE_HIGHLIGHTS_CACHE_NAME = "space-highlights-v1"

export function getSpaceHighlightsCacheKey({
	backendUrl,
	spaceId,
	userId,
	organizationId,
}: {
	backendUrl: string
	spaceId: string
	userId: string
	organizationId: string
}): string {
	const url = new URL(`${backendUrl.replace(/\/$/, "")}/v3/space-highlights`)
	url.searchParams.set("spaceId", spaceId)
	url.searchParams.set("userId", userId)
	url.searchParams.set("organizationId", organizationId)
	return url.toString()
}
