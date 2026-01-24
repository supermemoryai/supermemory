"use client"

import { useAuth } from "@lib/auth-context"
import { $fetch } from "@repo/lib/api"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { useCallback, memo, useMemo, useState, useRef, useEffect } from "react"
import type { z } from "zod"
import { Masonry, useInfiniteLoader } from "masonic"
import { dmSansClassName } from "@/lib/fonts"
import { SuperLoader } from "@/components/superloader"
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
import { getFaviconUrl } from "@/lib/url-helpers"
import { QuickNoteCard } from "./quick-note-card"
import { HighlightsCard, type HighlightItem } from "./highlights-card"
import { Button } from "@ui/components/button"

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

const IS_DEV = process.env.NODE_ENV === "development"
const PAGE_SIZE = IS_DEV ? 100 : 100
const MAX_TOTAL = 1000

// Discriminated union for masonry items
type MasonryItem =
	| { type: "quick-note"; id: string }
	| { type: "highlights-card"; id: string }
	| { type: "highlights-card-spacer"; id: string }
	| { type: "document"; id: string; data: DocumentWithMemories }

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

interface MemoriesGridProps {
	isChatOpen: boolean
	onOpenDocument: (document: DocumentWithMemories) => void
	quickNoteProps?: QuickNoteProps
	highlightsProps?: HighlightsProps
}

