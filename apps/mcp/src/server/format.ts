import type {
	DocumentDetails,
	DocumentsListResponse,
	MemoryEntriesResponse,
} from "./client"

const MAX_LIST_FIELD_CHARS = 500
const MAX_DOCUMENT_CONTENT_CHARS = 200_000

function compactText(value: string, maxChars = MAX_LIST_FIELD_CHARS): string {
	const text = value.replace(/\s+/g, " ").trim()
	return text.length > maxChars
		? `${text.slice(0, maxChars)} ... [truncated]`
		: text
}

function day(value: string | null | undefined): string {
	return value?.slice(0, 10) ?? ""
}

function paginationSummary(
	currentPage: number,
	totalPages: number,
	totalItems: number,
	singularItemName: string,
	pluralItemName: string,
): string {
	const itemName = totalItems === 1 ? singularItemName : pluralItemName
	return `page ${currentPage} of ${totalPages}, ${totalItems} ${itemName} total`
}

export function formatDocumentsList(response: DocumentsListResponse): string {
	const { documents, pagination } = response

	if (documents.length === 0) {
		return pagination.currentPage > 1
			? `No documents on page ${pagination.currentPage} (${pagination.totalPages} page${pagination.totalPages === 1 ? "" : "s"} total).`
			: "No documents stored yet."
	}

	const blocks = documents.map((document) => {
		const title = document.title?.trim() || "(untitled)"
		const lines = [
			`- [${document.id}] "${title}" (${document.type}, ${document.status}, ${day(document.createdAt)})`,
		]
		if (document.summary?.trim()) {
			lines.push(`  Summary: ${compactText(document.summary)}`)
		}
		return lines.join("\n")
	})

	const parts = [
		`${documents.length} document${documents.length === 1 ? "" : "s"} (${paginationSummary(
			pagination.currentPage,
			pagination.totalPages,
			pagination.totalItems,
			"document",
			"documents",
		)}), newest first.`,
		"",
		blocks.join("\n\n"),
		"",
		"Use getDocument with a document ID to read its content.",
	]

	if (pagination.currentPage < pagination.totalPages) {
		parts.push(
			`More available - call listDocuments with page: ${pagination.currentPage + 1}.`,
		)
	}

	return parts.join("\n")
}

export function formatMemoryEntriesList(
	response: MemoryEntriesResponse,
): string {
	const { memoryEntries, pagination } = response
	const activeEntries = memoryEntries.filter(
		(entry) => entry.isForgotten !== true && entry.isLatest !== false,
	)

	if (activeEntries.length === 0) {
		return pagination.currentPage > 1
			? `No active memories on page ${pagination.currentPage} (${pagination.totalPages} page${pagination.totalPages === 1 ? "" : "s"} total).`
			: "No active memories stored yet."
	}

	const blocks = activeEntries.map((entry) => {
		const lines = [`- [${entry.id}] ${compactText(entry.memory)}`]
		const details = [
			`version ${entry.version}`,
			`updated ${day(entry.updatedAt)}`,
		]
		if (entry.history && entry.history.length > 0) {
			details.push(
				`${entry.history.length} previous ${
					entry.history.length === 1 ? "version" : "versions"
				}`,
			)
		}
		lines.push(`  ${details.join(" | ")}`)
		if (entry.documentIds && entry.documentIds.length > 0) {
			lines.push(`  Source documents: ${entry.documentIds.join(", ")}`)
		}
		return lines.join("\n")
	})

	const parts = [
		`${activeEntries.length} active memor${activeEntries.length === 1 ? "y" : "ies"} (${paginationSummary(
			pagination.currentPage,
			pagination.totalPages,
			pagination.totalItems,
			"memory entry",
			"memory entries",
		)}), newest first.`,
		"",
		blocks.join("\n\n"),
	]

	if (pagination.currentPage < pagination.totalPages) {
		parts.push(
			"",
			`More available - call listMemories with page: ${pagination.currentPage + 1}.`,
		)
	}

	return parts.join("\n")
}

export function getDocumentContent(document: DocumentDetails): {
	content: string | null
	truncated: boolean
} {
	let content: string | null = null
	if (typeof document.raw === "string" && document.raw.trim()) {
		content = document.raw
	} else if (document.raw !== null && document.raw !== undefined) {
		content = JSON.stringify(document.raw, null, 2)
	} else if (document.content?.trim()) {
		content = document.content
	}

	if (!content) return { content: null, truncated: false }
	const truncated = content.length > MAX_DOCUMENT_CONTENT_CHARS
	return {
		content: truncated ? content.slice(0, MAX_DOCUMENT_CONTENT_CHARS) : content,
		truncated,
	}
}

export function formatDocument(document: DocumentDetails): string {
	const title = document.title?.trim() || "(untitled)"
	const parts = [
		`# ${title}`,
		`Document ID: ${document.id}`,
		`Type: ${document.type}`,
		`Status: ${document.status}`,
		`Created: ${document.createdAt}`,
		`Updated: ${document.updatedAt}`,
	]

	if (document.url) parts.push(`URL: ${document.url}`)
	if (document.summary?.trim()) {
		parts.push("", "## Summary", compactText(document.summary, 4_000))
	}

	const { content, truncated } = getDocumentContent(document)
	if (content) {
		parts.push(
			"",
			"## Content",
			truncated ? `${content}\n\n[Document content truncated]` : content,
		)
	} else {
		parts.push("", "No document content is available.")
	}

	return parts.join("\n")
}
