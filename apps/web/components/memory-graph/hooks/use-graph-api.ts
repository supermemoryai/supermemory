"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"
import { $fetch } from "@lib/api"
import type {
	GraphApiDocument,
	GraphApiMemory,
	MemoryRelation,
} from "@supermemory/memory-graph"

const PAGE_SIZE = 500

interface UseGraphApiOptions {
	containerTags?: string[]
	documentIds?: string[]
	enabled?: boolean
	maxNodes?: number
}

export interface ApiMemoryEntry {
	id: string
	memory: string
	content?: string | null
	spaceId: string
	isStatic?: boolean
	isLatest?: boolean
	isForgotten?: boolean
	forgetAfter?: string | null
	forgetReason?: string | null
	version?: number
	parentMemoryId?: string | null
	rootMemoryId?: string | null
	createdAt: string
	updatedAt: string
	relation?: MemoryRelation | null
	updatesMemoryId?: string | null
	nextVersionId?: string | null
	memoryRelations?: Record<string, MemoryRelation> | null
	spaceContainerTag?: string | null
}

export interface ApiDocument {
	id: string
	title: string | null
	summary?: string | null
	type: string
	createdAt: string
	updatedAt: string
	memoryEntries: ApiMemoryEntry[]
}

export interface ApiDocumentsResponse {
	documents: ApiDocument[]
	pagination: {
		currentPage: number
		limit: number
		totalItems: number
		totalPages: number
	}
}

function toGraphMemory(mem: ApiMemoryEntry): GraphApiMemory {
	return {
		id: mem.id,
		memory: mem.memory ?? mem.content ?? "",
		isStatic: mem.isStatic ?? false,
		spaceId: mem.spaceId ?? "",
		isLatest: mem.isLatest ?? true,
		isForgotten: mem.isForgotten ?? false,
		forgetAfter: mem.forgetAfter ?? null,
		forgetReason: mem.forgetReason ?? null,
		version: mem.version ?? 1,
		parentMemoryId: mem.parentMemoryId ?? null,
		rootMemoryId: mem.rootMemoryId ?? null,
		createdAt: mem.createdAt,
		updatedAt: mem.updatedAt,
		relation: mem.relation ?? null,
		updatesMemoryId: mem.updatesMemoryId ?? null,
		nextVersionId: mem.nextVersionId ?? null,
		memoryRelations: mem.memoryRelations ?? null,
		spaceContainerTag: mem.spaceContainerTag ?? null,
	}
}

function toGraphDocument(
	doc: ApiDocument,
	containerTags?: string[],
): GraphApiDocument {
	const allowedContainerTags = new Set(containerTags?.filter(Boolean) ?? [])
	const memoryEntries =
		allowedContainerTags.size > 0
			? doc.memoryEntries.filter(
					(mem) =>
						mem.spaceContainerTag != null &&
						allowedContainerTags.has(mem.spaceContainerTag),
				)
			: doc.memoryEntries

	return {
		id: doc.id,
		title: doc.title,
		summary: doc.summary ?? null,
		documentType: doc.type,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
		memories: memoryEntries.map(toGraphMemory),
	}
}

function normalizeGraphPages(
	pages: readonly ApiDocumentsResponse[],
	containerTags?: string[],
): GraphApiDocument[] {
	// Keep the first document and per-document memory occurrence canonical, but
	// merge later unique memories. The same memory may still belong to many docs.
	const documentsById = new Map<
		string,
		{ document: GraphApiDocument; memoryIds: Set<string> }
	>()

	for (const page of pages) {
		for (const apiDocument of page.documents ?? []) {
			const graphDocument = toGraphDocument(apiDocument, containerTags)
			const existing = documentsById.get(graphDocument.id)

			if (!existing) {
				const memoryIds = new Set<string>()
				const memories = graphDocument.memories.filter((memory) => {
					if (memoryIds.has(memory.id)) return false
					memoryIds.add(memory.id)
					return true
				})
				documentsById.set(graphDocument.id, {
					document: { ...graphDocument, memories },
					memoryIds,
				})
				continue
			}

			for (const memory of graphDocument.memories) {
				if (existing.memoryIds.has(memory.id)) continue
				existing.memoryIds.add(memory.id)
				existing.document.memories.push(memory)
			}
		}
	}

	return Array.from(documentsById.values(), ({ document }) => document)
}

