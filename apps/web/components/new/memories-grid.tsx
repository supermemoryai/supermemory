"use client"

import { useAuth } from "@lib/auth-context"
import { $fetch } from "@repo/lib/api"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useCallback, memo, useMemo } from "react"
import type { z } from "zod"
import { Masonry, useInfiniteLoader } from "masonic"
import { dmSansClassName } from "@/utils/fonts"
import { SuperLoader } from "@/components/superloader"
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
import { YoutubePreview } from "./document-cards/youtube-preview"
import { getAbsoluteUrl, isYouTubeUrl, useYouTubeChannelName } from "./utils"
import { SyncLogoIcon } from "@ui/assets/icons"
import { McpPreview } from "./document-cards/mcp-preview"

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
		return (
			data?.pages.flatMap((p: DocumentsResponse) => p.documents ?? []) ?? []
		)
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
		}) => <DocumentCard index={index} data={data} width={width} />,
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
	}: {
		index: number
		data: DocumentWithMemories
		width: number
	}) => {
		return (
			<div
				className={cn(
					"rounded-[22px] bg-[#1B1F24] px-1 space-y-2 pt-1",
					document.type === "image" ||
						document.metadata?.mimeType?.toString().startsWith("image/")
						? "pb-1"
						: "",
				)}
				style={{
					width,
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
			>
				<ContentPreview document={document} />
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
									<p
										className={cn(
											dmSansClassName(),
											"text-[12px] text-[#E5E5E5] line-clamp-1 font-semibold",
										)}
									>
										{document.title}
									</p>

									<DocumentUrlDisplay url={document.url} />
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
									{document.memoryEntries.length === 1 ? "memory" : "memories"}
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
			</div>
		)
	},
)

DocumentCard.displayName = "DocumentCard"

function ContentPreview({ document }: { document: DocumentWithMemories }) {
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
		return <WebsitePreview document={document} />
	}

	// Default to Note
	return <NotePreview document={document} />
}
