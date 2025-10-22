export interface ExaContentResult {
	url: string
	text: string
	title: string
	author?: string
}

interface ExaApiResponse {
	results: ExaContentResult[]
}

/**
 * Fetches content from URLs using the Exa API
 * @param urls Array of URLs to fetch content from
 * @returns Promise resolving to array of content results
 */
export async function fetchContentFromUrls(
	urls: string[],
): Promise<ExaContentResult[]> {
	if (urls.length === 0) {
		return []
	}

	try {
		const response = await fetch("https://api.exa.ai/contents", {
			method: "POST",
			headers: {
				"x-api-key": process.env.EXA_API_KEY ?? "",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				urls,
				text: true,
				livecrawl: "fallback",
			}),
		})

		if (!response.ok) {
			console.warn(
				"Exa API request failed:",
				response.status,
				response.statusText,
			)
			return []
		}

		const data: ExaApiResponse = await response.json()
		return data.results
	} catch (error) {
		console.warn("Exa API request error:", error)
		return []
	}
}
