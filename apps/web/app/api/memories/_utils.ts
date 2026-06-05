const BACKEND_BASE_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

export function buildBackendHeaders(request: Request): Headers {
	const headers = new Headers({
		"Content-Type": "application/json",
		"X-App-Source": "nova",
	})

	const cookie = request.headers.get("cookie")
	if (cookie) {
		headers.set("cookie", cookie)
	}

	const authorization = request.headers.get("authorization")
	if (authorization) {
		headers.set("authorization", authorization)
	}

	return headers
}

export function getBackendBaseUrl() {
	return BACKEND_BASE_URL
}

export function chunkArray<T>(items: T[], size: number): T[][] {
	if (size <= 0) return [items]
	const chunks: T[][] = []
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size))
	}
	return chunks
}

export function parseContainerTags(searchParams: URLSearchParams): string[] {
	const values = searchParams.getAll("containerTags")
	if (values.length === 0) return []

	return [...new Set(values.flatMap((value) => value.split(",")))]
		.map((value) => value.trim())
		.filter(Boolean)
}

export function parseDateBound(value: string, bound: "start" | "end") {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return null

	if (!value.includes("T") && bound === "end") {
		date.setUTCHours(23, 59, 59, 999)
	}

	if (!value.includes("T") && bound === "start") {
		date.setUTCHours(0, 0, 0, 0)
	}

	return date
}

export function escapeMarkdown(value: string) {
	return value.replace(/[\\`*_{}\[\]()#+\-.!|>]/g, "\\$&")
}
