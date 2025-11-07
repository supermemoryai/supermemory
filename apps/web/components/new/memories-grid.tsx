"use client"

import { useAuth } from "@lib/auth-context"
import { $fetch } from "@repo/lib/api"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useCallback, memo, useMemo } from "react"
import type { z } from "zod"
import { Masonry, useInfiniteLoader } from "masonic"
import { Sparkles } from "lucide-react"
import { dmSansClassName } from "@/utils/fonts"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { useProject } from "@/stores"
import { useIsMobile } from "@hooks/use-mobile"
import type { Tweet } from "react-tweet/api"
import { TweetPreview } from "./document-cards/tweet-preview"
import { WebsitePreview } from "./document-cards/website-preview"
import { GoogleDocsPreview } from "./document-cards/google-docs-preview"
import { FilePreview } from "./document-cards/file-preview"
import { NotePreview } from "./document-cards/note-preview"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

const IS_DEV = process.env.NODE_ENV === "development"
const PAGE_SIZE = IS_DEV ? 100 : 100
const MAX_TOTAL = 1000

export function MemoriesGrid() {
	const { user } = useAuth()
	const { selectedProject } = useProject()
	const isMobile = useIsMobile()

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
			const response = await $fetch("@post/documents/documents", {
				body: {
					page: pageParam as number,
					limit: (pageParam as number) === 1 ? (IS_DEV ? 500 : 500) : PAGE_SIZE,
					sort: "createdAt",
					order: "desc",
					containerTags: selectedProject ? [selectedProject] : undefined,
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

	const documents = useMemo(() => {
		return data?.pages.flatMap((p: DocumentsResponse) => p.documents ?? []) ?? []
	}, [data])

	const hasMore = hasNextPage
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
			/>
		),
		[],
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
		<div className="h-full">
			<Button
				className={cn(
					dmSansClassName(),
					"rounded-full border border-[#161F2C] bg-[#0D121A] px-4 py-2 data-[state=active]:bg-[#00173C] data-[state=active]:border-[#2261CA33] mb-4",
				)}
				data-state="active"
			>
				All
			</Button>
			{error ? (
				<div className="h-full flex items-center justify-center p-4">
					<div className="text-center text-muted-foreground">
						Error loading documents: {error.message}
					</div>
				</div>
			) : isPending ? (
				<div className="h-full flex items-center justify-center p-4">
					<div className="flex items-center gap-2">
						<Sparkles className="w-4 h-4 animate-spin text-blue-400" />
						<span>Loading memory list...</span>
					</div>
				</div>
			) : documents.length === 0 && !isPending ? (
				<div className="h-full flex items-center justify-center p-4">
					<div className="text-center text-muted-foreground">
						No memories found
					</div>
				</div>
			) : (
				<div className="h-full overflow-auto custom-scrollbar">
					<Masonry
						key={`masonry-${documents.length}-${documents.map((d) => d.id).join(",")}`}
						items={documents}
						render={renderDocumentCard}
						columnGutter={16}
						rowGutter={16}
						columnWidth={216}
						maxColumnCount={isMobile ? 1 : undefined}
						itemHeightEstimate={200}
						overscanBy={3}
						onRender={maybeLoadMore}
					/>

					{isLoadingMore && (
						<div className="py-8 flex items-center justify-center">
							<div className="flex items-center gap-2">
								<Sparkles className="w-4 h-4 animate-spin text-blue-400" />
								<span>Loading more memories...</span>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

const DocumentCard = memo(
	({
		index: _index,
		data: document,
		width,
	}: {
		index: number
		data: DocumentWithMemories
		width: number
	}) => {
		return (
			<div className="rounded-[22px] bg-[#1B1F24] px-1 space-y-2 pt-1" style={{ width }}>
				<ContentPreview document={document} />
				<div className="pb-[10px] space-y-1">
					<div className="px-3">
						<p
							className={cn(
								dmSansClassName(),
								"text-[12px] text-[#E5E5E5] line-clamp-1 font-semibold",
							)}
						>
							{document.title}
						</p>
						{document.url && (
							<p
								className={cn(
									dmSansClassName(),
									"text-[10px] text-[#737373] line-clamp-1",
								)}
							>
								{getAbsoluteUrl(document.url)}
							</p>
						)}
					</div>
					<div className="flex items-center justify-between px-3">
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
							<SyncLogoIcon className="size-2" />
							{document.memoryEntries.length} memories
						</p>
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
			</div>
		)
	},
)

DocumentCard.displayName = "DocumentCard"

function getAbsoluteUrl(url: string): string {
	try {
		const urlObj = new URL(url)
		return urlObj.host.replace(/^www\./, "")
	} catch {
		const match = url.match(/^https?:\/\/([^\/]+)/)
		const host = match?.[1] ?? url.replace(/^https?:\/\//, "")
		return host.replace(/^www\./, "")
	}
}

function SyncLogoIcon({ className }: { className?: string }) {
	return (
		<svg
			width="11"
			height="9"
			viewBox="0 0 11 9"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<g clipPath="url(#clip0_344_4856)">
				<path
					d="M10.596 3.41884H6.66329V0.000488281H5.39264V3.70946C5.39264 4.10339 5.54815 4.48172 5.82456 4.76047L9.03576 7.99894L9.9342 7.09287L7.56245 4.70102H10.5968V3.41959L10.596 3.41884Z"
					fill="url(#paint0_linear_344_4856)"
				/>
				<path
					d="M0.662587 1.57476L3.03434 3.96665H0V5.24807H3.93276V8.66641H5.20341V4.95745C5.20341 4.56349 5.0479 4.18516 4.77149 3.90644L1.56102 0.668701L0.662587 1.57476Z"
					fill="url(#paint1_linear_344_4856)"
				/>
			</g>
			<defs>
				<linearGradient
					id="paint0_linear_344_4856"
					x1="5.65905"
					y1="-0.00784643"
					x2="15.4099"
					y2="0.406611"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#369BFD" />
					<stop offset="0.41" stopColor="#36FDFD" />
					<stop offset="0.79" stopColor="#36FDB5" />
				</linearGradient>
				<linearGradient
					id="paint1_linear_344_4856"
					x1="0.266373"
					y1="0.660367"
					x2="10.0159"
					y2="1.07475"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#369BFD" />
					<stop offset="0.41" stopColor="#36FDFD" />
					<stop offset="0.79" stopColor="#36FDB5" />
				</linearGradient>
				<clipPath id="clip0_344_4856">
					<rect width="10.6889" height="8.66667" fill="white" />
				</clipPath>
			</defs>
		</svg>
	)
}

function ContentPreview({ document }: { document: DocumentWithMemories }) {
	// Check for Google Docs
	if (
		document.url?.includes("https://docs.googleapis.com/v1/documents") ||
		document.url?.includes("docs.google.com/document") ||
		document.type === "google_doc"
	) {
		return <GoogleDocsPreview document={document} />
	}

	// Check for Twitter
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

	if (
		document.type === "pdf" ||
		document.type === "image" ||
		document.type === "video" ||
		document.metadata?.mimeType
	) {
		return <FilePreview document={document} />
	}

	// Check for Website
	if (document.url?.includes("https://")) {
		return <WebsitePreview document={document} />
	}

	// Default to Note
	return <NotePreview document={document} />
}
