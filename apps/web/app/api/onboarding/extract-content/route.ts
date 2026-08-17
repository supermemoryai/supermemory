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

// Each URL becomes a (potentially billed live-crawled) Exa request, so cap the
// batch size to bound cost/abuse from a single call.
const MAX_URLS = 20

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

		if (urls.length > MAX_URLS) {
			return Response.json(
				{ error: `Invalid input: at most ${MAX_URLS} urls are allowed` },
				{ status: 400 },
			)
		}

		// Validate, normalize, and de-duplicate before hitting the paid Exa API.
		const normalizedUrls: string[] = []
		const seen = new Set<string>()
		for (const url of urls) {
			if (typeof url !== "string" || !url.trim()) {
				return Response.json(
					{ error: "Invalid input: all urls must be non-empty strings" },
					{ status: 400 },
				)
			}

			let parsed: URL
			try {
				parsed = new URL(url.trim())
			} catch {
				return Response.json(
					{ error: "Invalid input: all urls must be valid URLs" },
					{ status: 400 },
				)
			}

			if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
				return Response.json(
					{ error: "Invalid input: urls must use http or https" },
					{ status: 400 },
				)
			}

			if (seen.has(parsed.href)) continue
			seen.add(parsed.href)
			normalizedUrls.push(parsed.href)
		}

		const response = await fetch("https://api.exa.ai/contents", {
			method: "POST",
			headers: {
				"x-api-key": exaApiKey,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				urls: normalizedUrls,
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
