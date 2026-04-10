"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { $fetch } from "@lib/api"
import type {
	GraphApiDocument,
	GraphApiMemory,
	MemoryRelation,
} from "@supermemory/memory-graph"

const PAGE_SIZE = 100

interface UseGraphApiOptions {
	containerTags?: string[]
	enabled?: boolean
}

interface ApiMemoryEntry {
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

interface ApiDocument {
	id: string
	title: string | null
	summary?: string | null
	type: string
	createdAt: string
	updatedAt: string
	memoryEntries: ApiMemoryEntry[]
}

interface ApiDocumentsResponse {
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

function toGraphDocument(doc: ApiDocument): GraphApiDocument {
	return {
		id: doc.id,
		title: doc.title,
		summary: doc.summary ?? null,
		documentType: doc.type,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
		memories: doc.memoryEntries.map(toGraphMemory),
	}
}

export function useGraphApi(options: UseGraphApiOptions = {}) {
	const { containerTags, enabled = true } = options

	const {
		data,
		error,
		isPending,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteQuery<ApiDocumentsResponse, Error>({
		queryKey: ["documents-with-memories", containerTags, []],
		initialPageParam: 1,
		queryFn: async ({ pageParam }) => {
			const response = await $fetch("@post/documents/documents", {
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
		getNextPageParam: (lastPage) => {
			const { currentPage, totalPages } = lastPage.pagination
			if (currentPage < totalPages) {
				return currentPage + 1
			}
			return undefined
		},
		staleTime: 5 * 60 * 1000,
		enabled,
	})

	const documents = useMemo(() => {
		if (!data?.pages) return []
		return data.pages.flatMap((page) => page.documents.map(toGraphDocument))
	}, [data])

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
