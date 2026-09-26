import { NextResponse } from "next/server"

const SUPERMEMORY_API_BASE_URL = "https://api.supermemory.ai"

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const {
			apiKey,
			page = 1,
			limit = 500,
			sort = "createdAt",
			order = "desc",
			containerTags,
		} = body

		if (!apiKey) {
			return NextResponse.json(
				{ error: "API key is required" },
				{ status: 400 },
			)
		}

		const requestBody = {
			page,
			limit,
			sort,
			order,
			...(Array.isArray(containerTags) && containerTags.length > 0
				? { containerTags }
				: {}),
		}

		const headers = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		}

		// Primary: documents with memories for rich graph rendering.
		// Fallback: POST /v3/documents/list (see #1672) — self-hosted
		// servers (e.g. supermemory-server 0.0.8) return 404 for
		// /v3/documents/documents, so normalize { memories } to { documents }.
		async function postDocuments(path: string) {
			const url = new URL(path, SUPERMEMORY_API_BASE_URL)
			return fetch(url, {
				method: "POST",
				headers,
				body: JSON.stringify(requestBody),
			})
		}

		let response = await postDocuments("/v3/documents/documents")

		if (response.status === 404) {
			response = await postDocuments("/v3/documents/list")
		}

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}))
			return NextResponse.json(
				{ error: errorData.message || `API error: ${response.status}` },
				{ status: response.status },
			)
		}

		const data = await response.json()

		// Normalize POST /v3/documents/list ({ memories }) to the graph
		// shape ({ documents }) so the UI works against both cloud and
		// self-hosted servers.
		if (Array.isArray((data as { documents?: unknown })?.documents)) {
			return NextResponse.json(data)
		}

		const memories = (data as { memories?: Array<Record<string, unknown>> })
			?.memories
		if (Array.isArray(memories)) {
			return NextResponse.json({
				documents: memories.map((mem) => ({
					id: mem.id,
					title: mem.title ?? null,
					summary: mem.summary ?? null,
					documentType: (mem.type as string | undefined) ?? "unknown",
					type: (mem.type as string | undefined) ?? "unknown",
					containerTags: mem.containerTags ?? [],
					createdAt: mem.createdAt,
					updatedAt: mem.updatedAt,
					memories: [],
					memoryEntries: [],
				})),
				pagination: (data as { pagination?: unknown }).pagination ?? {
					currentPage: page,
					limit,
					totalItems: memories.length,
					totalPages: 1,
				},
			})
		}

		return NextResponse.json(data)
	} catch (error) {
		console.error("Graph API error:", error)
		return NextResponse.json(
			{ error: "Failed to fetch documents" },
			{ status: 500 },
		)
	}
}
