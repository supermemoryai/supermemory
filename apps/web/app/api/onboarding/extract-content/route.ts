export interface ExaContentResult {
	url: string
	text: string
	title: string
	author?: string
}

interface ExaApiResponse {
	results: ExaContentResult[]
}

const exaApiKey = process.env.EXA_API_KEY
if (!exaApiKey) {
	console.error(
		"EXA_API_KEY is not configured; /api/onboarding/extract-content will return 503",
	)
}

export async function POST(request: Request) {
	try {
		if (!exaApiKey) {
			return Response.json(
				{ error: "Content extraction is unavailable" },
				{ status: 503 },
			)
		}

		const { urls } = await request.json()

		if (!Array.isArray(urls) || urls.length === 0) {
			return Response.json(
				{ error: "Invalid input: urls must be a non-empty array" },
				{ status: 400 },
			)
		}

		// Bound the batch: this endpoint spends paid Exa quota per URL, so an
		// unbounded array turns it into a cost-amplification relay.
		const MAX_URLS = 10
		if (urls.length > MAX_URLS) {
			return Response.json(
				{ error: `Invalid input: at most ${MAX_URLS} urls per request` },
				{ status: 400 },
			)
		}

		if (
			!urls.every(
				(url) =>
					typeof url === "string" &&
					url.trim().length > 0 &&
					url.length <= 2048 &&
					/^https?:\/\//i.test(url.trim()),
			)
		) {
			return Response.json(
				{
					error:
						"Invalid input: all urls must be http(s) strings of at most 2048 characters",
				},
				{ status: 400 },
			)
		}

		const response = await fetch("https://api.exa.ai/contents", {
			method: "POST",
			headers: {
				"x-api-key": exaApiKey,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				urls,
				text: true,
				livecrawl: "fallback",
			}),
		})

		if (!response.ok) {
			console.error(
				"Exa API request failed:",
				response.status,
				response.statusText,
			)
			return Response.json(
				{ error: "Failed to fetch content from Exa API" },
				{ status: 500 },
			)
		}

		const data: ExaApiResponse = await response.json()
		return Response.json({ results: data.results })
	} catch (error) {
		console.error("Exa API request error:", error)
		return Response.json({ error: "Internal server error" }, { status: 500 })
	}
}
