"use client"

import { useIsMobile } from "@hooks/use-mobile"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { colors } from "@repo/ui/memory-graph/constants"
import { Sparkles } from "lucide-react"
import { Masonry, useInfiniteLoader } from "masonic"
import { memo, useCallback, useMemo, useState } from "react"
import type { z } from "zod"
import { analytics } from "@/lib/analytics"
import { useDeleteDocument } from "@lib/queries"
import { useProject } from "@/stores"

import { MemoryDetail } from "./memories-utils/memory-detail"
import { TweetCard } from "./content-cards/tweet"
import { WebsiteCard } from "./content-cards/website"
import { NoteCard } from "./content-cards/note"
import { GoogleDocsCard } from "./content-cards/google-docs"
import type { Tweet } from "react-tweet/api"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

interface MasonryMemoryListProps {
	children?: React.ReactNode
	documents: DocumentWithMemories[]
	isLoading: boolean
	isLoadingMore: boolean
	error: Error | null
	totalLoaded: number
	hasMore: boolean
	loadMoreDocuments: () => Promise<void>
}

const DocumentCard = memo(
	({
		index: _index,
		data: document,
		width,
		onOpenDetails,
		onDelete,
	}: {
		index: number
		data: DocumentWithMemories & { ogImage?: string }
		width: number
		onOpenDetails: (document: DocumentWithMemories) => void
		onDelete: (document: DocumentWithMemories) => void
	}) => {
		const activeMemories = document.memoryEntries.filter((m) => !m.isForgotten)
		const forgottenMemories = document.memoryEntries.filter(
			(m) => m.isForgotten,
		)

		if (
			document.url?.includes("https://docs.googleapis.com/v1/documents") ||
			document.url?.includes("docs.google.com/document") ||
			document.type === "google_doc"
		) {
			return (
				<GoogleDocsCard
					url={document.url}
					title={document.title || "Untitled Document"}
					description={document.content}
					activeMemories={activeMemories}
					lastModified={document.updatedAt || document.createdAt}
					onDelete={() => onDelete(document)}
				/>
			)
		}

		if (
			document.url?.includes("x.com/") &&
			document.metadata?.sm_internal_twitter_metadata
		) {
			return (
				<TweetCard
					data={
						document.metadata?.sm_internal_twitter_metadata as unknown as Tweet
					}
					activeMemories={activeMemories}
					onDelete={() => onDelete(document)}
				/>
			)
		}

		// Check if this is a website document saved from the Chrome extension
		const websiteUrl =
			(document.metadata?.website_url as string | undefined) ||
			(document.url?.includes("https://") ? document.url : undefined)

		if (websiteUrl) {
			return (
				<WebsiteCard
					url={websiteUrl}
					title={
						(document.metadata?.website_title as string | undefined) ||
						document.title ||
						"Untitled Document"
					}
					image={
						(document.metadata?.website_og_image as string | undefined) ||
						document.ogImage
					}
					description={document.content && typeof document.content === "string" ? document.content : undefined}
					onOpenDetails={() => onOpenDetails(document)}
					onDelete={() => onDelete(document)}
				/>
			)
		}

		return (
			<NoteCard
				document={document}
				width={width}
				activeMemories={activeMemories}
				forgottenMemories={forgottenMemories}
				onOpenDetails={onOpenDetails}
				onDelete={onDelete}
			/>
		)
	},
)

DocumentCard.displayName = "DocumentCard"

