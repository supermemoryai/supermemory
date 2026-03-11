"use client"

import { useAuth } from "@lib/auth-context"
import { $fetch } from "@lib/api"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { useCallback, memo, useMemo, useState, useRef, useEffect } from "react"
import { useQueryState } from "nuqs"
import type { z } from "zod"
import { Masonry, useInfiniteLoader } from "masonic"
import { dmSansClassName } from "@/lib/fonts"
import { SuperLoader } from "@/components/superloader"
import { ErrorBoundary } from "@/components/error-boundary"
import { cn } from "@lib/utils"
import { useProject } from "@/stores"
import { useIsMobile } from "@hooks/use-mobile"
import type { Tweet } from "react-tweet/api"
import { TweetPreview } from "./document-cards/tweet-preview"
import { WebsitePreview } from "./document-cards/website-preview"
import { GoogleDocsPreview } from "./document-cards/google-docs-preview"
import { FilePreview } from "./document-cards/file-preview"
import { NotePreview } from "./document-cards/note-preview"
import { YoutubePreview } from "./document-cards/youtube-preview"
import { getAbsoluteUrl, isYouTubeUrl, useYouTubeChannelName } from "./utils"
import { SyncLogoIcon } from "@ui/assets/icons"
import { McpPreview } from "./document-cards/mcp-preview"
import { NotionPreview } from "./document-cards/notion-preview"
import { getFaviconUrl } from "@/lib/url-helpers"
import { QuickNoteCard } from "./quick-note-card"
import { HighlightsCard, type HighlightItem } from "./highlights-card"
import { GraphCard } from "./memory-graph"
import { Button } from "@ui/components/button"
import { categoriesParam } from "@/lib/search-params"
import { NovaEmptyState } from "@/components/nova/nova-empty-state"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog"
import { CheckIcon, Trash2Icon, XIcon } from "lucide-react"

// Document category type
type DocumentCategory =
	| "webpage"
	| "tweet"
	| "google_drive"
	| "notion"
	| "onedrive"
	| "files"
	| "notes"
	| "mcp"

type DocumentFacet = {
	category: DocumentCategory
	count: number
	label: string
}

type FacetsResponse = {
	facets: DocumentFacet[]
	total: number
}

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

type OgData = {
	title?: string
	image?: string
}

const PAGE_SIZE = 100
const MAX_TOTAL = 1000

// Discriminated union for masonry items
type MasonryItem = { type: "document"; id: string; data: DocumentWithMemories }

interface QuickNoteProps {
	onSave: (content: string) => void
	onMaximize: (content: string) => void
	isSaving: boolean
}

interface HighlightsProps {
	items: HighlightItem[]
	onChat: (seed: string) => void
	onShowRelated: (query: string) => void
	isLoading: boolean
}

interface NovaEmptyStateProps {
	onAddMemory: (tab: "note" | "link") => void
	onOpenIntegrations: (
		integration?: "import" | "chrome" | "connections",
	) => void
	isAllSpaces: boolean
	spaceName?: string
}

interface MemoriesGridProps {
	isChatOpen: boolean
	onOpenDocument: (document: DocumentWithMemories) => void
	isSelectionMode?: boolean
	selectedDocumentIds?: Set<string>
	onEnterSelectionMode?: () => void
	onToggleSelection?: (documentId: string) => void
	onClearSelection?: () => void
	onSelectAllVisible?: (visibleIds: string[]) => void
	onBulkDelete?: () => void
	isBulkDeleting?: boolean
	quickNoteProps?: QuickNoteProps
	highlightsProps?: HighlightsProps
	emptyStateProps?: NovaEmptyStateProps
}

