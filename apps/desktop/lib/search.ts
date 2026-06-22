"use client"

import { getAuthToken } from "@lib/token-provider"

const DEFAULT_API_URL = "https://api.supermemory.ai"

export type SearchResult = {
	documentId: string
	title: string | null
	summary?: string | null
	content?: string | null
	createdAt: string | Date
	updatedAt: string | Date
	type: string | null
	score: number
	chunks: Array<{
		content: string
		isRelevant: boolean
		score: number
	}>
}

type SearchResponse = {
	results: SearchResult[]
	total: number
	timing: number
}

function apiUrl() {
	return process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_API_URL
}

export async function searchMemories(query: string) {
	const token = await getAuthToken()
	if (!token) {
		throw new Error("No stored desktop token")
	}

	const response = await fetch(`${apiUrl().replace(/\/$/, "")}/v3/search`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"X-App-Source": "desktop",
		},
		body: JSON.stringify({
			q: query,
			limit: 10,
			includeSummary: true,
		}),
	})

	if (!response.ok) {
		const body = await response.text()
		throw new Error(`Search failed (${response.status}): ${body}`)
	}

	return (await response.json()) as SearchResponse
}