export function MemoriesGrid({
	isChatOpen,
	onOpenDocument,
	quickNoteProps,
	highlightsProps,
}: MemoriesGridProps) {
	const { user } = useAuth()
	const { selectedProject } = useProject()
	const isMobile = useIsMobile()
	const [selectedCategories, setSelectedCategories] = useState<
		DocumentCategory[]
	>([])

	const { data: facetsData } = useQuery({
		queryKey: ["document-facets", selectedProject],
		queryFn: async (): Promise<FacetsResponse> => {
			const response = await $fetch("@post/documents/documents/facets", {
				body: {
					containerTags: selectedProject ? [selectedProject] : undefined,
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
		queryKey: ["documents-with-memories", selectedProject, selectedCategories],
		initialPageParam: 1,
		queryFn: async ({ pageParam }) => {
			const response = await $fetch("@post/documents/documents", {
				body: {
					page: pageParam as number,
					limit: PAGE_SIZE,
					sort: "createdAt",
					order: "desc",
					containerTags: selectedProject ? [selectedProject] : undefined,
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

	const handleCategoryToggle = useCallback((category: DocumentCategory) => {
		setSelectedCategories((prev) => {
			if (prev.includes(category)) {
				return prev.filter((c) => c !== category)
			}
			return [...prev, category]
		})
	}, [])

	const handleSelectAll = useCallback(() => {
		setSelectedCategories([])
	}, [])

	const documents = useMemo(() => {
		return (
			data?.pages.flatMap((p: DocumentsResponse) => p.documents ?? []) ?? []
		)
	}, [data])

	const hasQuickNote = !!quickNoteProps
	const hasHighlights = !!highlightsProps

	const masonryItems: MasonryItem[] = useMemo(() => {
		const items: MasonryItem[] = []

		if (!isMobile) {
			if (hasQuickNote) {
				items.push({ type: "quick-note", id: "quick-note" })
			}
			if (hasHighlights) {
				items.push({ type: "highlights-card", id: "highlights-card" })
				// Add spacer to occupy the second column space for the 2-column highlights card
				items.push({
					type: "highlights-card-spacer",
					id: "highlights-card-spacer",
				})
			}
		}

		for (const doc of documents) {
			items.push({ type: "document", id: doc.id, data: doc })
		}

		return items
	}, [documents, isMobile, hasQuickNote, hasHighlights])

	// Stable key for Masonry based on document IDs, not item values
	const masonryKey = useMemo(() => {
		const docIds = documents.map((d) => d.id).join(",")
		return `masonry-${documents.length}-${docIds}-${isChatOpen}-${hasQuickNote}-${hasHighlights}`
	}, [documents, isChatOpen, hasQuickNote, hasHighlights])

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
			onOpenDocument(document)
		},
		[onOpenDocument],
	)

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
			if (data.type === "quick-note" && quickNoteProps) {
				return (
					<div className="p-2" style={{ width }}>
						<QuickNoteCard {...quickNoteProps} />
					</div>
				)
			}

			if (data.type === "highlights-card" && highlightsProps) {
				const doubleWidth = width * 2
				const cardWidth = doubleWidth - 16
				return (
					<div className="p-2" style={{ width: doubleWidth }}>
						<HighlightsCard {...highlightsProps} width={cardWidth} />
					</div>
				)
			}

			if (data.type === "highlights-card-spacer") {
				return (
					<div
						style={{
							width,
							height: 220, // Approximate height of HighlightsCard
							visibility: "hidden",
							pointerEvents: "none",
						}}
					/>
				)
			}

			if (data.type === "document") {
				return (
					<DocumentCard
						index={index}
						data={data.data}
						width={width}
						onClick={handleCardClick}
					/>
				)
			}

			return null
		},
		[handleCardClick, quickNoteProps, highlightsProps],
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

	return (
		<div className="relative">
			<div id="filter-pills" className="flex flex-wrap gap-1.5 mb-3">
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
			) : documents.length === 0 && !isPending ? (
				<div className="h-full flex items-center justify-center p-4">
					<div className="text-center text-muted-foreground">
						No memories found
					</div>
				</div>
			) : (
				<div className="h-full overflow-auto scrollbar-thin">
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

const DocumentCard = memo(
	({
		index: _index,
		data: document,
		width,
		onClick,
	}: {
		index: number
		data: DocumentWithMemories
		width: number
		onClick: (document: DocumentWithMemories) => void
	}) => {
		const [rotation, setRotation] = useState({ rotateX: 0, rotateY: 0 })
		const cardRef = useRef<HTMLButtonElement>(null)
		const [ogData, setOgData] = useState<OgData | null>(null)
		const [isLoadingOg, setIsLoadingOg] = useState(false)

		const ogImage = (document as DocumentWithMemories & { ogImage?: string })
			.ogImage
		const needsOgData =
			document.url &&
			!document.url.includes("x.com") &&
			!document.url.includes("twitter.com") &&
			!document.url.includes("files.supermemory.ai") &&
			!document.url.includes("docs.googleapis.com") &&
			(!document.title || !ogImage)

		const hideURL = document.url?.includes("docs.googleapis.com")

		useEffect(() => {
			if (needsOgData && !ogData && !isLoadingOg && document.url) {
				setIsLoadingOg(true)
				fetch(`/api/og?url=${encodeURIComponent(document.url)}`)
					.then((res) => {
						if (!res.ok) return null
						return res.json()
					})
					.then((data) => {
						if (data) {
							setOgData({
								title: data.title,
								image: data.image,
							})
						}
					})
					.catch(() => {
						// Silently fail if OG fetch fails
					})
					.finally(() => {
						setIsLoadingOg(false)
					})
			}
		}, [needsOgData, ogData, isLoadingOg, document.url])

		const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
			if (!cardRef.current) return

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
			<div className="p-2" style={{ width }}>
				<button
					ref={cardRef}
					type="button"
					className={cn(
						"rounded-[22px] bg-[#1B1F24] px-1 space-y-2 pt-1 cursor-pointer w-full",
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
						transform: `perspective(1000px) rotateX(${rotation.rotateX}deg) rotateY(${rotation.rotateY}deg)`,
						transformStyle: "preserve-3d",
					}}
				>
					<ContentPreview document={document} ogData={ogData} />
					{!(
						document.type === "image" ||
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
											"text-[10px] text-[#369BFD] line-clamp-1 font-semibold flex items-center gap-1",
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
										{document.memoryEntries.length}{" "}
										{document.memoryEntries.length === 1
											? "memory"
											: "memories"}
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