export const MasonryMemoryList = ({
	children,
	documents,
	isLoading,
	isLoadingMore,
	error,
	hasMore,
	loadMoreDocuments,
}: MasonryMemoryListProps) => {
	const [selectedSpace, _] = useState<string>("all")
	const [selectedDocument, setSelectedDocument] =
		useState<DocumentWithMemories | null>(null)
	const [isDetailOpen, setIsDetailOpen] = useState(false)
	const isMobile = useIsMobile()
	const { selectedProject } = useProject()
	const deleteDocumentMutation = useDeleteDocument(selectedProject)

	const handleDeleteDocument = useCallback(
		(document: DocumentWithMemories) => {
			deleteDocumentMutation.mutate(document.id)
		},
		[deleteDocumentMutation],
	)

	// Filter documents based on selected space
	const filteredDocuments = useMemo(() => {
		if (!documents) return []

		if (selectedSpace === "all") {
			return documents
		}

		return documents
			.map((doc) => ({
				...doc,
				memoryEntries: doc.memoryEntries.filter(
					(memory) =>
						(memory.spaceContainerTag ?? memory.spaceId) === selectedSpace,
				),
			}))
			.filter((doc) => doc.memoryEntries.length > 0)
	}, [documents, selectedSpace])

	const handleOpenDetails = useCallback((document: DocumentWithMemories) => {
		analytics.memoryDetailOpened()
		setSelectedDocument(document)
		setIsDetailOpen(true)
	}, [])

	const handleCloseDetails = useCallback(() => {
		setIsDetailOpen(false)
		setTimeout(() => setSelectedDocument(null), 300)
	}, [])

	// Infinite loading with Masonic
	const maybeLoadMore = useInfiniteLoader(
		async (_startIndex, _stopIndex, _currentItems) => {
			if (hasMore && !isLoadingMore) {
				await loadMoreDocuments()
			}
		},
		{
			isItemLoaded: (index, items) => !!items[index],
			minimumBatchSize: 10,
			threshold: 5,
		},
	)

	const renderDocumentCard = useCallback(
		({
			index,
			data,
			width,
		}: {
			index: number
			data: DocumentWithMemories
			width: number
		}) => (
			<DocumentCard
				index={index}
				data={data}
				width={width}
				onOpenDetails={handleOpenDetails}
				onDelete={handleDeleteDocument}
			/>
		),
		[handleOpenDetails, handleDeleteDocument],
	)

	return (
		<>
			<div className="h-full relative pt-10">
				{error ? (
					<div className="h-full flex items-center justify-center p-4">
						<div className="rounded-xl overflow-hidden">
							<div
								className="relative z-10 px-6 py-4"
								style={{ color: colors.text.primary }}
							>
								Error loading documents: {error.message}
							</div>
						</div>
					</div>
				) : isLoading ? (
					<div className="h-full overflow-auto px-4 pt-4">
						<div
							className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}`}
						>
							{Array.from({ length: 8 }, (_, i) => ({
								id: `skeleton-${Math.random()}-${i}`,
								height: 100 + (i % 3),
							})).map((item) => (
								<div
									key={item.id}
									className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse"
									style={{ height: `${item.height}px` }}
								>
									<div className="flex flex-col gap-3 h-full">
										<div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
										<div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
										<div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
										<div className="mt-auto flex gap-2">
											<div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
											<div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				) : filteredDocuments.length === 0 && !isLoading ? (
					<div className="h-full flex items-center justify-center p-4">
						{children}
					</div>
				) : (
					<div
						className="h-full overflow-auto custom-scrollbar sm-tweet-theme"
						data-theme="light"
					>
						<Masonry
							key={`masonry-${filteredDocuments.length}-${filteredDocuments.map((d) => d.id).join(",")}`}
							items={filteredDocuments}
							render={renderDocumentCard}
							columnGutter={16}
							rowGutter={16}
							columnWidth={280}
							maxColumnCount={isMobile ? 1 : undefined}
							itemHeightEstimate={200}
							overscanBy={3}
							onRender={maybeLoadMore}
							className="px-4"
						/>

						{isLoadingMore && (
							<div className="py-8 flex items-center justify-center">
								<div className="flex items-center gap-2">
									<Sparkles className="w-4 h-4 animate-spin text-blue-400" />
									<span style={{ color: colors.text.primary }}>
										Loading more memories...
									</span>
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			<MemoryDetail
				document={selectedDocument}
				isOpen={isDetailOpen}
				onClose={handleCloseDetails}
				isMobile={isMobile}
			/>
		</>
	)
}
