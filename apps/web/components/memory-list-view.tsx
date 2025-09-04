"use client";

import { useIsMobile } from "@hooks/use-mobile";
import { cn } from "@lib/utils";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader } from "@repo/ui/components/card";
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	Brain,
	ExternalLink,
	Sparkles,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import useResizeObserver from "@/hooks/use-resize-observer";
import { analytics } from "@/lib/analytics";

import { MemoryDetail } from "./memories/memory-detail";
import { getDocumentIcon } from "@/lib/document-icon";
import { formatDate, getSourceUrl } from "./memories";
import { ChatInline } from "./chat-inline";
import { GraphPreview } from "./graph-preview";

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>;
type DocumentWithMemories = DocumentsResponse["documents"][0];

interface MemoryListViewProps {
	children?: React.ReactNode;
	documents: DocumentWithMemories[];
	isLoading: boolean;
	isLoadingMore: boolean;
	error: Error | null;
	totalLoaded: number;
	hasMore: boolean;
	loadMoreDocuments: () => Promise<void>;
	isCurrentProjectExperimental?: boolean;
}

const DocumentCard = memo(
	({
		document,
		onOpenDetails,
	}: {
		document: DocumentWithMemories;
		onOpenDetails: (document: DocumentWithMemories) => void;
	}) => {
		const activeMemories = document.memoryEntries.filter((m) => !m.isForgotten);
		const forgottenMemories = document.memoryEntries.filter(
			(m) => m.isForgotten,
		);

		return (
			<Card
				className="h-full mx-4 p-4 transition-all cursor-pointer group relative overflow-hidden bg-card shadow-lg gap-2 md:w-full hover:shadow-xl"
				onClick={() => {
					analytics.documentCardClicked();
					onOpenDetails(document);
				}}
			>
				<CardHeader className="relative z-10 px-0">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-1">
							{/*{getDocumentIcon(document.type, "w-4 h-4 flex-shrink-0")}*/}
							<p
								className={cn(
									"text-sm font-medium line-clamp-1",
									document.url ? "max-w-[190px]" : "max-w-[200px]",
								)}
							>
								{document.title || "Untitled Document"}
							</p>
						</div>
						{document.url && (
							<button
								className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-muted/50 text-muted-foreground hover:bg-muted/80"
								onClick={(e) => {
									e.stopPropagation();
									const sourceUrl = getSourceUrl(document);
									window.open(sourceUrl ?? undefined, "_blank");
								}}
								type="button"
							>
								<ExternalLink className="w-3 h-3" />
							</button>
						)}
						<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
							<span>{formatDate(document.createdAt)}</span>
						</div>
					</div>
				</CardHeader>
				<CardContent className="relative z-10 px-0">
					{document.content && (
						<p
							className="text-xs line-clamp-2 mb-3 text-muted-foreground"
						>
							{document.content}
						</p>
					)}
					<div className="flex items-center gap-2 flex-wrap">
						{activeMemories.length > 0 && (
							<Badge
								className="text-xs"
								variant="secondary"
							>
								<Brain className="w-3 h-3 mr-1" />
								{activeMemories.length}{" "}
								{activeMemories.length === 1 ? "memory" : "memories"}
							</Badge>
						)}
						{forgottenMemories.length > 0 && (
							<Badge
								className="text-xs text-muted-foreground border-muted"
								variant="outline"
							>
								{forgottenMemories.length} forgotten
							</Badge>
						)}
					</div>
				</CardContent>
			</Card>
		);
	},
);

