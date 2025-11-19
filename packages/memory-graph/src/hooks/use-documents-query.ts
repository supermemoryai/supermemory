"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchDocuments, type FetchDocumentsOptions } from "@/lib/api-client";
import type { DocumentsResponse } from "@/api-types";

export interface UseDocumentsQueryOptions {
	apiKey: string;
	baseUrl?: string;
	id?: string; // Optional document ID to filter by
	containerTags?: string[];
	limit?: number;
	sort?: "createdAt" | "updatedAt";
	order?: "asc" | "desc";
	enabled?: boolean; // Whether to enable the query
}

/**
 * Hook for fetching a single page of documents
 * Useful when you don't need pagination
 */
export function useDocumentsQuery(options: UseDocumentsQueryOptions) {
	const {
		apiKey,
		baseUrl,
		containerTags,
		limit = 50,
		sort = "createdAt",
		order = "desc",
		enabled = true,
	} = options;

	return useQuery({
		queryKey: ["documents", { apiKey, baseUrl, containerTags, limit, sort, order }],
		queryFn: async () => {
			return fetchDocuments({
				apiKey,
				baseUrl,
				page: 1,
				limit,
				sort,
				order,
				containerTags,
			});
		},
		enabled: enabled && !!apiKey,
		staleTime: 1000 * 60 * 5, // 5 minutes
		retry: 2,
	});
}

/**
 * Hook for fetching documents with infinite scroll/pagination support
 * Automatically handles loading more pages
 */
export function useInfiniteDocumentsQuery(options: UseDocumentsQueryOptions) {
	const {
		apiKey,
		baseUrl,
		containerTags,
		limit = 500,
		sort = "createdAt",
		order = "desc",
		enabled = true,
	} = options;

	return useInfiniteQuery({
		queryKey: ["documents", "infinite", { apiKey, baseUrl, containerTags, limit, sort, order }],
		queryFn: async ({ pageParam = 1 }) => {
			return fetchDocuments({
				apiKey,
				baseUrl,
				page: pageParam,
				limit,
				sort,
				order,
				containerTags,
			});
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage: DocumentsResponse) => {
			const { currentPage, totalPages } = lastPage.pagination;
			return currentPage < totalPages ? currentPage + 1 : undefined;
		},
		enabled: enabled && !!apiKey,
		staleTime: 1000 * 60 * 5, // 5 minutes
		retry: 2,
	});
}

/**
 * Helper to flatten infinite query results into a single documents array
 */
export function flattenDocuments(data: { pages: DocumentsResponse[] } | undefined) {
	if (!data?.pages) return [];
	return data.pages.flatMap((page) => page.documents);
}

/**
 * Helper to get total documents count from infinite query
 */
export function getTotalDocuments(data: { pages: DocumentsResponse[] } | undefined) {
	if (!data?.pages?.[0]) return 0;
	return data.pages[0].pagination.totalItems;
}

/**
 * Helper to get current loaded count from infinite query
 */
export function getLoadedCount(data: { pages: DocumentsResponse[] } | undefined) {
	if (!data?.pages) return 0;
	return data.pages.reduce((sum, page) => sum + page.documents.length, 0);
}
