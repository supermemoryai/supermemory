"use client"

import { getAuthToken } from "@lib/token-provider"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"

const DEFAULT_API_URL = "https://api.supermemory.ai"

export type DocumentsResponse = z.infer<
	typeof DocumentsWithMemoriesResponseSchema
>
export type DocumentWithMemories = DocumentsResponse["documents"][number]

function apiUrl() {
	return process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_API_URL
}

async function desktopFetch<T>(path: string, init: RequestInit = {}) {
	const token = await getAuthToken()
	if (!token) {
		throw new Error("No stored desktop token")
	}

	const response = await fetch(`${apiUrl().replace(/\/$/, "")}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"X-App-Source": "desktop",
			...init.headers,
		},
	})

	if (!response.ok) {
		const body = await response.text()
		throw new Error(`Request failed (${response.status}): ${body}`)
	}

	return (await response.json()) as T
}

export function listDocuments() {
	return desktopFetch<DocumentsResponse>("/v3/documents/documents", {
		method: "POST",
		body: JSON.stringify({
			page: 1,
			limit: 24,
			sort: "createdAt",
			order: "desc",
		}),
	})
}