export function MemoriesGrid({
	isChatOpen,
	onOpenDocument,
	isSelectionMode = false,
	selectedDocumentIds = new Set(),
	onEnterSelectionMode,
	onToggleSelection,
	onClearSelection,
	onSelectAllVisible,
	onBulkDelete,
	isBulkDeleting = false,
	quickNoteProps,
	highlightsProps,
	emptyStateProps,
}: MemoriesGridProps) {
	const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
	const { user } = useAuth()
	const { effectiveContainerTags } = useProject()
	const isMobile = useIsMobile()
	const [selectedCategories, setSelectedCategories] = useQueryState(
		"categories",
		categoriesParam,
	)

	const { data: facetsData } = useQuery({
		queryKey: ["document-facets", effectiveContainerTags],
		queryFn: async (): Promise<FacetsResponse> => {
			const response = await $fetch("@post/documents/documents/facets", {
				body: {
					containerTags: effectiveContainerTags,
				},
				disableValidation: true,
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to fetch facets")
			}

			return response.data as FacetsResponse
		},
		staleTime: 5 * 60 * 1000,
		enabled: !!user,
	})

	const {
		data,
		error,
		isPending,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteQuery<DocumentsResponse, Error>({
		queryKey: [
			"documents-with-memories",
			effectiveContainerTags,
			selectedCategories,
		],
		initialPageParam: 1,
		queryFn: async ({ pageParam }) => {
			const response = await $fetch("@post/documents/documents", {
				body: {
					page: pageParam as number,
					limit: PAGE_SIZE,
					sort: "createdAt",
					order: "desc",
					containerTags: effectiveContainerTags,
					categories:
						selectedCategories.length > 0 ? selectedCategories : undefined,
				},
				disableValidation: true,
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to fetch documents")
			}

			return response.data
		},
		getNextPageParam: (lastPage, allPages) => {
			const loaded = allPages.reduce(
				(acc, p) => acc + (p.documents?.length ?? 0),
				0,
			)
			if (loaded >= MAX_TOTAL) return undefined

			const { currentPage, totalPages } = lastPage.pagination
			if (currentPage < totalPages) {
				return currentPage + 1
			}
			return undefined
		},
		staleTime: 5 * 60 * 1000,
		enabled: !!user,
	})

	const handleCategoryToggle = useCallback(
		(category: DocumentCategory) => {
			setSelectedCategories((prev) => {
				const current = prev ?? []
				if (current.includes(category)) {
					const next = current.filter((c) => c !== category)
					return next.length === 0 ? null : next
				}
				return [...current, category]
			})
		},
		[setSelectedCategories],
	)

	const handleSelectAll = useCallback(() => {
		setSelectedCategories(null)
	}, [setSelectedCategories])

	const documents = useMemo(() => {
		return (
			data?.pages.flatMap((p: DocumentsResponse) => p.documents ?? []) ?? []
		)
	}, [data])

	const hasQuickNote = !!quickNoteProps
	const hasHighlights = !!highlightsProps

	const masonryItems: MasonryItem[] = useMemo(() => {
		const items: MasonryItem[] = []

		for (const doc of documents) {
			items.push({ type: "document", id: doc.id, data: doc })
		}

		return items
	}, [documents])

	// Stable key for Masonry based on document IDs, not item values
	const masonryKey = useMemo(() => {
		const docIds = documents.map((d) => d.id).join(",")
		return `masonry-${documents.length}-${docIds}-${isChatOpen}`
	}, [documents, isChatOpen])

	const isLoadingMore = isFetchingNextPage

	const loadMoreDocuments = useCallback(async (): Promise<void> => {
		if (hasNextPage && !isFetchingNextPage) {
			await fetchNextPage()
			return
		}
		return
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])

	const maybeLoadMore = useInfiniteLoader(
		async (_startIndex, _stopIndex, _currentItems) => {
			if (hasNextPage && !isFetchingNextPage) {
				await loadMoreDocuments()
			}
		},
		{
			isItemLoaded: (index, items) => !!items[index],
			minimumBatchSize: 10,
			threshold: 5,
		},
	)

	const handleCardClick = useCallback(
		(document: DocumentWithMemories) => {
			if (isSelectionMode && onToggleSelection && document.id) {
				onToggleSelection(document.id)
			} else {
				onOpenDocument(document)
			}
		},
		[isSelectionMode, onToggleSelection, onOpenDocument],
	)

	const handleSelectAllVisible = useCallback(() => {
		if (onSelectAllVisible) {
			onSelectAllVisible(documents.map((d) => d.id).filter(Boolean) as string[])
		}
	}, [documents, onSelectAllVisible])

	const handleBulkDeleteClick = useCallback(() => {
		if (selectedDocumentIds.size === 0) return
		setShowBulkDeleteConfirm(true)
	}, [selectedDocumentIds.size])

	const handleBulkDeleteConfirm = useCallback(() => {
		setShowBulkDeleteConfirm(false)
		onBulkDelete?.()
	}, [onBulkDelete])

	const renderMasonryItem = useCallback(
		({
			index,
			data,
			width,
		}: {
			index: number
			data: MasonryItem
			width: number
		}) => {
			if (data.type === "document") {
				const doc = data.data
				return (
					<ErrorBoundary>
						<DocumentCard
							index={index}
							data={doc}
							width={width}
							onClick={handleCardClick}
							isSelectionMode={isSelectionMode}
							isSelected={doc.id ? selectedDocumentIds.has(doc.id) : false}
							onToggleSelection={
								doc.id && onToggleSelection
									? () => onToggleSelection(doc.id as string)
									: undefined
							}
						/>
					</ErrorBoundary>
				)
			}

			return null
		},
		[handleCardClick, isSelectionMode, selectedDocumentIds, onToggleSelection],
	)

	if (!user) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center text-muted-foreground">
					<p>Please log in to view your memories</p>
				</div>
			</div>
		)
	}

	const isEmpty = documents.length === 0 && !isPending
	const showNovaEmptyState = isEmpty && emptyStateProps

	return (
		<div className="relative">
			{!isEmpty && (
				<div
					id="filter-pills"
					className="flex items-center justify-between gap-4 mb-3"
				>
					<div className="flex flex-wrap items-center gap-1.5">
						<Button
							className={cn(
								dmSansClassName(),
								"rounded-full border border-[#161F2C] bg-[#0D121A] px-2.5 py-1 text-xs h-auto hover:bg-[#00173C] hover:border-[#2261CA33]",
								selectedCategories.length === 0 &&
									"bg-[#00173C] border-[#2261CA33]",
							)}
							onClick={handleSelectAll}
						>
							All
							{facetsData?.total !== undefined && (
								<span className="ml-1 text-[#737373]">({facetsData.total})</span>
							)}
						</Button>
						{facetsData?.facets.map((facet: DocumentFacet) => (
							<Button
								key={facet.category}
								className={cn(
									dmSansClassName(),
									"rounded-full border border-[#161F2C] bg-[#0D121A] px-2.5 py-1 text-xs h-auto hover:bg-[#00173C] hover:border-[#2261CA33]",
									selectedCategories.includes(facet.category) &&
										"bg-[#00173C] border-[#2261CA33]",
								)}
								onClick={() => handleCategoryToggle(facet.category)}
							>
								{facet.label}
								<span className="ml-1 text-[#737373]">({facet.count})</span>
							</Button>
						))}
					</div>
					<div className="flex items-center gap-2 shrink-0">
						{isSelectionMode && (
							<>
								<button
									type="button"
									aria-label="Exit selection mode"
									className="w-8 h-8 flex items-center justify-center rounded-full border border-[#161F2C] bg-[#0D121A] hover:bg-[#00173C] transition-colors cursor-pointer"
									onClick={onClearSelection}
								>
									<XIcon className="w-4 h-4 text-[#737373]" />
								</button>
								{selectedDocumentIds.size > 0 ? (
									<>
										<button
											type="button"
											className={cn(
												dmSansClassName(),
												"text-xs text-[#737373] hover:text-white transition-colors cursor-pointer",
											)}
											onClick={handleSelectAllVisible}
										>
											Select all
										</button>
										<button
											type="button"
											className={cn(
												dmSansClassName(),
												"flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50",
											)}
											onClick={handleBulkDeleteClick}
											disabled={isBulkDeleting}
										>
											<Trash2Icon className="w-3 h-3" />
											Delete ({selectedDocumentIds.size})
										</button>
									</>
								) : (
									<p className={cn(dmSansClassName(), "text-xs text-[#737373]")}>
										Select one or more documents
									</p>
								)}
							</>
						)}
						{!isSelectionMode && onEnterSelectionMode && (
							<button
								type="button"
								aria-label="Enter selection mode"
								className="w-8 h-8 flex items-center justify-center rounded-full border border-[#161F2C] bg-[#0D121A] hover:bg-[#00173C] transition-colors cursor-pointer"
								onClick={onEnterSelectionMode}
							>
								<div className="w-3 h-3 rounded-[2.25px] border border-[#737373]" />
							</button>
						)}
					</div>
				</div>
			)}

			<AlertDialog
				open={showBulkDeleteConfirm}
				onOpenChange={setShowBulkDeleteConfirm}
			>
				<AlertDialogContent
					className={cn(
						"border-none bg-[#1B1F24] p-4 gap-4 rounded-[22px] max-w-[400px]",
						dmSansClassName(),
					)}
					style={{
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
					}}
				>
					<AlertDialogHeader>
						<AlertDialogTitle className="text-[#FAFAFA] font-medium">
							Delete selected memories?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-[#737373]">
							This will permanently delete {selectedDocumentIds.size}{" "}
							{selectedDocumentIds.size === 1 ? "memory" : "memories"}. This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="flex-row gap-2 sm:justify-end">
						<AlertDialogCancel
							className="border-none bg-transparent text-[#737373] hover:bg-[#14161A]/50 hover:text-white rounded-full cursor-pointer"
							onClick={() => setShowBulkDeleteConfirm(false)}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-600 hover:bg-red-700 text-white border-none rounded-[10px] cursor-pointer"
							onClick={handleBulkDeleteConfirm}
							disabled={isBulkDeleting}
						>
							{isBulkDeleting ? "Deleting…" : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{error ? (
				<div className="h-full flex items-center justify-center p-4">
					<div className="text-center text-muted-foreground">
						Error loading documents: {error.message}
					</div>
				</div>
			) : isPending ? (
				<div className="h-full flex items-center justify-center p-4">
					<SuperLoader />
				</div>
			) : showNovaEmptyState ? (
				<NovaEmptyState
					onAddMemory={emptyStateProps.onAddMemory}
					onOpenIntegrations={emptyStateProps.onOpenIntegrations}
					isAllSpaces={emptyStateProps.isAllSpaces}
					spaceName={emptyStateProps.spaceName}
				/>
			) : isEmpty ? (
				<div className="h-full flex items-center justify-center p-4">
					<div className="text-center text-muted-foreground">
						No memories found
					</div>
				</div>
			) : (
				<div className="h-full overflow-auto scrollbar-thin">
					{!isMobile && (hasQuickNote || hasHighlights) && (
						<div className="flex gap-2 mb-2 px-2">
							{hasQuickNote && quickNoteProps && (
								<div className="w-[216px] shrink-0">
									<QuickNoteCard {...quickNoteProps} />
								</div>
							)}
							{hasHighlights && highlightsProps && (
								<div className="flex-1 min-w-0">
									<HighlightsCard {...highlightsProps} />
								</div>
							)}
							<div className="w-[216px] shrink-0">
								<GraphCard
									containerTags={effectiveContainerTags}
									width={200}
									height={220}
								/>
							</div>
						</div>
					)}
					<Masonry
						key={masonryKey}
						items={masonryItems}
						render={renderMasonryItem}
						columnGutter={0}
						rowGutter={0}
						columnWidth={216}
						maxColumnCount={isMobile ? 1 : undefined}
						itemHeightEstimate={200}
						overscanBy={3}
						onRender={maybeLoadMore}
					/>

					{isLoadingMore && (
						<div className="py-8 flex items-center justify-center">
							<SuperLoader />
						</div>
					)}
				</div>
			)}
		</div>
	)
}

function DocumentUrlDisplay({ url }: { url: string }) {
	const isYouTube = isYouTubeUrl(url)
	const { data: channelName, isLoading } = useYouTubeChannelName(
		isYouTube ? url : null,
	)

	if (isYouTube) {
		return (
			<p
				className={cn(
					dmSansClassName(),
					"text-[10px] text-[#737373] line-clamp-1",
				)}
			>
				{isLoading ? "YouTube" : channelName || "YouTube"}
			</p>
		)
	}

	return (
		<p
			className={cn(
				dmSansClassName(),
				"text-[10px] text-[#737373] line-clamp-1",
			)}
		>
			{getAbsoluteUrl(url)}
		</p>
	)
}

function isTemporaryId(id: string | null | undefined): boolean {
	if (!id) return false
	return id.startsWith("temp-") || id.startsWith("temp-file-")
}

const DocumentCard = memo(
	({
		index: _index,
		data: document,
		width,
		onClick,
		isSelectionMode = false,
		isSelected = false,
		onToggleSelection,
	}: {
		index: number
		data: DocumentWithMemories
		width: number
		onClick: (document: DocumentWithMemories) => void
		isSelectionMode?: boolean
		isSelected?: boolean
		onToggleSelection?: () => void
	}) => {
		const canSelect =
			!isTemporaryId(document.id) && !isTemporaryId(document.customId)
		const [rotation, setRotation] = useState({ rotateX: 0, rotateY: 0 })
		const cardRef = useRef<HTMLButtonElement>(null)
		const [ogData, setOgData] = useState<OgData | null>(null)
		const [isLoadingOg, setIsLoadingOg] = useState(false)

		const ogImage = (document as DocumentWithMemories & { ogImage?: string })
			.ogImage
		const needsOgData =
			document.url &&
			document.type !== "notion_doc" &&
			!document.url.includes("x.com") &&
			!document.url.includes("twitter.com") &&
			!document.url.includes("files.supermemory.ai") &&
			!document.url.includes("docs.googleapis.com") &&
			!document.url.includes("notion.so") &&
			(!document.title || !ogImage)

		const hideURL = document.url?.includes("docs.googleapis.com")

		useEffect(() => {
			if (needsOgData && !ogData && !isLoadingOg && document.url) {
				setIsLoadingOg(true)
				fetch(`/api/og?url=${encodeURIComponent(document.url)}`)
					.then((res) => {
						if (!res.ok) throw new Error("Failed")
						return res.json()
					})
					.then((data) => {
						setOgData({
							title: data?.title,
							image: data?.image,
						})
					})
					.catch(() => {
						setOgData({})
					})
					.finally(() => {
						setIsLoadingOg(false)
					})
			}
		}, [needsOgData, ogData, isLoadingOg, document.url])

		useEffect(() => {
			if (isSelectionMode) setRotation({ rotateX: 0, rotateY: 0 })
		}, [isSelectionMode])

		const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
			if (isSelectionMode || !cardRef.current) return

			const rect = cardRef.current.getBoundingClientRect()
			const centerX = rect.left + rect.width / 2
			const centerY = rect.top + rect.height / 2

			const mouseX = e.clientX - centerX
			const mouseY = e.clientY - centerY

			// Calculate rotation angles (max 15 degrees)
			const rotateY = (mouseX / (rect.width / 2)) * 15
			const rotateX = -(mouseY / (rect.height / 2)) * 15

			setRotation({ rotateX, rotateY })
		}

		const handleMouseLeave = () => {
			setRotation({ rotateX: 0, rotateY: 0 })
		}

		return (
			<div className="p-2 relative" style={{ width }}>
				{isSelectionMode && canSelect && (
					<button
						type="button"
						aria-label={isSelected ? "Deselect" : "Select"}
						className="absolute top-5 right-5 z-10 flex items-center justify-center cursor-pointer"
						onClick={(e) => {
							e.stopPropagation()
							onToggleSelection?.()
						}}
					>
						{isSelected ? (
							<div className="w-3 h-3 rounded-[2.25px] border border-[#369BFD] bg-[#369BFD] flex items-center justify-center">
								<CheckIcon className="w-2 h-2 text-white" strokeWidth={3} />
							</div>
						) : (
							<div className="w-3 h-3 rounded-[2.25px] border border-[#737373]" />
						)}
					</button>
				)}
				<button
					id={document.id ? `document-card-${document.id}` : undefined}
					ref={cardRef}
					type="button"
					className={cn(
						"rounded-[22px] bg-[#1B1F24] px-1 space-y-2 pt-1 cursor-pointer w-full relative overflow-hidden",
						"border-none text-left transition-transform duration-200 ease-out",
						document.type === "image" ||
							document.metadata?.mimeType?.toString().startsWith("image/")
							? "pb-1"
							: "",
					)}
					onClick={() => onClick(document)}
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
					style={{
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
						transform: isSelectionMode
							? "none"
							: `perspective(1000px) rotateX(${rotation.rotateX}deg) rotateY(${rotation.rotateY}deg)`,
						transformStyle: isSelectionMode ? undefined : "preserve-3d",
					}}
				>
					{isSelectionMode && isSelected && (
						<div className="absolute inset-0 bg-[rgba(75,160,250,0.25)] rounded-[22px] z-1 pointer-events-none" />
					)}
					<ContentPreview document={document} ogData={ogData} />
					{!(
						document.type === "image" ||
						document.type === "notion_doc" ||
						document.metadata?.mimeType?.toString().startsWith("image/")
					) && (
						<div className="pb-[10px] space-y-1">
							{document.url &&
								!document.url.includes("x.com") &&
								!document.url.includes("twitter.com") &&
								!document.url.includes("files.supermemory.ai") && (
									<div className="px-3">
										<div className="flex justify-between items-center gap-2">
											<p
												className={cn(
													dmSansClassName(),
													"text-[12px] text-[#E5E5E5] line-clamp-1 font-semibold",
												)}
											>
												{document.title || ogData?.title || "Untitled Document"}
											</p>
											{getFaviconUrl(document.url) && needsOgData && (
												<img
													src={getFaviconUrl(document.url) || ""}
													alt=""
													className="w-4 h-4 shrink-0 rounded-lg"
													onError={(e) => {
														e.currentTarget.style.display = "none"
													}}
												/>
											)}
										</div>

										{!hideURL && <DocumentUrlDisplay url={document.url} />}
									</div>
								)}
							<div
								className={cn(
									"flex items-center px-3",
									document.memoryEntries.length > 0
										? "justify-between"
										: "justify-end",
								)}
							>
								{document.memoryEntries.length > 0 && (
									<p
										className={cn(
											dmSansClassName(),
											"text-[10px] text-[#369BFD] font-semibold flex items-center gap-1",
										)}
										style={{
											background:
												"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
											backgroundClip: "text",
											WebkitBackgroundClip: "text",
											WebkitTextFillColor: "transparent",
										}}
									>
										<SyncLogoIcon className="w-[12.33px] h-[10px]" />
										{document.memoryEntries.length}
									</p>
								)}
								<p
									className={cn(
										dmSansClassName(),
										"text-[10px] text-[#737373] line-clamp-1",
									)}
								>
									{new Date(document.createdAt).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric",
									})}
								</p>
							</div>
						</div>
					)}
				</button>
			</div>
		)
	},
)

