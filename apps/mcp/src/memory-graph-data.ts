import type { DocumentWithMemories, DocumentsApiResponse } from "./client"

export const GRAPH_PAGE_LIMIT = 10

export interface MemoryGraphStructuredContent {
	containerTag?: string
	documents: DocumentWithMemories[]
	totalCount: number
	loadedCount: number
	pagination: DocumentsApiResponse["pagination"]
}

export function createMemoryGraphStructuredContent(
	result: DocumentsApiResponse,
	containerTag?: string,
): MemoryGraphStructuredContent {
	return {
		containerTag,
		documents: result.documents,
		totalCount: result.pagination.totalItems,
		loadedCount: result.documents.length,
		pagination: result.pagination,
	}
}

export function summarizeMemoryGraphResult(
	result: DocumentsApiResponse,
	containerTag?: string,
): string {
	let memoryCount = 0
	for (const document of result.documents) {
		memoryCount += document.memoryEntries.length
	}

	const textParts = [
		`Memory Graph: showing ${result.documents.length} of ${result.pagination.totalItems} documents, ${memoryCount} loaded memories`,
	]
	if (result.pagination.totalPages > result.pagination.currentPage) {
		textParts.push(
			`More documents available (${result.pagination.totalPages} pages total)`,
		)
	}
	if (containerTag) {
		textParts.push(`Project: ${containerTag}`)
	}

	return textParts.join(". ")
}
