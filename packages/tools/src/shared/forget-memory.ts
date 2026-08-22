const DEFAULT_BASE_URL = "https://api.supermemory.ai"
const FETCH_TIMEOUT_MS = 30_000

export interface ForgetMemoryParams {
	containerTag: string
	id?: string
	content?: string
	reason?: string
}

export interface ForgetMemoryRequestOptions {
	signal?: AbortSignal
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
	options?: ForgetMemoryRequestOptions,
): Promise<void> {
	const response = await fetch(`${baseUrl}/v4/memories`, {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify(params),
		signal: options?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
	})

	if (!response.ok) {
		const errorText = await response.text().catch(() => "Unknown error")
		throw new Error(
			`Supermemory forget memory failed: ${response.status} ${response.statusText}. ${errorText}`,
		)
	}
}
