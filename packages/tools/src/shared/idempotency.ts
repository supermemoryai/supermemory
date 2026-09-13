/**
 * Idempotency — Phase A (SDK-only, V1 + Staff improvements)
 *
 * Generates a stable `Idempotency-Key` for memory writes so retries
 * (network retry, caller retry, offline queue) do not create duplicates.
 * The header is optional for the backend in Phase A — useful even before
 * the server honors it as a dedupe key.
 *
 * Key = SHA-256( normalizedContent + '|' + sorted(containerTags).join(',') + '|' + minuteBucket )
 * minuteBucket = floor(now / 60000) — stable within the same minute, rotates after.
 * normalizedContent = content.normalize("NFC").trim() — unicode + whitespace stable.
 *
 * Why SHA-256?
 * - Deterministic across runtimes (browser, Node, Workers).
 * - Available through Web Crypto in browsers, Node, and Workers.
 * - Fixed-size output suitable for HTTP headers.
 * - No additional dependency required.
 *
 * Runtime availability: Web Crypto (`crypto.subtle`) is available in browsers,
 * Cloudflare Workers, and Node 20+ (repo `engines.node >=20`). Verified via
 * `globalThis.crypto.subtle.digest` — no polyfill needed. All three `addMemory`
 * entry points (`ai-sdk`, `openai/tools`, `supermemory` client) use the same path.
 *
 * Header forwarding: Supermemory client's `client.add(params, { headers })`
 * and `client.documents.add(params, { headers })` forward `RequestOptions.headers`
 * into the underlying `fetch` call (see `supermemory` `client.mjs` `RequestOptions.headers`
 * → `fetchWithTimeout`). This is how `Idempotency-Key` reaches the backend.
 *
 * Metadata scope: `content` + `containerTags` define identity; `metadata`
 * (title/description) is intentionally excluded — identical content+tags within
 * the same minute produce the same key (desired for dedupe). Callers needing
 * metadata-distinct keys should pass `customIdempotencyKey`.
 */

function normalizeContent(content: string): string {
	return content.normalize("NFC").trim()
}

export async function generateIdempotencyKey(
	content: string,
	containerTags: string[] = [],
	now: number = Date.now(),
	customKey?: string,
): Promise<string> {
	if (customKey !== undefined && customKey.length > 0) {
		return customKey
	}
	const minuteBucket = Math.floor(now / 60_000)
	const tags = [...containerTags].sort().join(",")
	const normalized = normalizeContent(content)
	const input = `${normalized}|${tags}|${minuteBucket}`
	const bytes = new TextEncoder().encode(input)
	const digest = await crypto.subtle.digest("SHA-256", bytes)
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

export async function buildIdempotencyHeaders(
	content: string,
	containerTags: string[] = [],
	now: number = Date.now(),
	customKey?: string,
): Promise<Record<string, string>> {
	const key = await generateIdempotencyKey(
		content,
		containerTags,
		now,
		customKey,
	)
	return { "Idempotency-Key": key }
}

export type RetryContext = {
	key: string
	headers: Record<string, string>
	getKey: () => string
	getHeaders: () => Record<string, string>
}

/**
 * Future-proof retry helper — captures the key once and reuses it
 * across retries, even across minute rollovers.
 *
 *   const retryCtx = await createRetryContext(content, containerTags)
 *   await client.add(params, { headers: retryCtx.headers })
 *   await client.add(params, { headers: retryCtx.headers }) // same key
 */
export async function createRetryContext(
	content: string,
	containerTags: string[] = [],
	now: number = Date.now(),
	customKey?: string,
): Promise<RetryContext> {
	const key = await generateIdempotencyKey(
		content,
		containerTags,
		now,
		customKey,
	)
	const headers = { "Idempotency-Key": key }
	return {
		key,
		headers,
		getKey: () => key,
		getHeaders: () => headers,
	}
}
