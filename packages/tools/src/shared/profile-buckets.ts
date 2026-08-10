const DEFAULT_BASE_URL = "https://api.supermemory.ai"

export interface ProfileBucketsParams {
	containerTag: string
	/** Bucket keys to return. Omit for every bucket configured for the tag. */
	buckets?: string[]
}

export interface ProfileBucketsResponse {
	/** Memory lists keyed by bucket key. */
	buckets: Record<string, string[]>
}

/**
 * Reads bucket-organized profile memories via `POST /v4/profile` with
 * `include: ["buckets"]`, which skips the static and dynamic sections entirely.
 *
 * The supermemory SDK's `profile()` params don't cover `include`/`buckets`, so
 * the endpoint is called directly — the same pattern the middleware already
 * uses for `/v4/profile`.
 */
export async function profileBucketsRequest(
	apiKey: string,
	params: ProfileBucketsParams,
	baseUrl: string = DEFAULT_BASE_URL,
): Promise<ProfileBucketsResponse> {
	const response = await fetch(`${baseUrl}/v4/profile`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			containerTag: params.containerTag,
			include: ["buckets"],
			...(params.buckets?.length ? { buckets: params.buckets } : {}),
		}),
	})

	if (!response.ok) {
		const errorText = await response.text().catch(() => "Unknown error")
		throw new Error(
			`Supermemory profile buckets failed: ${response.status} ${response.statusText}. ${errorText}`,
		)
	}

	const body = (await response.json()) as {
		profile?: { buckets?: Record<string, string[]> }
	}

	return { buckets: body.profile?.buckets ?? {} }
}
