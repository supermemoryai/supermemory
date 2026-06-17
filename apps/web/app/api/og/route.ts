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
		lowerHost === "0.0.0.0" ||
		lowerHost === "::1" ||
		lowerHost === "::" ||
		lowerHost.startsWith("127.") ||
		lowerHost.startsWith("0.0.0.0")
	) {
		return true
	}

	const privateIpPatterns = [
		/^10\./,
		/^172\.(1[6-9]|2[0-9]|3[01])\./,
		/^192\.168\./,
		/^169\.254\./, // Link-local / Metadata service
	]

	return privateIpPatterns.some((pattern) => pattern.test(hostname))
}

// File extensions that are not HTML and can't be scraped for OG data
const NON_HTML_EXTENSIONS = [
	".pdf",
	".doc",
	".docx",
	".xls",
	".xlsx",
	".ppt",
	".pptx",
	".zip",
	".rar",
	".7z",
	".tar",
	".gz",
	".mp3",
	".mp4",
	".avi",
	".mov",
	".wmv",
	".flv",
	".webm",
	".wav",
	".ogg",
	".jpg",
	".jpeg",
	".png",
	".gif",
	".webp",
	".svg",
	".ico",
	".bmp",
	".tiff",
	".exe",
	".dmg",
	".iso",
	".bin",
]

function isNonHtmlUrl(url: string): boolean {
	try {
		const urlObj = new URL(url)
		const pathname = urlObj.pathname.toLowerCase()
		return NON_HTML_EXTENSIONS.some((ext) => pathname.endsWith(ext))
	} catch {
		return false
	}
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
	return ""
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

		// Skip OG scraping for non-HTML files (PDFs, images, etc.)
		if (isNonHtmlUrl(trimmedUrl)) {
			return Response.json(
				{ title: "", description: "" },
				{
					headers: {
						"Cache-Control":
							"public, s-maxage=3600, stale-while-revalidate=86400",
					},
				},
			)
		}

		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 8000)

		try {
			const response = await fetch(trimmedUrl, {
				signal: controller.signal,
				redirect: "manual",
				headers: {
					"User-Agent":
						"Mozilla/5.0 (compatible; SuperMemory/1.0; +https://supermemory.ai)",
				},
			})

			if (response.status >= 300 && response.status < 400) {
				const location = response.headers.get("location")
				if (location) {
					const redirectUrl = new URL(location, trimmedUrl).href
					if (
						!isValidUrl(redirectUrl) ||
						isPrivateHost(new URL(redirectUrl).hostname)
					) {
						return Response.json(
							{ error: "Invalid or private redirect URL" },
							{ status: 400 },
						)
					}
					// For simplicity, we only follow one level of redirect manually to re-validate IP
					const secondResponse = await fetch(redirectUrl, {
						signal: controller.signal,
						redirect: "error", // No more redirects allowed
						headers: {
							"User-Agent":
								"Mozilla/5.0 (compatible; SuperMemory/1.0; +https://supermemory.ai)",
						},
					})
					if (!secondResponse.ok) {
						return Response.json(
							{ error: "Failed to fetch redirect URL" },
							{ status: secondResponse.status },
						)
					}
					const contentType = secondResponse.headers.get("content-type")
					if (contentType && !contentType.includes("text/html")) {
						return Response.json({ title: "", description: "" })
					}
					const html = await secondResponse.text()
					return processHtml(html, redirectUrl)
				}
			}

			if (!response.ok) {
				return Response.json(
					{ error: "Failed to fetch URL" },
					{ status: response.status },
				)
			}

			const contentType = response.headers.get("content-type")
			if (contentType && !contentType.includes("text/html")) {
				return Response.json({ title: "", description: "" })
			}

			const html = await response.text()
			return processHtml(html, trimmedUrl)
		} finally {
			clearTimeout(timeoutId)
		}
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return Response.json({ error: "Request timeout" }, { status: 504 })
		}
		console.error("OG route error:", error)
		return Response.json({ error: "Internal server error" }, { status: 500 })
	}
}

function processHtml(html: string, baseUrl: string) {
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
	const resolvedImageUrl = resolveImageUrl(imageUrl, baseUrl)

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
}