export const MemoryListView = ({
	children,
	documents,
	isLoading,
	isLoadingMore,
	error,
	hasMore,
	loadMoreDocuments,
	isCurrentProjectExperimental = false,
}: MemoryListViewProps) => {
	const [selectedSpace, _] = useState<string>("all");
	const [selectedDocument, setSelectedDocument] =
		useState<DocumentWithMemories | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const parentRef = useRef<HTMLDivElement>(null);
	const isMobile = useIsMobile();

	const gap = 14;

	const { width: containerWidth } = useResizeObserver(containerRef);
	const columnWidth = isMobile ? containerWidth : 320;
	const columns = Math.max(
		1,
		Math.floor((containerWidth + gap) / (columnWidth + gap)),
	);

	// Filter documents based on selected space
	const filteredDocuments = useMemo(() => {
		if (!documents) return [];

		if (selectedSpace === "all") {
			return documents;
		}

		return documents
			.map((doc) => ({
				...doc,
				memoryEntries: doc.memoryEntries.filter(
					(memory) =>
						(memory.spaceContainerTag ?? memory.spaceId) === selectedSpace,
				),
			}))
			.filter((doc) => doc.memoryEntries.length > 0);
	}, [documents, selectedSpace]);

	const handleOpenDetails = useCallback((document: DocumentWithMemories) => {
		analytics.memoryDetailOpened();
		setSelectedDocument(document);
		setIsDetailOpen(true);
	}, []);

	const handleCloseDetails = useCallback(() => {
		setIsDetailOpen(false);
		setTimeout(() => setSelectedDocument(null), 300);
	}, []);

	const virtualItems = useMemo(() => {
		const items = [];
		for (let i = 0; i < filteredDocuments.length; i += columns) {
			items.push(filteredDocuments.slice(i, i + columns));
		}
		return items;
	}, [filteredDocuments, columns]);

	const virtualizer = useVirtualizer({
		count: virtualItems.length,
		getScrollElement: () => parentRef.current,
		overscan: 5,
		estimateSize: () => 200,
	});


	useEffect(() => {
		const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

		if (!lastItem || !hasMore || isLoadingMore) {
			return;
		}

		if (lastItem.index >= virtualItems.length - 1) {
			loadMoreDocuments();
		}
	}, [
		hasMore,
		isLoadingMore,
		loadMoreDocuments,
		virtualizer.getVirtualItems(),
		virtualItems.length,
	]);

	// Always render with consistent structure
	return (
		<>
			<div
				className="min-h-screen flex flex-col"
				ref={containerRef}
			>
				{error ? (
					<div className="flex items-center justify-center p-4 min-h-screen">
						<div className="rounded-xl overflow-hidden">
							<div
								className="relative z-10 px-6 py-4 text-foreground"
							>
								Error loading documents: {error.message}
							</div>
						</div>
					</div>
				) : isLoading ? (
					<div className="flex items-center justify-center p-4 min-h-screen">
						<div className="rounded-xl overflow-hidden">
							<div
								className="relative z-10 px-6 py-4 text-foreground"
							>
								<div className="flex items-center gap-2">
									<Sparkles className="w-4 h-4 animate-spin text-blue-400" />
									<span>Loading memory list...</span>
								</div>
							</div>
						</div>
					</div>
				) : filteredDocuments.length === 0 && !isLoading ? (
					<div className="flex flex-col min-h-screen">
						<div className="p-6 pb-8">
							{isMobile ? (
								<>
									<div className="mb-6">
										<ChatInline />
									</div>
									<div className="mb-6 hidden sm:block">
										<GraphPreview
											documents={documents}
											error={error}
											hasMore={hasMore}
											isLoading={isLoading}
											isLoadingMore={isLoadingMore}
											totalLoaded={documents.length}
											loadMoreDocuments={loadMoreDocuments}
											isCurrentProjectExperimental={
												isCurrentProjectExperimental
											}
										/>
									</div>
								</>
							) : (
								<div className="mb-6 flex gap-6">
									<div className="w-2/3">
										<ChatInline />
									</div>
									<div className="w-1/3">
										<GraphPreview
											documents={documents}
											error={error}
											hasMore={hasMore}
											isLoading={isLoading}
											isLoadingMore={isLoadingMore}
											totalLoaded={documents.length}
											loadMoreDocuments={loadMoreDocuments}
											isCurrentProjectExperimental={
												isCurrentProjectExperimental
											}
										/>
									</div>
								</div>
							)}
						</div>
						<div className="flex-1 flex items-center justify-center p-4">
							{children}
						</div>
					</div>
				) : (
					<>
						<div className="p-6 pb-8 min-h-[48vh]">
							{isMobile ? (
								<>
									<div className="mb-6">
										<ChatInline />
									</div>
									<div className="mb-6 hidden sm:block">
										<GraphPreview
											documents={documents}
											error={error}
											hasMore={hasMore}
											isLoading={isLoading}
											isLoadingMore={isLoadingMore}
											totalLoaded={documents.length}
											loadMoreDocuments={loadMoreDocuments}
											isCurrentProjectExperimental={
												isCurrentProjectExperimental
											}
										/>
									</div>
								</>
							) : (
								<div className="flex gap-6 h-[48vh]">
									<div className="w-2/3">
										<ChatInline />
									</div>
									<div className="w-1/3">
										<GraphPreview
											documents={documents}
											error={error}
											hasMore={hasMore}
											isLoading={isLoading}
											isLoadingMore={isLoadingMore}
											totalLoaded={documents.length}
											loadMoreDocuments={loadMoreDocuments}
											isCurrentProjectExperimental={
												isCurrentProjectExperimental
											}
										/>
									</div>
								</div>
							)}
						</div>

						<div className="px-10 py-2">
							<p className="font-medium text-lg">All Memories</p>
						</div>

						<div ref={parentRef} className="flex-1 overflow-auto pt-2">
							<div
								className="w-full relative"
								style={{
									height: `${virtualizer.getTotalSize() + virtualItems.length * gap}px`,
								}}
							>
								{virtualizer.getVirtualItems().map((virtualRow) => {
									const rowItems = virtualItems[virtualRow.index];
									if (!rowItems) return null;

									return (
										<div
											key={virtualRow.key}
											data-index={virtualRow.index}
											ref={virtualizer.measureElement}
											className="absolute top-0 left-0 w-full"
											style={{
												transform: `translateY(${virtualRow.start + virtualRow.index * gap}px)`,
											}}
										>
											<div
												className="grid justify-start px-4"
												style={{
													gridTemplateColumns: `repeat(${columns}, ${columnWidth}px)`,
													gap: `${gap}px`,
												}}
											>
												{rowItems.map((document, columnIndex) => (
													<DocumentCard
														key={`${document.id}-${virtualRow.index}-${columnIndex}`}
														document={document}
														onOpenDetails={handleOpenDetails}
													/>
												))}
											</div>
										</div>
									);
								})}
							</div>

							{isLoadingMore && (
								<div className="py-8 flex items-center justify-center">
									<div className="flex items-center gap-2">
										<Sparkles className="w-4 h-4 animate-spin text-blue-400" />
										<span className="text-foreground">
											Loading more memories...
										</span>
									</div>
								</div>
							)}
						</div>
					</>
				)}
			</div>

			<MemoryDetail
				document={selectedDocument}
				isOpen={isDetailOpen}
				onClose={handleCloseDetails}
				isMobile={isMobile}
			/>
		</>
	);
};
