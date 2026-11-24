import type { GraphApiDocument, GraphPage } from "./api-types"
import { graphPageToDocuments } from "./graph-page"

export type { GraphApiDocument }

export interface FetchMemoryGraphOptions {
	apiKey: string
	namespace: string
	baseUrl?: string
	limit?: number
}

export class MemoryGraphError extends Error {
	readonly status: number

	constructor(status: number, message: string) {
		super(message)
		this.name = "MemoryGraphError"
		this.status = status
	}
}

const MAX_PAGES = 20

function apiErrorMessage(error: unknown): string | undefined {
	if (typeof error === "string") return error
	if (!Array.isArray(error)) return undefined
	const messages = error
		.map((issue) => (issue as { message?: unknown } | null)?.message)
		.filter((message): message is string => typeof message === "string")
	return messages.length > 0 ? messages.join("; ") : undefined
}

// Follows nextCursor up to MAX_PAGES so one browser request gets the whole graph without seeing the API key.
export async function fetchMemoryGraph({
	apiKey,
	namespace,
	baseUrl = "https://api.supermemory.ai",
	limit = 100,
}: FetchMemoryGraphOptions): Promise<GraphApiDocument[]> {
	const nodes: GraphPage["nodes"] = []
	const edges: GraphPage["edges"] = []
	let cursor: string | null = null
	for (let page = 0; page < MAX_PAGES; page++) {
		const url = new URL(`/ns/${encodeURIComponent(namespace)}/graph`, baseUrl)
		url.searchParams.set("limit", String(limit))
		if (cursor) url.searchParams.set("cursor", cursor)
		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: "{}",
		})
		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as {
				error?: unknown
			} | null
			throw new MemoryGraphError(
				response.status,
				apiErrorMessage(body?.error) ??
					`Memory graph request failed with ${response.status}`,
			)
		}
		const graphPage = (await response.json()) as GraphPage
		nodes.push(...graphPage.nodes)
		edges.push(...graphPage.edges)
		cursor = graphPage.nextCursor
		if (!cursor) break
	}
	return graphPageToDocuments({ nodes, edges, nextCursor: null })
}
