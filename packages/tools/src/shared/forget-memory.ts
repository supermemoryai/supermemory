const DEFAULT_BASE_URL = "https://api.supermemory.ai"

export interface ForgetMemoryParams {
	containerTag: string
	id?: string
	content?: string
	reason?: string
}

/**
 * Marks a memory as forgotten via `DELETE /v4/memories`.
 *
 * The supermemory SDK version this package depends on (v3) has no
 * `memories.forget` method, so the endpoint is called directly — the same
 * pattern the middleware already uses for `/v4/profile` and
 * `/v4/conversations`.
 */
export async function forgetMemoryRequest(
	apiKey: string,
	params: ForgetMemoryParams,
	baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
	const response = await fetch(`${baseUrl}/v4/memories`, {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify(params),
	})

	if (!response.ok) {
		const errorText = await response.text().catch(() => "Unknown error")
		throw new Error(
			`Supermemory forget memory failed: ${response.status} ${response.statusText}. ${errorText}`,
		)
	}
}

export interface ForgetMatchingParams {
	containerTag: string
	/** Topic or instruction to forget. Provide either this or `ids`. */
	query?: string
	/** Exact memory ids to forget, skipping the semantic search. Max 500. */
	ids?: string[]
	/** Preview without mutating. */
	dryRun?: boolean
	/** Similarity floor for candidates, 0-1. Lower casts a wider net. */
	threshold?: number
	/** Safety cap on how many memories a query-mode call may forget, 1-500. */
	maxForget?: number
	reason?: string
}

export interface ForgetMatchingMemory {
	id: string
	memory: string
	score: number
}

export interface ForgetMatchingResponse {
	dryRun: boolean
	count: number
	/** Tagged on every memory forgotten in this call. Null on a dry run. */
	forgetBatchId: string | null
	summary: string
	/** Present on a dry run: what would be forgotten. */
	candidates?: ForgetMatchingMemory[]
	/** Present on apply: what was forgotten. */
	forgotten?: ForgetMatchingMemory[]
}

/**
 * Mass-forgets memories via `POST /v4/memories/forget-matching`.
 *
 * With `query`, the service semantically searches the container and an LLM
 * picks the memories genuinely about the target; with `ids`, it forgets exactly
 * those. Applying a `query` re-runs the match, so to delete precisely what a
 * dry run showed, pass that preview's ids back as `ids`.
 */
export async function forgetMatchingRequest(
	apiKey: string,
	params: ForgetMatchingParams,
	baseUrl: string = DEFAULT_BASE_URL,
): Promise<ForgetMatchingResponse> {
	const response = await fetch(`${baseUrl}/v4/memories/forget-matching`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify(params),
	})

	if (!response.ok) {
		const errorText = await response.text().catch(() => "Unknown error")
		throw new Error(
			`Supermemory forget matching failed: ${response.status} ${response.statusText}. ${errorText}`,
		)
	}

	return await response.json()
}
