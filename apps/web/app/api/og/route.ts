export const runtime = "edge"

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

	if (
		lowerHost === "localhost" ||
		lowerHost === "127.0.0.1" ||
		lowerHost === "::1" ||
		lowerHost.startsWith("127.") ||
		lowerHost.startsWith("0.0.0.0")
	) {
		return true
	}

	const privateIpPatterns = [
		/^10\./,
		/^172\.(1[6-9]|2[0-9]|3[01])\./,
		/^192\.168\./,
	]

	return privateIpPatterns.some((pattern) => pattern.test(hostname))
}

function extractMetaTag(html: string, patterns: RegExp[]): string {
	for (const pattern of patterns) {
		const match = html.match(pattern)
		if (match?.[1]) {
			return match[1]
				.replace(/&amp;/g, "&")
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&quot;/g, '"')
				.replace(/&#039;/g, "'")
				.trim()
		}
	}
	return ""
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

		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 8000)

		const response = await fetch(trimmedUrl, {
			signal: controller.signal,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (compatible; SuperMemory/1.0; +https://supermemory.ai)",
			},
		})

		clearTimeout(timeoutId)

		if (!response.ok) {
			return Response.json(
				{ error: "Failed to fetch URL" },
				{ status: response.status },
			)
		}

		const html = await response.text()

		const titlePatterns = [
			/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
			/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i,
			/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
			/<title>([^<]+)<\/title>/i,
		]

		const descriptionPatterns = [
			/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
			/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i,
			/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
			/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
		]

		const imagePatterns = [
			/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
			/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
			/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
		]

		const title = extractMetaTag(html, titlePatterns)
		const description = extractMetaTag(html, descriptionPatterns)
		const imageUrl = extractMetaTag(html, imagePatterns)
		const resolvedImageUrl = resolveImageUrl(imageUrl, trimmedUrl)

		const ogResponse: OGResponse = {
			title,
			description,
			...(resolvedImageUrl && { image: resolvedImageUrl }),
		}

		return Response.json(ogResponse, {
			headers: {
				"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
			},
		})
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return Response.json({ error: "Request timeout" }, { status: 504 })
		}
		console.error("OG route error:", error)
		return Response.json({ error: "Internal server error" }, { status: 500 })
	}
}
