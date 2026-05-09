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
import type { HighlightItem } from "./highlights-card"
import { Button } from "@ui/components/button"
import {
	categoriesParam,
	type IntegrationParamValue,
} from "@/lib/search-params"
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
import {
	AlignLeft,
	BoxSelect,
	CheckIcon,
	LayoutGrid,
	Loader,
	Trash2Icon,
	XIcon,
} from "lucide-react"
import { useProcessingDocuments } from "@/hooks/use-processing-documents"
import { TimelineView } from "./timeline-view"

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

const ogCache = new Map<string, OgData>()
const ogInflight = new Map<string, Promise<OgData | null>>()
const ogFailures = new Map<string, number>()
const OG_FAILURE_TTL = 30_000

function fetchOgData(url: string): Promise<OgData | null> {
	const cached = ogCache.get(url)
	if (cached) return Promise.resolve(cached)

	const failedAt = ogFailures.get(url)
	if (failedAt && Date.now() - failedAt < OG_FAILURE_TTL) {
		return Promise.resolve(null)
	}

	const inflight = ogInflight.get(url)
	if (inflight) return inflight

	const promise = fetch(`/api/og?url=${encodeURIComponent(url)}`)
		.then((res) => {
			if (!res.ok) throw new Error("Failed")
			return res.json()
		})
		.then((data) => {
			const result: OgData = { title: data?.title, image: data?.image }
			if (!result.title && !result.image) {
				throw new Error("Empty metadata")
			}
			ogCache.set(url, result)
			ogInflight.delete(url)
			ogFailures.delete(url)
			return result
		})
		.catch(() => {
			ogInflight.delete(url)
			ogFailures.set(url, Date.now())
			return null
		})

	ogInflight.set(url, promise)
	return promise
}

const PAGE_SIZE = 100
const MAX_TOTAL = 1000
const EMPTY_SET = new Set<string>()

const MEMORIES_LOADING_LABELS = [
	"Getting your supermemories…",
	"Fetching your documents…",
	"Warming up Nova…",
	"Almost there…",
] as const

function useRotatingLoadingLabel(
	labels: readonly string[],
	intervalMs = 2400,
): string {
	const [index, setIndex] = useState(0)

	useEffect(() => {
		const id = window.setInterval(() => {
			setIndex((i) => (i + 1) % labels.length)
		}, intervalMs)
		return () => window.clearInterval(id)
	}, [labels.length, intervalMs])

	const label = labels.at(index) ?? labels.at(0)
	return label ?? "Loading…"
}

function MemoriesGridLoading() {
	const label = useRotatingLoadingLabel(MEMORIES_LOADING_LABELS)
	return (
		<output
			aria-label={label}
			className="h-full min-h-[min(50dvh,360px)] w-full flex items-center justify-center gap-4 px-8 py-20"
			aria-live="polite"
		>
			<Loader
				className={cn("shrink-0 animate-spin text-sky-400")}
				aria-hidden
				strokeWidth={2}
			/>
			<p
				className={cn(
					dmSansClassName(),
					"text-center text-base text-[#A3A3A3] max-w-md leading-relaxed",
				)}
			>
				{label}
			</p>
		</output>
	)
}

