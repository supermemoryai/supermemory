"use client"

import { useIsMobile } from "@hooks/use-mobile"
import { cn } from "@lib/utils"
import { Badge } from "@repo/ui/components/badge"
import { Card, CardContent, CardHeader } from "@repo/ui/components/card"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog"
import { colors } from "@repo/ui/memory-graph/constants"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Brain, ExternalLink, Sparkles, Trash2 } from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { z } from "zod"
import useResizeObserver from "@/hooks/use-resize-observer"
import { analytics } from "@/lib/analytics"
import { $fetch } from "@lib/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useProject } from "@/stores"

import { MemoryDetail } from "./memories/memory-detail"
import { getDocumentIcon } from "@/lib/document-icon"
import { formatDate, getSourceUrl } from "./memories"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

interface MemoryListViewProps {
	children?: React.ReactNode
	documents: DocumentWithMemories[]
	isLoading: boolean
	isLoadingMore: boolean
	error: Error | null
	totalLoaded: number
	hasMore: boolean
	loadMoreDocuments: () => Promise<void>
}

const GreetingMessage = memo(() => {
	const getGreeting = () => {
		const hour = new Date().getHours()
		if (hour < 12) return "Good morning"
		if (hour < 17) return "Good afternoon"
		return "Good evening"
	}

	return (
		<div className="flex items-center gap-3 mb-3 px-4 md:mb-6 md:mt-3">
			<div>
				<h1
					className="text-lg md:text-xl font-semibold"
					style={{ color: colors.text.primary }}
				>
					{getGreeting()}!
				</h1>
				<p className="text-xs md:text-sm" style={{ color: colors.text.muted }}>
					Welcome back to your memory collection
				</p>
			</div>
		</div>
	)
})

const DocumentCard = memo(
	({
		document,
		onOpenDetails,
		onDelete,
	}: {
		document: DocumentWithMemories
		onOpenDetails: (document: DocumentWithMemories) => void
		onDelete: (document: DocumentWithMemories) => void
	}) => {
		const activeMemories = document.memoryEntries.filter((m) => !m.isForgotten)
		const forgottenMemories = document.memoryEntries.filter(
			(m) => m.isForgotten,
		)

		return (
			<Card
				className="h-full mx-4 p-4 transition-all cursor-pointer group relative overflow-hidden border-0 gap-2 md:w-full"
				onClick={() => {
					analytics.documentCardClicked()
					onOpenDetails(document)
				}}
				style={{
					backgroundColor: colors.document.primary,
				}}
			>
				<CardHeader className="relative z-10 px-0">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-1">
							{getDocumentIcon(document.type, "w-4 h-4 flex-shrink-0")}
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
								className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
								onClick={(e) => {
									e.stopPropagation()
									const sourceUrl = getSourceUrl(document)
									window.open(sourceUrl ?? undefined, "_blank")
								}}
								style={{
									backgroundColor: "rgba(255, 255, 255, 0.05)",
									color: colors.text.secondary,
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
							className="text-xs line-clamp-2 mb-3"
							style={{ color: colors.text.muted }}
						>
							{document.content}
						</p>
					)}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 flex-wrap">
							{activeMemories.length > 0 && (
								<Badge
									className="text-xs text-accent-foreground"
									style={{
										backgroundColor: colors.memory.secondary,
									}}
									variant="secondary"
								>
									<Brain className="w-3 h-3 mr-1" />
									{activeMemories.length}{" "}
									{activeMemories.length === 1 ? "memory" : "memories"}
								</Badge>
							)}
							{forgottenMemories.length > 0 && (
								<Badge
									className="text-xs"
									style={{
										borderColor: "rgba(255, 255, 255, 0.2)",
										color: colors.text.muted,
									}}
									variant="outline"
								>
									{forgottenMemories.length} forgotten
								</Badge>
							)}
						</div>

						<AlertDialog>
							<AlertDialogTrigger asChild>
								<button
									className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-500/20"
									onClick={(e) => {
										e.stopPropagation()
									}}
									style={{
										color: colors.text.muted,
									}}
									type="button"
								>
									<Trash2 className="w-3.5 h-3.5" />
								</button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete Document</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to delete this document and all its
										related memories? This action cannot be undone.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel
										onClick={(e) => {
											e.stopPropagation()
										}}
									>
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										className="bg-red-600 hover:bg-red-700 text-white"
										onClick={(e) => {
											e.stopPropagation()
											onDelete(document)
										}}
									>
										Delete
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</CardContent>
			</Card>
		)
	},
)

