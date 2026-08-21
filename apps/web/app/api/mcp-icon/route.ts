import { type NextRequest, NextResponse } from "next/server"
import iconDomains from "@/lib/mcp-icon-domains.json"

const DOMAIN_RE =
	/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
const MAX_ICON_BYTES = 256 * 1024

const ALLOWED_DOMAINS = new Set(iconDomains.domains)

export async function GET(request: NextRequest) {
	const domain = request.nextUrl.searchParams
		.get("domain")
		?.trim()
		.toLowerCase()
	if (!domain || !DOMAIN_RE.test(domain) || !ALLOWED_DOMAINS.has(domain)) {
		return new NextResponse(null, { status: 400 })
	}

	const response = await fetch(
		`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
		{ next: { revalidate: 60 * 60 * 24 * 7 } },
	)
	const contentType = response.headers.get("content-type") ?? ""
	if (!response.ok || !contentType.startsWith("image/")) {
		return new NextResponse(null, { status: 404 })
	}
	const contentLength = Number(response.headers.get("content-length") ?? 0)
	if (contentLength > MAX_ICON_BYTES) {
		return new NextResponse(null, { status: 413 })
	}
	if (!response.body) return new NextResponse(null, { status: 404 })
	const reader = response.body.getReader()
	const chunks: Uint8Array[] = []
	let bytes = 0
	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		bytes += value.byteLength
		if (bytes > MAX_ICON_BYTES) {
			await reader.cancel()
			return new NextResponse(null, { status: 413 })
		}
		chunks.push(value)
	}
	const body = new Uint8Array(bytes)
	let offset = 0
	for (const chunk of chunks) {
		body.set(chunk, offset)
		offset += chunk.byteLength
	}
	return new NextResponse(body, {
		headers: {
			"cache-control":
				"public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
			"content-type": contentType,
		},
	})
}
