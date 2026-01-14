import ogs from "open-graph-scraper"

export const runtime = "nodejs"

interface OGResponse {
	title: string
	description: string
	image?: string
}

function isValidUrl(urlString: string): boolean {
	try {
		const url = new URL(urlString)
		return url.protocol === "http:" || url.protocol === "https:"
	} catch {
		return false
	}
}

function isPrivateHost(hostname: string): boolean {
	const lowerHost = hostname.toLowerCase()

	// Block localhost variants
	if (
		lowerHost === "localhost" ||
		lowerHost === "127.0.0.1" ||
		lowerHost === "::1" ||
		lowerHost.startsWith("127.") ||
		lowerHost.startsWith("0.0.0.0")
	) {
		return true
	}

	// Block RFC 1918 private IP ranges
	const privateIpPatterns = [
		/^10\./,
		/^172\.(1[6-9]|2[0-9]|3[01])\./,
		/^192\.168\./,
	]

	return privateIpPatterns.some((pattern) => pattern.test(hostname))
}

function extractImageUrl(image: unknown): string | undefined {
	if (!image) return undefined

	if (typeof image === "string") {
		return image
	}

	if (Array.isArray(image) && image.length > 0) {
		const first = image[0]
		if (first && typeof first === "object" && "url" in first) {
			return String(first.url)
		}
	}

	if (typeof image === "object" && image !== null && "url" in image) {
		return String(image.url)
	}

	return undefined
}

function resolveImageUrl(
	imageUrl: string | undefined,
	baseUrl: string,
): string | undefined {
	if (!imageUrl) return undefined

	try {
		const url = new URL(imageUrl)
		return url.href
	} catch {
		try {
			const base = new URL(baseUrl)
			return new URL(imageUrl, base.href).href
		} catch {
			return undefined
		}
	}
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const url = searchParams.get("url")

		if (!url || !url.trim()) {
			return Response.json(
				{ error: "Missing or invalid url parameter" },
				{ status: 400 },
			)
		}

		const trimmedUrl = url.trim()

		if (!isValidUrl(trimmedUrl)) {
			return Response.json(
				{ error: "Invalid URL. Must be http:// or https://" },
				{ status: 400 },
			)
		}

		const urlObj = new URL(trimmedUrl)
		if (isPrivateHost(urlObj.hostname)) {
			return Response.json(
				{ error: "Private/localhost URLs are not allowed" },
				{ status: 400 },
			)
		}

		const { result, error } = await ogs({
			url: trimmedUrl,
			timeout: 8000,
			fetchOptions: {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (compatible; SuperMemory/1.0; +https://supermemory.ai)",
				},
			},
		})

		if (error || !result) {
			console.error("OG scraping error:", error)
			return Response.json(
				{ error: "Failed to fetch Open Graph data" },
				{ status: 500 },
			)
		}

		const ogTitle = result.ogTitle || result.twitterTitle || ""
		const ogDescription =
			result.ogDescription || result.twitterDescription || ""

		const ogImageUrl =
			extractImageUrl(result.ogImage) || extractImageUrl(result.twitterImage)

		const resolvedImageUrl = resolveImageUrl(ogImageUrl, trimmedUrl)

		const response: OGResponse = {
			title: ogTitle,
			description: ogDescription,
			...(resolvedImageUrl && { image: resolvedImageUrl }),
		}

		return Response.json(response, {
			headers: {
				"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
			},
		})
	} catch (error) {
		console.error("OG route error:", error)
		return Response.json({ error: "Internal server error" }, { status: 500 })
	}
}