// Discriminated union for masonry items
type MasonryItem =
	| {
			type: "document"
			id: string
			data: DocumentWithMemories
			isSelectionMode: boolean
			isSelected: boolean
	  }
	| { type: "quick-note"; id: "quick-note" }

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
	onOpenIntegrations: (integration?: IntegrationParamValue) => void
	isAllSpaces: boolean
	spaceName?: string
	onSwitchToAllSpaces?: () => void
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
	selectedDocumentIds = EMPTY_SET,
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
	const [localViewMode, setLocalViewMode] = useState<"grid" | "timeline">(
		() => {
			if (typeof window === "undefined") return "grid"
			return (
				(localStorage.getItem("memories-view-mode") as "grid" | "timeline") ??
				"grid"
			)
		},
	)
	const { user, isSessionPending } = useAuth()
	const { effectiveContainerTags } = useProject()
	const processingStatusMap = useProcessingDocuments()
	const isMobile = useIsMobile()
	const [selectedCategories, setSelectedCategories] = useQueryState(
		"categories",
		categoriesParam,
	)
	const selectedCategoriesSet = useMemo(
		() => new Set(selectedCategories),
		[selectedCategories],
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

	const handleSetViewMode = useCallback((mode: "grid" | "timeline") => {
		setLocalViewMode(mode)
		localStorage.setItem("memories-view-mode", mode)
	}, [])

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
	const _hasHighlights = !!highlightsProps

	const masonryItems: MasonryItem[] = useMemo(() => {
		const items: MasonryItem[] = []

		if (!isMobile && hasQuickNote) {
			items.push({ type: "quick-note", id: "quick-note" })
		}

		for (const doc of documents) {
			items.push({
				type: "document",
				id: doc.id,
				data: doc,
				isSelectionMode,
				isSelected: doc.id ? selectedDocumentIds.has(doc.id) : false,
			})
		}

		return items
	}, [documents, isMobile, hasQuickNote, isSelectionMode, selectedDocumentIds])

	// Stable key for Masonry based on document IDs, not item values
	const masonryKey = useMemo(() => {
		const docIds = documents.map((d) => d.id).join(",")
		return `masonry-${documents.length}-${docIds}-${isChatOpen}-${hasQuickNote}`
	}, [documents, isChatOpen, hasQuickNote])

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

	// All mutable values the render function needs — kept in a ref so the
	// function identity never changes (masonic uses render as a React component
	// type, so a new reference unmounts every item and kills textarea focus).
	const renderRef = useRef({
		quickNoteProps,
		handleCardClick,
		onToggleSelection,
		processingStatusMap,
	})
	renderRef.current = {
		quickNoteProps,
		handleCardClick,
		onToggleSelection,
		processingStatusMap,
	}

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
			const r = renderRef.current

			if (data.type === "quick-note") {
				return r.quickNoteProps ? (
					<div style={{ width }} className="p-2">
						<QuickNoteCard {...r.quickNoteProps} />
					</div>
				) : null
			}

			if (data.type === "document") {
				const doc = data.data
				return (
					<ErrorBoundary>
						<DocumentCard
							index={index}
							data={doc}
							width={width}
							onClick={r.handleCardClick}
							isSelectionMode={data.isSelectionMode}
							isSelected={data.isSelected}
							onToggleSelection={
								doc.id && r.onToggleSelection
									? () => r.onToggleSelection?.(doc.id as string)
									: undefined
							}
							processingStatus={
								doc.id ? r.processingStatusMap.get(doc.id) : undefined
							}
						/>
					</ErrorBoundary>
				)
			}

			return null
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	if (isSessionPending) {
		return <MemoriesGridLoading />
	}

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

	const allVisibleSelected =
		documents.length > 0 &&
		documents.every((d) => d.id && selectedDocumentIds.has(d.id))

	return (
		<div className="relative">
			{!isEmpty && !isSelectionMode && (
				<div
					id="filter-pills"
					className="flex items-center justify-between gap-4 mb-3 pr-2"
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
								<span className="ml-1 text-[#737373]">
									({facetsData.total})
								</span>
							)}
						</Button>
						{facetsData?.facets.map((facet: DocumentFacet) => (
							<Button
								key={facet.category}
								className={cn(
									dmSansClassName(),
									"rounded-full border border-[#161F2C] bg-[#0D121A] px-2.5 py-1 text-xs h-auto hover:bg-[#00173C] hover:border-[#2261CA33]",
									selectedCategoriesSet.has(facet.category) &&
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
						{/* View mode toggle — segmented control */}
						<div
							role="tablist"
							aria-label="View mode"
							className={cn(
								dmSansClassName(),
								"inline-flex h-8 items-center gap-0.5 rounded-full border border-[#161F2C] bg-[#0D121A] p-0.5",
							)}
						>
							<button
								type="button"
								role="tab"
								aria-selected={localViewMode === "grid"}
								className={cn(
									"inline-flex h-full items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-medium cursor-pointer transition-colors",
									localViewMode === "grid"
										? "border-[#2261CA33] bg-[#00173C] text-white"
										: "border-transparent text-[#737373] hover:bg-white/5",
								)}
								onClick={() => handleSetViewMode("grid")}
							>
								<LayoutGrid className="w-3.5 h-3.5" />
								Grid
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={localViewMode === "timeline"}
								className={cn(
									"inline-flex h-full items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-medium cursor-pointer transition-colors",
									localViewMode === "timeline"
										? "border-[#2261CA33] bg-[#00173C] text-white"
										: "border-transparent text-[#737373] hover:bg-white/5",
								)}
								onClick={() => handleSetViewMode("timeline")}
							>
								<AlignLeft className="w-3.5 h-3.5" />
								Timeline
							</button>
						</div>
						{onEnterSelectionMode && (
							<button
								type="button"
								aria-label="Select documents"
								title="Select documents"
								className="w-8 h-8 flex items-center justify-center rounded-full border border-[#161F2C] bg-[#0D121A] hover:bg-[#00173C] hover:border-[#2261CA33] transition-colors cursor-pointer"
								onClick={onEnterSelectionMode}
							>
								<BoxSelect className="w-4 h-4 text-[#737373]" />
							</button>
						)}
					</div>
				</div>
			)}

			{!isEmpty && isSelectionMode && (
				<div
					id="selection-toolbar"
					className={cn(
						dmSansClassName(),
						"flex items-center justify-between gap-3 mb-3 mr-2 px-3 py-2 rounded-full border border-[#2261CA33] bg-[#00173C]/40",
					)}
				>
					<div className="flex items-center gap-2 min-w-0">
						<span className="flex items-center gap-1.5 text-xs text-[#FAFAFA] font-medium shrink-0">
							<span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#369BFD] text-[#0B0F14] text-[11px] font-semibold">
								{selectedDocumentIds.size}
							</span>
							{selectedDocumentIds.size === 1 ? "selected" : "selected"}
						</span>
						{selectedDocumentIds.size === 0 && (
							<span className="text-xs text-[#737373] truncate">
								Tap documents to select
							</span>
						)}
					</div>
					<div className="flex items-center gap-1 shrink-0">
						<button
							type="button"
							className={cn(
								"text-xs px-2.5 h-7 rounded-full transition-colors cursor-pointer",
								allVisibleSelected
									? "text-[#737373] hover:text-white"
									: "text-[#FAFAFA] hover:bg-white/5",
							)}
							onClick={
								allVisibleSelected ? onClearSelection : handleSelectAllVisible
							}
						>
							{allVisibleSelected ? "Deselect all" : "Select visible"}
						</button>
						<button
							type="button"
							className={cn(
								"flex items-center gap-1 text-xs px-3 h-7 rounded-full transition-colors cursor-pointer",
								selectedDocumentIds.size === 0 || isBulkDeleting
									? "text-[#737373]/60 cursor-not-allowed"
									: "text-red-400 hover:text-red-300 hover:bg-red-500/10",
							)}
							onClick={handleBulkDeleteClick}
							disabled={selectedDocumentIds.size === 0 || isBulkDeleting}
						>
							<Trash2Icon className="w-3 h-3" />
							<span>Delete</span>
							{selectedDocumentIds.size > 0 && (
								<span className="text-red-400/70">
									({selectedDocumentIds.size})
								</span>
							)}
						</button>
						<div className="w-px h-4 bg-[#161F2C] mx-1" />
						<button
							type="button"
							aria-label="Exit selection mode"
							className="flex items-center gap-1 text-xs px-3 h-7 rounded-full text-[#737373] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
							onClick={onClearSelection}
						>
							<XIcon className="w-3 h-3" />
							<span>Done</span>
						</button>
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
				<MemoriesGridLoading />
			) : showNovaEmptyState ? (
				<NovaEmptyState
					onAddMemory={emptyStateProps.onAddMemory}
					onOpenIntegrations={emptyStateProps.onOpenIntegrations}
					isAllSpaces={emptyStateProps.isAllSpaces}
					spaceName={emptyStateProps.spaceName}
					onSwitchToAllSpaces={emptyStateProps.onSwitchToAllSpaces}
				/>
			) : isEmpty ? (
				<div className="h-full flex items-center justify-center p-4">
					<div className="text-center text-muted-foreground">
						No memories found
					</div>
				</div>
			) : (
				<div className="h-full overflow-auto scrollbar-thin">
					{localViewMode === "timeline" ? (
						<TimelineView
							documents={documents}
							onOpenDocument={onOpenDocument}
							hasNextPage={hasNextPage}
							isFetchingNextPage={isFetchingNextPage}
							onLoadMore={loadMoreDocuments}
						/>
					) : (
						<Masonry
							key={masonryKey}
							items={masonryItems}
							render={renderMasonryItem}
							columnGutter={0}
							rowGutter={0}
							columnWidth={260}
							maxColumnCount={isMobile ? 1 : undefined}
							itemHeightEstimate={200}
							overscanBy={3}
							onRender={maybeLoadMore}
						/>
					)}

					{isLoadingMore && localViewMode === "grid" && (
						<div className="py-10 flex items-center justify-center">
							<Loader className="size-10 animate-spin text-sky-400" />
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
					"text-[11px] text-[#737373] line-clamp-1",
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
				"text-[11px] text-[#737373] line-clamp-1",
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

const PROCESSING_WORDS = [
	"Reading",
	"Absorbing",
	"Scanning",
	"Thinking",
	"Connecting",
	"Pondering",
	"Synthesizing",
	"Reflecting",
	"Understanding",
	"Organizing",
	"Memorizing",
	"Filing",
	"Saving",
	"Learning",
	"Cataloguing",
	"Weaving",
]

function ProcessingBadge() {
	const [wordIndex, setWordIndex] = useState(() =>
		Math.floor(Math.random() * PROCESSING_WORDS.length),
	)

	useEffect(() => {
		const id = setInterval(() => {
			setWordIndex((i) => (i + 1) % PROCESSING_WORDS.length)
		}, 1800)
		return () => clearInterval(id)
	}, [])

	return (
		<div className="flex items-center gap-1">
			<span className="relative flex h-1.5 w-1.5 shrink-0">
				<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
				<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-400" />
			</span>
			<span
				className={cn(
					dmSansClassName(),
					"text-[10px] text-sky-400 font-medium",
				)}
			>
				{PROCESSING_WORDS[wordIndex]}
			</span>
		</div>
	)
}

function DoneBadge() {
	return (
		<div className="flex items-center gap-1">
			<CheckIcon
				className="w-2.5 h-2.5 text-emerald-400 shrink-0"
				strokeWidth={3}
			/>
			<span
				className={cn(
					dmSansClassName(),
					"text-[10px] text-emerald-400 font-medium",
				)}
			>
				Done
			</span>
		</div>
	)
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
		processingStatus,
	}: {
		index: number
		data: DocumentWithMemories
		width: number
		onClick: (document: DocumentWithMemories) => void
		isSelectionMode?: boolean
		isSelected?: boolean
		onToggleSelection?: () => void
		processingStatus?: string
	}) => {
		const canSelect =
			!isTemporaryId(document.id) && !isTemporaryId(document.customId)
		const [rotation, setRotation] = useState({ rotateX: 0, rotateY: 0 })
		const cardRef = useRef<HTMLButtonElement>(null)
		const [ogData, setOgData] = useState<OgData | null>(null)
		const [showDone, setShowDone] = useState(false)
		const prevStatusRef = useRef<string | undefined>(processingStatus)

		useEffect(() => {
			const prev = prevStatusRef.current
			prevStatusRef.current = processingStatus
			// Show the "done" checkmark briefly when the card leaves the processing map
			if (prev && !processingStatus) {
				setShowDone(true)
				const id = setTimeout(() => setShowDone(false), 2000)
				return () => clearTimeout(id)
			}
		}, [processingStatus])

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
			if (!needsOgData || ogData || !document.url) return

			let timeoutId: ReturnType<typeof setTimeout>
			let mounted = true

			const attemptFetch = () => {
				if (!mounted || !document.url) return
				fetchOgData(document.url).then((data) => {
					if (!mounted) return
					if (data) {
						setOgData(data)
					} else {
						// Retry when the global TTL expires
						timeoutId = setTimeout(attemptFetch, 30_000)
					}
				})
			}

			attemptFetch()

			return () => {
				mounted = false
				clearTimeout(timeoutId)
			}
		}, [needsOgData, ogData, document.url])

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
								!document.url.includes("files.supermemory.ai") &&
								(document.title ||
									(!document.url.includes("x.com") &&
										!document.url.includes("twitter.com"))) && (
									<div className="px-3">
										<div className="flex justify-between items-center gap-2">
											<p
												className={cn(
													dmSansClassName(),
													"text-[13px] text-[#E5E5E5] line-clamp-1 font-semibold",
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
									processingStatus ||
										showDone ||
										document.memoryEntries.length > 0
										? "justify-between"
										: "justify-end",
								)}
							>
								{processingStatus ? (
									<ProcessingBadge />
								) : showDone ? (
									<DoneBadge />
								) : document.memoryEntries.length > 0 ? (
									<p
										className={cn(
											dmSansClassName(),
											"text-[11px] text-[#369BFD] font-semibold flex items-center gap-1",
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
								) : null}
								<p
									className={cn(
										dmSansClassName(),
										"text-[11px] text-[#737373] line-clamp-1",
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

	if (document.metadata?.sm_internal_twitter_metadata) {
		return (
			<TweetPreview
				data={
					document.metadata?.sm_internal_twitter_metadata as unknown as Tweet
				}
			/>
		)
	}

	if (
		document.url?.includes("x.com/") ||
		document.url?.includes("twitter.com/")
	) {
		return <NotePreview document={document} />
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
