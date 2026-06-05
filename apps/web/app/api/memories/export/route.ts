import { NextResponse } from "next/server"
import {
	buildBackendHeaders,
	escapeMarkdown,
	getBackendBaseUrl,
	parseContainerTags,
	parseDateBound,
} from "../_utils"

type ExportDocument = {
	id: string
	customId?: string | null
	content?: string | null
	summary?: string | null
	title?: string | null
	url?: string | null
	source?: string | null
	type?: string | null
	status?: string | null
	metadata?: Record<string, unknown> | null
	containerTags?: string[] | null
	createdAt?: string | Date
	updatedAt?: string | Date
	memoryEntries?: Array<{
		id?: string
		memory?: string
		isStatic?: boolean
		createdAt?: string | Date
	}>
}

type DocumentsResponse = {
	documents?: ExportDocument[]
	pagination?: {
		currentPage?: number
		totalPages?: number
		totalItems?: number
		limit?: number
	}
}

async function fetchDocumentsPage(
	request: Request,
	page: number,
	limit: number,
	containerTags: string[],
) {
	const response = await fetch(
		`${getBackendBaseUrl()}/v3/documents/documents`,
		{
			method: "POST",
			headers: buildBackendHeaders(request),
			body: JSON.stringify({
				page,
				limit,
				order: "asc",
				sort: "createdAt",
				...(containerTags.length > 0 ? { containerTags } : {}),
			}),
		},
	)

	if (!response.ok) {
		const message = await response.text()
		throw new Error(message || `Export failed with status ${response.status}`)
	}

	return (await response.json()) as DocumentsResponse
}

function buildMarkdownExport(documents: ExportDocument[], exportedAt: string) {
	const lines: string[] = [
		"# supermemory memory export",
		"",
		`- Exported at: ${exportedAt}`,
		`- Memory count: ${documents.length}`,
		"",
	]

	for (const document of documents) {
		const heading = document.title?.trim() || document.customId || document.id
		const createdAt =
			document.createdAt instanceof Date
				? document.createdAt.toISOString()
				: document.createdAt
					? new Date(document.createdAt).toISOString()
					: exportedAt
		const tags = document.containerTags?.length
			? document.containerTags.join(", ")
			: "None"
		const content = (document.content ?? document.summary ?? "").trim()
		const memoryLines = (document.memoryEntries ?? []).map((entry) => {
			const prefix = entry.isStatic ? "static" : "dynamic"
			return `- ${prefix}: ${entry.memory ?? ""}`.trim()
		})

		lines.push(`## ${escapeMarkdown(heading)}`)
		lines.push("")
		lines.push(`- ID: ${document.id}`)
		if (document.customId) lines.push(`- Custom ID: ${document.customId}`)
		lines.push(`- Created: ${createdAt}`)
		if (document.updatedAt) {
			const updatedAt =
				document.updatedAt instanceof Date
					? document.updatedAt.toISOString()
					: new Date(document.updatedAt).toISOString()
			lines.push(`- Updated: ${updatedAt}`)
		}
		lines.push(`- Tags: ${tags}`)
		if (document.type) lines.push(`- Type: ${document.type}`)
		if (document.status) lines.push(`- Status: ${document.status}`)
		if (document.url) lines.push(`- URL: ${document.url}`)
		if (document.source) lines.push(`- Source: ${document.source}`)
		lines.push("")
		lines.push("### Content")
		lines.push("")
		lines.push(content || "No content available.")
		if (memoryLines.length > 0) {
			lines.push("")
			lines.push("### Memories")
			lines.push("")
			lines.push(...memoryLines)
		}
		lines.push("")
		lines.push("---")
		lines.push("")
	}

	return lines.join("\n")
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const format = searchParams.get("format") === "markdown" ? "markdown" : "json"
		const startDateParam = searchParams.get("startDate")
		const endDateParam = searchParams.get("endDate")
		const containerTags = parseContainerTags(searchParams)
		const pageSize = 100

		const startDate = startDateParam ? parseDateBound(startDateParam, "start") : null
		const endDate = endDateParam ? parseDateBound(endDateParam, "end") : null

		if (startDateParam && !startDate) {
			return NextResponse.json({ error: "Invalid startDate" }, { status: 400 })
		}

		if (endDateParam && !endDate) {
			return NextResponse.json({ error: "Invalid endDate" }, { status: 400 })
		}

		const firstPage = await fetchDocumentsPage(request, 1, pageSize, containerTags)
		const documents = [...(firstPage.documents ?? [])]
		const totalPages = firstPage.pagination?.totalPages ?? 1

		for (let page = 2; page <= totalPages; page += 1) {
			const response = await fetchDocumentsPage(request, page, pageSize, containerTags)
			documents.push(...(response.documents ?? []))
		}

		const filteredDocuments = documents.filter((document) => {
			const createdAt = document.createdAt ? new Date(document.createdAt) : null
			if (startDate && (!createdAt || createdAt < startDate)) return false
			if (endDate && (!createdAt || createdAt > endDate)) return false
			return true
		})

		const exportedAt = new Date().toISOString()
		const payload = {
			version: 1,
			exportedAt,
			format,
			filters: {
				containerTags,
				startDate: startDateParam,
				endDate: endDateParam,
			},
			count: filteredDocuments.length,
			documents: filteredDocuments,
		}

		if (format === "markdown") {
			const markdown = buildMarkdownExport(filteredDocuments, exportedAt)
			return new NextResponse(markdown, {
				headers: {
					"Content-Type": "text/markdown; charset=utf-8",
					"Content-Disposition": `attachment; filename="supermemory-export-${exportedAt}.md"`,
				},
			})
		}

		return new NextResponse(JSON.stringify(payload, null, 2), {
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Content-Disposition": `attachment; filename="supermemory-export-${exportedAt}.json"`,
			},
		})
	} catch (error) {
		console.error("Memory export failed:", error)
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to export memories",
			},
			{ status: 500 },
		)
	}
}
