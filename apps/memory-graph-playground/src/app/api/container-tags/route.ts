import { NextResponse } from "next/server"

const SUPERMEMORY_API_BASE_URL = "https://api.supermemory.ai"

export async function POST(request: Request) {
	try {
		const { apiKey } = await request.json()

		if (!apiKey) {
			return NextResponse.json(
				{ error: "API key is required" },
				{ status: 400 },
			)
		}

		const containerTagsUrl = new URL(
			"/v3/container-tags/list",
			SUPERMEMORY_API_BASE_URL,
		)

		const response = await fetch(containerTagsUrl, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
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
		console.error("Container tags API error:", error)
		return NextResponse.json(
			{ error: "Failed to fetch container tags" },
			{ status: 500 },
		)
	}
}
