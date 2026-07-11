import type { DocumentsApiResponse } from "./client"

// Listing must stay lightweight: memory entries are extracted facts, not raw
// document content, so responses fit client output limits at the max page size.
const MAX_LIST_MEMORY_CHARS = 500

export function formatMemoriesList(response: DocumentsApiResponse): string {
	const { documents, pagination } = response
	const day = (s: string | null | undefined) => s?.slice(0, 10) ?? ""

	if (documents.length === 0) {
		return pagination.currentPage > 1
			? `No documents on page ${pagination.currentPage} (${pagination.totalPages} page${pagination.totalPages === 1 ? "" : "s"} total).`
			: "No memories stored yet."
	}

	let memoryCount = 0
	const blocks = documents.map((doc) => {
		const activeEntries = doc.memoryEntries.filter(
			(entry) => entry.isForgotten !== true && entry.isLatest !== false,
		)
		const title = doc.title?.trim() || "(untitled)"
		const header = `"${title}" (${doc.type}, ${day(doc.createdAt)})`

		if (activeEntries.length === 0) {
			return `${header} - no extracted memories yet`
		}

		memoryCount += activeEntries.length
		const lines = activeEntries.map((entry) => {
			const text = entry.memory.replace(/\s+/g, " ").trim()
			return `- ${
				text.length > MAX_LIST_MEMORY_CHARS
					? `${text.slice(0, MAX_LIST_MEMORY_CHARS)} ... [truncated]`
					: text
			}`
		})
		return [header, ...lines].join("\n")
	})

	const header = `${memoryCount} memor${memoryCount === 1 ? "y" : "ies"} across ${documents.length} document${documents.length === 1 ? "" : "s"} (page ${pagination.currentPage} of ${pagination.totalPages}, ${pagination.totalItems} documents total), newest first.`

	const parts = [header, "", blocks.join("\n\n")]
	if (pagination.currentPage < pagination.totalPages) {
		parts.push(
			"",
			`More available - call listMemories with page: ${pagination.currentPage + 1}.`,
		)
	}
	return parts.join("\n")
}
