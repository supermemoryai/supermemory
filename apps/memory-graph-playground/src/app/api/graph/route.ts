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

		const graphUrl = new URL(
			"/v3/documents/documents",
			SUPERMEMORY_API_BASE_URL,
		)

		const response = await fetch(graphUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				page,
				limit,
				sort,
				order,
				...(Array.isArray(containerTags) && containerTags.length > 0
					? { containerTags }
					: {}),
			}),
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}))
			return NextResponse.json(
				{ error: errorData.message || `API error: ${response.status}` },
				{ status: response.status },
			)
		}

		const data = await response.json()
		return NextResponse.json(data)
	} catch (error) {
		console.error("Graph API error:", error)
		return NextResponse.json(
			{ error: "Failed to fetch documents" },
			{ status: 500 },
		)
	}
}
