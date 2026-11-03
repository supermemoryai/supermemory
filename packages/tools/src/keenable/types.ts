export type KeenableSearchMode = "pro" | "realtime"

export interface KeenableToolsConfig {
	/** Keenable API key. Falls back to `KEENABLE_API_KEY`. Omit to use the keyless public endpoints. */
	apiKey?: string
	/** Keenable API origin. Falls back to `KEENABLE_BASE_URL`, then `https://api.keenable.ai`. */
	baseUrl?: string
	/**
	 * App name sent as `X-Keenable-Title` on keyless calls.
	 * Falls back to `KEENABLE_TITLE`, then `supermemory-tools`.
	 */
	appTitle?: string
	/** Override `fetch` (tests). */
	fetch?: (
		input: string | URL | Request,
		init?: RequestInit,
	) => Promise<Response>
}

export interface KeenableSearchParams {
	query: string
	site?: string
	publishedAfter?: string
	publishedBefore?: string
	acquiredAfter?: string
	acquiredBefore?: string
	queryTime?: string
	maxResults?: number
	snippetMaxLength?: number
	mode?: KeenableSearchMode
}

export interface KeenableSearchHit {
	title: string
	url: string
	description?: string
	snippet?: string
	published_at?: string
	acquired_at?: string
}

export interface KeenableSearchResponse {
	query: string
	mode?: KeenableSearchMode
	results: KeenableSearchHit[]
}

export interface KeenableFetchParams {
	url: string
	maxChars?: number
	/**
	 * Fetch the live page instead of Keenable's indexed copy.
	 * Required for URLs Keenable has not indexed. Defaults to `true` so this
	 * replaces Firecrawl-style scrape of arbitrary public URLs.
	 */
	live?: boolean
	/** Extraction instruction (max 2000 chars). When set, `content` is only that output. */
	prompt?: string
}

export interface KeenableFetchResponse {
	url: string
	title?: string
	description?: string
	author?: string
	content: string
	published_at?: number
}

export class KeenableError extends Error {
	readonly status: number
	readonly body: string

	constructor(message: string, status: number, body: string) {
		super(message)
		this.name = "KeenableError"
		this.status = status
		this.body = body
	}
}
