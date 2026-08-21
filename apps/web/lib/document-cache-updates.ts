/**
 * Pure helpers for optimistically updating the cached
 * `documents-with-memories` query data (both the infinite `{ pages }` shape and
 * the flat `{ documents }` shape).
 *
 * `pagination.totalItems` is the grand total repeated on every page, and
 * consumers read it from page 0 (see `use-graph-api.ts`), so a delete must
 * decrement the total by the number of documents actually removed across all
 * pages — not just the ones that happened to sit on a given page.
 */

export interface DocumentWithId {
	id?: string
	customId?: string | null
}

export interface OptimisticMemory {
	id: string
	content: string
	url: string | null
	title: string
	description: string
	containerTags: string[]
	createdAt: string
	updatedAt: string
	status: string
	type: string
	metadata: Record<string, unknown>
	memoryEntries: unknown[]
	isOptimistic?: boolean
}

export function addOptimisticMemoryToQueryData(
	old: unknown,
	memory: OptimisticMemory,
): unknown {
	if (!old || typeof old !== "object") return old

	const data = old as Record<string, unknown>

	if ("pages" in data && Array.isArray(data.pages)) {
		return {
			...data,
			pages: data.pages.map((page: unknown, index: number) => {
				if (index !== 0) return page
				const p = page as Record<string, unknown>
				if (!p?.documents || !Array.isArray(p.documents)) return page
				return {
					...p,
					documents: [memory, ...p.documents],
					pagination: p.pagination
						? {
								...(p.pagination as Record<string, unknown>),
								totalItems:
									((p.pagination as Record<string, number>).totalItems ?? 0) +
									1,
							}
						: p.pagination,
				}
			}),
		}
	}

	if ("documents" in data && Array.isArray(data.documents)) {
		return {
			...data,
			documents: [memory, ...data.documents],
			totalCount: ((data.totalCount as number) ?? 0) + 1,
		}
	}

	return old
}

export function removeDocumentFromQueryData(
	old: unknown,
	documentId: string,
): unknown {
	if (!old || typeof old !== "object") return old

	const data = old as Record<string, unknown>

	if ("pages" in data && Array.isArray(data.pages)) {
		return {
			...data,
			pages: data.pages.map((page: unknown) => {
				const p = page as Record<string, unknown>
				if (!p?.documents || !Array.isArray(p.documents)) return page
				return {
					...p,
					documents: (p.documents as DocumentWithId[]).filter(
						(doc) => doc.id !== documentId && doc.customId !== documentId,
					),
					pagination: p.pagination
						? {
								...(p.pagination as Record<string, unknown>),
								totalItems: Math.max(
									0,
									((p.pagination as Record<string, number>).totalItems ?? 0) -
										1,
								),
							}
						: p.pagination,
				}
			}),
		}
	}

	if ("documents" in data && Array.isArray(data.documents)) {
		return {
			...data,
			documents: (data.documents as DocumentWithId[]).filter(
				(doc) => doc.id !== documentId && doc.customId !== documentId,
			),
			totalCount: Math.max(0, ((data.totalCount as number) ?? 0) - 1),
		}
	}

	return old
}

export function removeDocumentsFromQueryData(
	old: unknown,
	documentIds: Set<string>,
): unknown {
	if (!old || typeof old !== "object" || documentIds.size === 0) return old

	const data = old as Record<string, unknown>

	if ("pages" in data && Array.isArray(data.pages)) {
		// Filter every page first and tally how many documents were actually
		// removed across all of them, then subtract that single total from each
		// page's (grand-total) `totalItems`. Decrementing only by each page's own
		// removals left page 0 — the one consumers read — too high whenever the
		// deleted documents lived on later pages.
		let totalRemoved = 0
		const filteredPages = data.pages.map((page: unknown) => {
			const p = page as Record<string, unknown>
			if (!p?.documents || !Array.isArray(p.documents)) {
				return { page, hasDocuments: false as const }
			}
			const kept = (p.documents as DocumentWithId[]).filter(
				(doc) =>
					!documentIds.has(doc.id ?? "") &&
					!documentIds.has(doc.customId ?? ""),
			)
			totalRemoved += (p.documents as DocumentWithId[]).length - kept.length
			return { page: p, documents: kept, hasDocuments: true as const }
		})

		return {
			...data,
			pages: filteredPages.map((entry) => {
				if (!entry.hasDocuments) return entry.page
				const p = entry.page as Record<string, unknown>
				return {
					...p,
					documents: entry.documents,
					pagination: p.pagination
						? {
								...(p.pagination as Record<string, unknown>),
								totalItems: Math.max(
									0,
									((p.pagination as Record<string, number>).totalItems ?? 0) -
										totalRemoved,
								),
							}
						: p.pagination,
				}
			}),
		}
	}

	if ("documents" in data && Array.isArray(data.documents)) {
		const filtered = (data.documents as DocumentWithId[]).filter(
			(doc) =>
				!documentIds.has(doc.id ?? "") && !documentIds.has(doc.customId ?? ""),
		)
		const removed =
			(data.documents as DocumentWithId[]).length - filtered.length
		return {
			...data,
			documents: filtered,
			totalCount: Math.max(0, ((data.totalCount as number) ?? 0) - removed),
		}
	}

	return old
}