export const MemoryListView = ({
	children,
	documents,
	isLoading,
	isLoadingMore,
	error,
	hasMore,
	loadMoreDocuments,
}: MemoryListViewProps) => {
	const [selectedSpace, _] = useState<string>("all")
	const [selectedDocument, setSelectedDocument] =
		useState<DocumentWithMemories | null>(null)
	const [isDetailOpen, setIsDetailOpen] = useState(false)
	const parentRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const isMobile = useIsMobile()
	const queryClient = useQueryClient()
	const { selectedProject } = useProject()

	const gap = 14

	// Delete document mutation
	const deleteDocumentMutation = useMutation({
		mutationFn: async (documentId: string) => {
			const response = await $fetch(`@delete/memories/${documentId}`)
			if (response.error) {
				throw new Error(response.error?.message || "Failed to delete document")
			}
			return response.data
		},
		onMutate: async (documentId: string) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: ["documents-with-memories", selectedProject],
			})

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
				"documents-with-memories",
				selectedProject,
			])

			// Optimistically remove the document from the cache
			queryClient.setQueryData(
				["documents-with-memories", selectedProject],
				(old: unknown) => {
					if (!old || typeof old !== "object") return old
					const typedOld = old as {
						pages?: Array<{ documents?: DocumentWithMemories[] }>
					}
					return {
						...typedOld,
						pages: typedOld.pages?.map((page) => ({
							...page,
							documents: page.documents?.filter(
								(doc: DocumentWithMemories) => doc.id !== documentId,
							),
						})),
					}
				},
			)

			return { previousData }
		},
		onSuccess: () => {
			toast.success("Memory deleted successfully")
		},
		onError: (error, _documentId, context) => {
			// Rollback on error
			if (context?.previousData) {
				queryClient.setQueryData(
					["documents-with-memories", selectedProject],
					context.previousData,
				)
			}
			toast.error("Failed to delete memory", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSettled: () => {
			// Always refetch to ensure consistency
			queryClient.invalidateQueries({
				queryKey: ["documents-with-memories", selectedProject],
			})
		},
	})

	const handleDeleteDocument = useCallback(
		(document: DocumentWithMemories) => {
			deleteDocumentMutation.mutate(document.id)
		},
		[deleteDocumentMutation],
	)

	const { width: containerWidth } = useResizeObserver(containerRef)
	const columnWidth = isMobile ? containerWidth : 320
	const columns = Math.max(
		1,
		Math.floor((containerWidth + gap) / (columnWidth + gap)),
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

	const virtualItems = useMemo(() => {
		const items = []
		for (let i = 0; i < filteredDocuments.length; i += columns) {
			items.push(filteredDocuments.slice(i, i + columns))
		}
		return items
	}, [filteredDocuments, columns])

	const virtualizer = useVirtualizer({
		count: virtualItems.length,
		getScrollElement: () => parentRef.current,
		overscan: 5,
		estimateSize: () => 200,
	})

	useEffect(() => {
		const [lastItem] = [...virtualizer.getVirtualItems()].reverse()

		if (!lastItem || !hasMore || isLoadingMore) {
			return
		}

		if (lastItem.index >= virtualItems.length - 1) {
			loadMoreDocuments()
		}
	}, [
		hasMore,
		isLoadingMore,
		loadMoreDocuments,
		virtualizer.getVirtualItems(),
		virtualItems.length,
	])

	// Always render with consistent structure
	return (
		<>
			<div
				className="h-full overflow-hidden relative pb-20"
				ref={containerRef}
				style={{ backgroundColor: colors.background.primary }}
			>
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
					<div className="h-full flex items-center justify-center p-4">
						<div className="rounded-xl overflow-hidden">
							<div
								className="relative z-10 px-6 py-4"
								style={{ color: colors.text.primary }}
							>
								<div className="flex items-center gap-2">
									<Sparkles className="w-4 h-4 animate-spin text-blue-400" />
									<span>Loading memory list...</span>
								</div>
							</div>
						</div>
					</div>
				) : filteredDocuments.length === 0 && !isLoading ? (
					<div className="h-full flex items-center justify-center p-4">
						{children}
					</div>
				) : (
					<div
						ref={parentRef}
						className="h-full overflow-auto mt-20 custom-scrollbar"
					>
						<GreetingMessage />

						<div
							className="w-full relative"
							style={{
								height: `${virtualizer.getTotalSize() + virtualItems.length * gap}px`,
							}}
						>
							{virtualizer.getVirtualItems().map((virtualRow) => {
								const rowItems = virtualItems[virtualRow.index]
								if (!rowItems) return null

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
											className="grid justify-start"
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
													onDelete={handleDeleteDocument}
												/>
											))}
										</div>
									</div>
								)
							})}
						</div>

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