DocumentCard.displayName = "DocumentCard"

function ContentPreview({
	document,
	ogData,
}: {
	document: DocumentWithMemories
	ogData?: OgData | null
}) {
	if (
		document.url?.includes("https://docs.googleapis.com/v1/documents") ||
		document.url?.includes("docs.google.com/document") ||
		document.type === "google_doc"
	) {
		return <GoogleDocsPreview document={document} />
	}

	if (
		document.url?.includes("x.com/") &&
		document.metadata?.sm_internal_twitter_metadata
	) {
		return (
			<TweetPreview
				data={
					document.metadata?.sm_internal_twitter_metadata as unknown as Tweet
				}
			/>
		)
	}

	if (document.source === "mcp") {
		return <McpPreview document={document} />
	}

	if (isYouTubeUrl(document.url)) {
		return <YoutubePreview document={document} />
	}

	if (document.type === "notion_doc") {
		return <NotionPreview document={document} />
	}

	if (
		document.type === "pdf" ||
		document.type === "image" ||
		document.type === "video" ||
		document.metadata?.mimeType
	) {
		return <FilePreview document={document} />
	}

	if (document.url?.includes("https://")) {
		return <WebsitePreview document={document} ogData={ogData} />
	}

	// Default to Note
	return <NotePreview document={document} />
}