function getGraphNodeCount(documents: readonly GraphApiDocument[]): number {
	const memoryIds = new Set<string>()
	for (const document of documents) {
		for (const memory of document.memories) memoryIds.add(memory.id)
	}
	return documents.length + memoryIds.size
}

export function getLoadedGraphNodeCount(
	pages: readonly ApiDocumentsResponse[],
	containerTags?: string[],
): number {
	return getGraphNodeCount(normalizeGraphPages(pages, containerTags))
}

export function getNextGraphPageParam(
	lastPage: ApiDocumentsResponse,
	allPages: readonly ApiDocumentsResponse[],
	options: {
		hasDocumentIds: boolean
		maxNodes?: number
		containerTags?: string[]
	},
): number | undefined {
	if (options.hasDocumentIds) return undefined
	if (
		options.maxNodes != null &&
		getLoadedGraphNodeCount(allPages, options.containerTags) >= options.maxNodes
	) {
		return undefined
	}

	const { currentPage, totalPages } = lastPage.pagination
	return currentPage < totalPages ? currentPage + 1 : undefined
}

export function useGraphApi(options: UseGraphApiOptions = {}) {
	const { containerTags, documentIds, enabled = true, maxNodes } = options
	const filteredDocumentIds = documentIds?.filter(Boolean)
	const hasDocumentIds =
		filteredDocumentIds != null && filteredDocumentIds.length > 0

	const {
		data,
		error,
		isPending,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteQuery<ApiDocumentsResponse, Error>({
		queryKey: [
			"documents-with-memories",
			containerTags,
			[],
			filteredDocumentIds,
			maxNodes,
		],
		initialPageParam: 1,
		queryFn: async ({ pageParam }) => {
			const response = hasDocumentIds
				? await $fetch("@post/documents/documents/by-ids", {
						body: {
							ids: filteredDocumentIds,
							by: "id",
							containerTags,
						},
						disableValidation: true,
					})
				: await $fetch("@post/documents/documents", {
						body: {
							page: pageParam as number,
							limit: PAGE_SIZE,
							sort: "createdAt",
							order: "desc",
							containerTags,
						},
						disableValidation: true,
					})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to fetch documents")
			}

			return response.data as unknown as ApiDocumentsResponse
		},
		getNextPageParam: (lastPage, allPages) =>
			getNextGraphPageParam(lastPage, allPages, {
				hasDocumentIds,
				maxNodes,
				containerTags,
			}),
		staleTime: 5 * 60 * 1000,
		enabled,
	})

	const documents = useMemo(() => {
		if (!data?.pages) return []
		return normalizeGraphPages(data.pages, containerTags)
	}, [data, containerTags])

	const loadedNodeCount = useMemo(
		() => getGraphNodeCount(documents),
		[documents],
	)

	useEffect(() => {
		if (!enabled || hasDocumentIds) return
		if (!hasNextPage || isFetchingNextPage) return
		if (maxNodes != null && loadedNodeCount >= maxNodes) return
		fetchNextPage()
	}, [
		enabled,
		hasDocumentIds,
		hasNextPage,
		isFetchingNextPage,
		loadedNodeCount,
		maxNodes,
		fetchNextPage,
	])

	const totalCount = data?.pages[0]?.pagination.totalItems ?? 0

	return {
		documents,
		isLoading: isPending,
		isLoadingMore: isFetchingNextPage,
		error: error ?? null,
		hasMore: hasNextPage ?? false,
		loadMore: fetchNextPage,
		totalCount,
	}
}
