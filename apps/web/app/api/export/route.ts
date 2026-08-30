import { $fetch } from "@lib/api"
import { hasVerifiedSession } from "@/lib/verify-session"
import { csvEscape } from "./csv"

type ExportFormat = "json" | "md" | "csv"

const MAX_EXPORT_DOCS = 1000
const PAGE_SIZE = 100

interface ExportDocument {
	id: string
	title: string | null
	type: string
	status: string
	url: string | null
	content: string | null
	summary: string | null
	source: string | null
	createdAt: string
	updatedAt: string
	containerTags?: string[]
}

interface DocumentsResponse {
	documents: ExportDocument[]
	pagination: {
		currentPage: number
		limit: number
		totalItems: number
		totalPages: number
	}
}

const VALID_FORMATS = new Set<ExportFormat>(["json", "md", "csv"])

function parseFormat(value: string | null): ExportFormat {
	if (value && VALID_FORMATS.has(value as ExportFormat)) {
		return value as ExportFormat
	}
	return "json"
}

function documentsToCsv(docs: ExportDocument[]): string {
	const header = [
		"id",
		"title",
		"type",
		"status",
		"url",
		"source",
		"createdAt",
		"updatedAt",
		"summary",
	]
	const rows = docs.map((d) =>
		[
			csvEscape(d.id),
			csvEscape(d.title),
			csvEscape(d.type),
			csvEscape(d.status),
			csvEscape(d.url),
			csvEscape(d.source),
			csvEscape(d.createdAt),
			csvEscape(d.updatedAt),
			csvEscape(d.summary),
		].join(","),
	)
	return [header.join(","), ...rows].join("\n")
}

function documentsToMarkdown(docs: ExportDocument[]): string {
	const parts = docs.map((d, i) => {
		const lines = [
			`## ${i + 1}. ${d.title || "Untitled"}`,
			"",
			`- **ID:** ${d.id}`,
			`- **Type:** ${d.type}`,
			`- **Status:** ${d.status}`,
			`- **Created:** ${d.createdAt}`,
			`- **Updated:** ${d.updatedAt}`,
		]
		if (d.url) lines.push(`- **URL:** ${d.url}`)
		if (d.source) lines.push(`- **Source:** ${d.source}`)
		if (d.summary) {
			lines.push("")
			lines.push("### Summary")
			lines.push("")
			lines.push(d.summary)
		}
		if (d.content) {
			lines.push("")
			lines.push("### Content")
			lines.push("")
			lines.push(d.content)
		}
		lines.push("")
		lines.push("---")
		lines.push("")
		return lines.join("\n")
	})
	return `# Supermemory Export\n\n${parts.join("\n")}`
}

export async function GET(request: Request) {
	if (!(await hasVerifiedSession(request))) {
		return Response.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const format = parseFormat(searchParams.get("format"))
	const containerTag = searchParams.get("containerTag")?.trim() || undefined
	const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "", 10)
	const limit =
		Number.isFinite(requestedLimit) && requestedLimit > 0
			? Math.min(requestedLimit, MAX_EXPORT_DOCS)
			: MAX_EXPORT_DOCS

	// Paginate through documents up to the export limit.
	const allDocs: ExportDocument[] = []
	let page = 1
	const cookie = request.headers.get("cookie") ?? ""

	while (allDocs.length < limit) {
		const response = await $fetch("@post/documents/documents", {
			body: {
				page,
				limit: Math.min(PAGE_SIZE, limit - allDocs.length),
				sort: "createdAt",
				order: "desc",
				...(containerTag ? { containerTags: [containerTag] } : {}),
			},
			disableValidation: true,
			headers: cookie ? { cookie } : {},
		})

		if (response.error) {
			return Response.json(
				{ error: response.error?.message || "Failed to fetch documents" },
				{ status: 502 },
			)
		}

		const data = response.data as unknown as DocumentsResponse | null
		if (!data || !data.documents || data.documents.length === 0) break

		allDocs.push(...data.documents)

		if (data.documents.length < PAGE_SIZE) break
		if (page >= data.pagination?.totalPages) break
		page++
	}

	const capped = allDocs.slice(0, limit)

	if (format === "csv") {
		return new Response(documentsToCsv(capped), {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="supermemory-export-${Date.now()}.csv"`,
				"Cache-Control": "no-store",
			},
		})
	}

	if (format === "md") {
		return new Response(documentsToMarkdown(capped), {
			headers: {
				"Content-Type": "text/markdown; charset=utf-8",
				"Content-Disposition": `attachment; filename="supermemory-export-${Date.now()}.md"`,
				"Cache-Control": "no-store",
			},
		})
	}

	return new Response(
		JSON.stringify(
			{
				exportedAt: new Date().toISOString(),
				count: capped.length,
				documents: capped,
			},
			null,
			2,
		),
		{
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Content-Disposition": `attachment; filename="supermemory-export-${Date.now()}.json"`,
				"Cache-Control": "no-store",
			},
		},
	)
}
