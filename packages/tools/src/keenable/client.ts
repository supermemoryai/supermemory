import { KeenableError } from "./types"
import type {
	KeenableFetchParams,
	KeenableFetchResponse,
	KeenableSearchParams,
	KeenableSearchResponse,
	KeenableToolsConfig,
} from "./types"

export const KEENABLE_DEFAULT_BASE_URL = "https://api.keenable.ai"
export const KEENABLE_DEFAULT_APP_TITLE = "supermemory-tools"

function trimSlash(value: string): string {
	return value.replace(/\/+$/, "")
}

function resolveConfig(config: KeenableToolsConfig = {}) {
	const apiKey = config.apiKey?.trim() || process.env.KEENABLE_API_KEY?.trim()
	const baseUrl = trimSlash(
		config.baseUrl?.trim() ||
			process.env.KEENABLE_BASE_URL?.trim() ||
			KEENABLE_DEFAULT_BASE_URL,
	)
	const appTitle =
		config.appTitle?.trim() ||
		process.env.KEENABLE_TITLE?.trim() ||
		KEENABLE_DEFAULT_APP_TITLE
	const fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis)

	return { apiKey, baseUrl, appTitle, fetchFn }
}

function headers(
	apiKey: string | undefined,
	appTitle: string,
	json: boolean,
): Record<string, string> {
	const result: Record<string, string> = {}
	if (json) result["Content-Type"] = "application/json"
	if (apiKey) {
		result["X-API-Key"] = apiKey
	} else {
		result["X-Keenable-Title"] = appTitle
	}
	return result
}

async function readErrorBody(response: Response): Promise<string> {
	try {
		return (await response.text()).slice(0, 500)
	} catch {
		return ""
	}
}

export function createKeenableClient(config: KeenableToolsConfig = {}) {
	const { apiKey, baseUrl, appTitle, fetchFn } = resolveConfig(config)
	const searchPath = apiKey ? "/v1/search" : "/v1/search/public"
	const fetchPath = apiKey ? "/v1/fetch" : "/v1/fetch/public"

	async function request(
		method: "GET" | "POST",
		path: string,
		body?: Record<string, unknown>,
	): Promise<unknown> {
		const response = await fetchFn(`${baseUrl}${path}`, {
			method,
			headers: headers(apiKey, appTitle, method === "POST"),
			...(body ? { body: JSON.stringify(body) } : {}),
		})

		if (!response.ok) {
			const bodyText = await readErrorBody(response)
			throw new KeenableError(
				`Keenable ${method} ${path} failed (${response.status})${bodyText ? `: ${bodyText}` : ""}`,
				response.status,
				bodyText,
			)
		}

		return response.json()
	}

	return {
		async search(
			params: KeenableSearchParams,
		): Promise<KeenableSearchResponse> {
			const payload: Record<string, unknown> = { query: params.query }
			if (params.site) payload.site = params.site
			if (params.publishedAfter) payload.published_after = params.publishedAfter
			if (params.publishedBefore)
				payload.published_before = params.publishedBefore
			if (params.acquiredAfter) payload.acquired_after = params.acquiredAfter
			if (params.acquiredBefore) payload.acquired_before = params.acquiredBefore
			if (params.queryTime) payload.query_time = params.queryTime
			if (params.maxResults !== undefined)
				payload.max_results = params.maxResults
			if (params.snippetMaxLength !== undefined) {
				payload.snippet_max_length = params.snippetMaxLength
			}
			if (params.mode) payload.mode = params.mode

			return (await request(
				"POST",
				searchPath,
				payload,
			)) as KeenableSearchResponse
		},

		async fetchPage(
			params: KeenableFetchParams,
		): Promise<KeenableFetchResponse> {
			const query = new URLSearchParams({ url: params.url })
			if (params.maxChars !== undefined) {
				query.set("max_chars", String(params.maxChars))
			}
			if (params.live !== false) query.set("live", "true")
			if (params.prompt) query.set("prompt", params.prompt)

			return (await request(
				"GET",
				`${fetchPath}?${query.toString()}`,
			)) as KeenableFetchResponse
		},
	}
}

export type KeenableClient = ReturnType<typeof createKeenableClient>
