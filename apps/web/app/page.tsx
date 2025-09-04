"use client";

import { useAuth } from "@lib/auth-context";
import { $fetch } from "@repo/lib/api";
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import { AppHeader } from "@/components/header";
import { MemoryListView } from "@/components/memory-list-view";
import { InstallPrompt } from "@/components/install-prompt";
import { AddMemoryView } from "@/components/views/add-memory";
import { useProject } from "@/stores";

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>;
type DocumentWithMemories = DocumentsResponse["documents"][0];

const MemoryAppPage = () => {
	const { selectedProject } = useProject();
	const [injectedDocs, setInjectedDocs] = useState<DocumentWithMemories[]>([]);
	const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);

	// Fetch projects meta to detect experimental flag
	const { data: projectsMeta = [] } = useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const response = await $fetch("@get/projects");
			return response.data?.projects ?? [];
		},
		staleTime: 5 * 60 * 1000,
	});

	const isCurrentProjectExperimental = !!projectsMeta.find(
		(p: { containerTag: string; isExperimental?: boolean }) => p.containerTag === selectedProject,
	)?.isExperimental;

	// Progressive loading via useInfiniteQuery
	const IS_DEV = process.env.NODE_ENV === "development";
	const PAGE_SIZE = IS_DEV ? 100 : 100;
	const MAX_TOTAL = 1000;

	const {
		data,
		error,
		isPending,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteQuery<DocumentsResponse, Error>({
		queryKey: ["documents-with-memories", selectedProject],
		initialPageParam: 1,
		queryFn: async ({ pageParam }) => {
			const response = await $fetch("@post/memories/documents", {
				body: {
					page: pageParam as number,
					limit: (pageParam as number) === 1 ? (IS_DEV ? 500 : 500) : PAGE_SIZE,
					sort: "createdAt",
					order: "desc",
					containerTags: selectedProject ? [selectedProject] : undefined,
				},
				disableValidation: true,
			});

			if (response.error) {
				throw new Error(response.error?.message || "Failed to fetch documents");
			}

			return response.data;
		},
		getNextPageParam: (lastPage, allPages) => {
			const loaded = allPages.reduce(
				(acc, p) => acc + (p.documents?.length ?? 0),
				0,
			);
			if (loaded >= MAX_TOTAL) return undefined;

			const { currentPage, totalPages } = lastPage.pagination;
			if (currentPage < totalPages) {
				return currentPage + 1;
			}
			return undefined;
		},
		staleTime: 5 * 60 * 1000,
	});

	const baseDocuments = useMemo(() => {
		return (
			data?.pages.flatMap((p: DocumentsResponse) => p.documents ?? []) ?? []
		);
	}, [data]);

	const allDocuments = useMemo(() => {
		if (injectedDocs.length === 0) return baseDocuments;
		const byId = new Map<string, DocumentWithMemories>();
		for (const d of injectedDocs) byId.set(d.id, d);
		for (const d of baseDocuments) if (!byId.has(d.id)) byId.set(d.id, d);
		return Array.from(byId.values());
	}, [baseDocuments, injectedDocs]);

	const totalLoaded = allDocuments.length;
	const hasMore = hasNextPage;
	const isLoadingMore = isFetchingNextPage;

	const loadMoreDocuments = useCallback(async (): Promise<void> => {
		if (hasNextPage && !isFetchingNextPage) {
			await fetchNextPage();
			return;
		}
		return;
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	// Reset injected docs when project changes
	useEffect(() => {
		setInjectedDocs([]);
	}, [selectedProject]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'c' && !['INPUT', 'TEXTAREA'].includes((event.target as Element)?.tagName)) {
				event.preventDefault();
				setShowAddMemoryModal(true);
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);

	useEffect(() => {
		document.body.style.overflow = "auto";
		document.body.style.height = "auto";
		document.documentElement.style.overflow = "auto";
		document.documentElement.style.height = "auto";

		return () => {
			document.body.style.overflow = "";
			document.body.style.height = "";
			document.documentElement.style.overflow = "";
			document.documentElement.style.height = "";
		};
	}, []);

	return (
		<div className="font-sans">
			<AppHeader />
			
			<MemoryListView
				documents={allDocuments}
				error={error}
				hasMore={hasMore}
				isLoading={isPending}
				isLoadingMore={isLoadingMore}
				totalLoaded={totalLoaded}
				loadMoreDocuments={loadMoreDocuments}
				isCurrentProjectExperimental={isCurrentProjectExperimental}
			/>

			{showAddMemoryModal && (
				<AddMemoryView
					initialTab="note"
					onClose={() => setShowAddMemoryModal(false)}
				/>
			)}
		</div>
	);
};

// Wrapper component to handle auth
export default function Page() {
	const { user } = useAuth();

	// Show loading state while checking authentication
	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-4">
					<LoaderIcon className="w-8 h-8 text-orange-500 animate-spin" />
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<MemoryAppPage />
			<InstallPrompt />
		</>
	);
}
