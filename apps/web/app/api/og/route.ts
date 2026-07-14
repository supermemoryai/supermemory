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

function isPrivateIPv4Octets(a: number, b: number): boolean {
	// 0.0.0.0/8, 10/8, 100.64/10 (CGNAT), 127/8 (loopback),
	// 169.254/16 (link-local / cloud metadata), 172.16/12, 192.168/16
	if (a === 0) return true
	if (a === 10) return true
	if (a === 127) return true
	if (a === 169 && b === 254) return true
	if (a === 172 && b >= 16 && b <= 31) return true
	if (a === 192 && b === 168) return true
	if (a === 100 && b >= 64 && b <= 127) return true
	return false
}

// Parse an IPv6 hostname into its eight 16-bit groups. The WHATWG URL parser
// already canonicalizes literals, but it leaves the brackets on (e.g. "[::1]")
// and performs no SSRF filtering. Handles "::" compression and embedded IPv4
// suffixes (e.g. ::ffff:1.2.3.4). Returns null when not an IPv6 literal.
function parseIPv6Groups(input: string): number[] | null {
	let host = input
	if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1)
	const zone = host.indexOf("%") // strip scope/zone id, e.g. fe80::1%eth0
	if (zone !== -1) host = host.slice(0, zone)
	if (!host.includes(":")) return null

	// Convert an embedded IPv4 tail (e.g. ::ffff:1.2.3.4) into two hex groups.
	const dot = host.indexOf(".")
	if (dot !== -1) {
		const colon = host.lastIndexOf(":", dot)
		if (colon === -1) return null
		const octets = host.slice(colon + 1).split(".")
		if (octets.length !== 4) return null
		const bytes: number[] = []
		for (const octet of octets) {
			if (!/^\d{1,3}$/.test(octet)) return null
			const n = Number(octet)
			if (n > 255) return null
			bytes.push(n)
		}
		const hi = (((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0)).toString(16)
		const lo = (((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0)).toString(16)
		host = `${host.slice(0, colon + 1)}${hi}:${lo}`
	}

	const parseSide = (side: string): number[] | null => {
		if (side === "") return []
		const groups: number[] = []
		for (const group of side.split(":")) {
			if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null
			groups.push(Number.parseInt(group, 16))
		}
		return groups
	}

	const halves = host.split("::")
	if (halves.length > 2) return null

	if (halves.length === 2) {
		const head = parseSide(halves[0] ?? "")
		const tail = parseSide(halves[1] ?? "")
		if (!head || !tail) return null
		const missing = 8 - head.length - tail.length
		if (missing < 1) return null
		return [...head, ...new Array<number>(missing).fill(0), ...tail]
	}

	const all = parseSide(host)
	if (all?.length !== 8) return null
	return all
}

function isPrivateIPv6(input: string): boolean {
	const g = parseIPv6Groups(input)
	if (!g) return false

	// Unspecified (::) and loopback (::1)
	if (g.every((x) => x === 0)) return true
	if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true

	// Link-local fe80::/10
	if (((g[0] ?? 0) & 0xffc0) === 0xfe80) return true

	// Unique local address fc00::/7 (fc00–fdff)
	if ((((g[0] ?? 0) >> 8) & 0xfe) === 0xfc) return true

	// IPv4-mapped (::ffff:a.b.c.d) and deprecated IPv4-compatible (::a.b.c.d):
	// re-check the embedded IPv4 against the private ranges so loopback/metadata
	// can't be reached via an IPv6 wrapper.
	const firstFiveZero = g.slice(0, 5).every((x) => x === 0)
	const ipv4Mapped = firstFiveZero && g[5] === 0xffff
	const ipv4Compatible =
		firstFiveZero && g[5] === 0 && (g[6] !== 0 || g[7] !== 0)
	if (ipv4Mapped || ipv4Compatible) {
		const a = ((g[6] ?? 0) >> 8) & 0xff
		const b = (g[6] ?? 0) & 0xff
		return isPrivateIPv4Octets(a, b)
	}

	return false
}

// NOTE: This blocks private/loopback/metadata IP *literals* only. It cannot stop
// DNS rebinding (a public hostname that resolves to a private address), which
// would require resolving + pinning the address before connecting — not available
// in the edge fetch runtime here.
function isPrivateHost(hostname: string): boolean {
	const lowerHost = hostname.toLowerCase()

	// Hostname-based loopback (RFC 6761 reserves localhost and *.localhost)
	if (lowerHost === "localhost" || lowerHost.endsWith(".localhost")) {
		return true
	}

	// IPv6 literals arrive bracketed (e.g. "[::1]"), so the previous
	// string-equality checks never matched them.
	if (lowerHost.includes(":")) {
		return isPrivateIPv6(lowerHost)
	}

	// IPv4. The WHATWG URL parser canonicalizes alternate encodings
	// (decimal/hex/octal, e.g. http://2130706433 -> 127.0.0.1) to dotted-quad,
	// so matching the dotted form here also blocks those encodings.
	const octets = lowerHost.split(".")
	if (
		octets.length === 4 &&
		octets.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255)
	) {
		const [a, b] = octets.map(Number) as [number, number, number, number]
		return isPrivateIPv4Octets(a, b)
	}

	return false
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
