"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import {
	MemoryGraph,
	type GraphApiDocument,
	type GraphApiMemory,
	type GraphThemeColors,
	type MemoryRelation,
} from "@supermemory/memory-graph"
import { generateMockGraphData } from "@supermemory/memory-graph/mock-data"

interface PlaygroundApiMemory {
	id: string
	memory?: string | null
	content?: string | null
	isStatic?: boolean
	spaceId?: string | null
	isLatest?: boolean
	isForgotten?: boolean
	forgetAfter?: string | null
	forgetReason?: string | null
	version?: number
	parentMemoryId?: string | null
	rootMemoryId?: string | null
	createdAt: string
	updatedAt: string
	relation?: MemoryRelation | null
	updatesMemoryId?: string | null
	nextVersionId?: string | null
	memoryRelations?: Record<string, MemoryRelation> | null
	spaceContainerTag?: string | null
}

interface PlaygroundApiDocument {
	id: string
	title: string | null
	summary?: string | null
	documentType?: string
	type?: string
	containerTags?: string[]
	createdAt: string
	updatedAt: string
	memories?: PlaygroundApiMemory[]
	memoryEntries?: PlaygroundApiMemory[]
}

interface DocumentsResponse {
	documents: PlaygroundApiDocument[]
	pagination: {
		currentPage: number
		limit: number
		totalItems: number
		totalPages: number
	}
}

interface ContainerTagOption {
	id: string
	name?: string | null
	containerTag: string
	documentCount?: number
	memoryCount?: number
	lastActivityAt?: string | null
}

type GraphVariant = "consumer" | "console"
type LoadBehavior = "zoom" | "manual" | "background"

const PAGE_SIZE = 100
const BACKGROUND_LOAD_DELAY_MS = 900
const CONSUMER_GRAPH_COLORS = {
	bg: "transparent",
	edgeDerives: "#9ca3af",
} satisfies Partial<GraphThemeColors>

/** Convert the external API format to the internal graph format */
function toGraphDocuments(docs: PlaygroundApiDocument[]): GraphApiDocument[] {
	return docs.map((doc) => {
		const memories = doc.memories ?? doc.memoryEntries ?? []

		return {
			id: doc.id,
			title: doc.title,
			summary: doc.summary ?? null,
			documentType: doc.documentType ?? doc.type ?? "unknown",
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
			memories: memories.map(
				(mem): GraphApiMemory => ({
					id: mem.id,
					memory: mem.memory ?? mem.content ?? "",
					isStatic: mem.isStatic ?? false,
					spaceId: mem.spaceId ?? "",
					isLatest: mem.isLatest ?? true,
					isForgotten: mem.isForgotten ?? false,
					forgetAfter: mem.forgetAfter ?? null,
					forgetReason: mem.forgetReason ?? null,
					version: mem.version ?? 1,
					parentMemoryId: mem.parentMemoryId ?? null,
					rootMemoryId: mem.rootMemoryId ?? null,
					createdAt: mem.createdAt,
					updatedAt: mem.updatedAt,
					relation: mem.relation ?? null,
					updatesMemoryId: mem.updatesMemoryId ?? null,
					nextVersionId: mem.nextVersionId ?? null,
					memoryRelations: mem.memoryRelations ?? null,
					spaceContainerTag: mem.spaceContainerTag ?? null,
				}),
			),
		}
	})
}

export default function Home() {
	const [apiKey, setApiKey] = useState("")
	const [containerTag, setContainerTag] = useState("")
	const [containerTags, setContainerTags] = useState<ContainerTagOption[]>([])
	const [isLoadingContainerTags, setIsLoadingContainerTags] = useState(false)
	const [containerTagsError, setContainerTagsError] = useState<Error | null>(
		null,
	)
	const [documents, setDocuments] = useState<PlaygroundApiDocument[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [error, setError] = useState<Error | null>(null)
	const [showGraph, setShowGraph] = useState(false)
	const [stressTestCount, setStressTestCount] = useState(0)
	const [graphVariant, setGraphVariant] = useState<GraphVariant>("consumer")
	const [loadBehavior, setLoadBehavior] = useState<LoadBehavior>("zoom")
	const [pagination, setPagination] = useState<
		DocumentsResponse["pagination"] | null
	>(null)

	// State for slideshow
	const [isSlideshowActive, setIsSlideshowActive] = useState(false)

	// Mock data for stress testing
	const [mockData, setMockData] = useState<{
		documents: GraphApiDocument[]
	} | null>(null)

	const selectedContainerTags = useMemo(() => {
		const trimmed = containerTag.trim()
		return trimmed ? [trimmed] : undefined
	}, [containerTag])

	const fetchContainerTags = useCallback(async () => {
		if (!apiKey || isLoadingContainerTags) return

		setIsLoadingContainerTags(true)
		setContainerTagsError(null)

		try {
			const response = await fetch("/api/container-tags", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ apiKey }),
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || "Failed to fetch container tags")
			}

			const data = (await response.json()) as ContainerTagOption[]
			setContainerTags(data)
		} catch (err) {
			setContainerTagsError(
				err instanceof Error ? err : new Error("Unknown error"),
			)
		} finally {
			setIsLoadingContainerTags(false)
		}
	}, [apiKey, isLoadingContainerTags])

	const fetchDocuments = useCallback(
		async (page: number, append = false) => {
			if (!apiKey) return

			if (append) {
				setIsLoadingMore(true)
			} else {
				setIsLoading(true)
			}
			setError(null)

			try {
				const response = await fetch("/api/graph", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						apiKey,
						page,
						limit: PAGE_SIZE,
						sort: "createdAt",
						order: "desc",
						containerTags: selectedContainerTags,
					}),
				})

				if (!response.ok) {
					const errorData = await response.json()
					throw new Error(errorData.error || "Failed to fetch documents")
				}

				const data: DocumentsResponse = await response.json()

				if (append) {
					setDocuments((prev) => [...prev, ...data.documents])
				} else {
					setDocuments(data.documents)
				}

				setPagination(data.pagination)
				setShowGraph(true)
				setMockData(null)
				setStressTestCount(0)
			} catch (err) {
				setError(err instanceof Error ? err : new Error("Unknown error"))
			} finally {
				setIsLoading(false)
				setIsLoadingMore(false)
			}
		},
		[apiKey, selectedContainerTags],
	)

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (apiKey) {
			setDocuments([])
			setPagination(null)
			void fetchContainerTags()
			fetchDocuments(1)
		}
	}

	const handleLoadMoreDocuments = useCallback(() => {
		if (!pagination || pagination.currentPage >= pagination.totalPages) return
		fetchDocuments(pagination.currentPage + 1, true)
	}, [fetchDocuments, pagination])

	const handleStressTest = (count: number) => {
		const data = generateMockGraphData({
			documentCount: count,
			memoriesPerDoc: [2, 5],
			seed: 12345,
		})
		setMockData({ documents: data.documents })
		setDocuments([])
		setPagination(null)
		setStressTestCount(count)
		setShowGraph(true)
		setError(null)
	}

	// Toggle slideshow
	const handleToggleSlideshow = () => {
		setIsSlideshowActive((prev) => !prev)
	}

	// Handle slideshow node change
	const handleSlideshowNodeChange = useCallback((nodeId: string | null) => {
		console.log("Slideshow showing node:", nodeId)
	}, [])

	// Handle slideshow stop
	const handleSlideshowStop = useCallback(() => {
		setIsSlideshowActive(false)
	}, [])

	// Convert real documents to graph format
	const graphDocuments = useMemo(() => {
		if (mockData) return mockData.documents
		return toGraphDocuments(documents)
	}, [documents, mockData])

	const availableContainerTags = useMemo(() => {
		const options = new Map<string, ContainerTagOption>()
		for (const tag of containerTags) {
			if (tag.containerTag) options.set(tag.containerTag, tag)
		}
		for (const doc of documents) {
			for (const tag of doc.containerTags ?? []) {
				if (tag && !options.has(tag)) {
					options.set(tag, { id: tag, containerTag: tag, name: tag })
				}
			}
			const memories = doc.memories ?? doc.memoryEntries ?? []
			for (const mem of memories) {
				const tag = mem.spaceContainerTag
				if (tag && !options.has(tag)) {
					options.set(tag, { id: tag, containerTag: tag, name: tag })
				}
			}
		}
		return [...options.values()]
	}, [containerTags, documents])

	const displayCount = mockData ? stressTestCount : documents.length
	const hasMore =
		!mockData &&
		pagination != null &&
		pagination.currentPage < pagination.totalPages
	const totalCount = mockData
		? stressTestCount
		: (pagination?.totalItems ?? documents.length)
	const maxNodes = mockData ? 1000 : undefined
	const graphHandlesLoadMore = loadBehavior === "zoom"

	useEffect(() => {
		if (
			loadBehavior !== "background" ||
			!showGraph ||
			mockData ||
			!hasMore ||
			isLoading ||
			isLoadingMore ||
			error
		) {
			return
		}

		const timer = window.setTimeout(
			handleLoadMoreDocuments,
			BACKGROUND_LOAD_DELAY_MS,
		)
		return () => window.clearTimeout(timer)
	}, [
		error,
		handleLoadMoreDocuments,
		hasMore,
		isLoading,
		isLoadingMore,
		loadBehavior,
		mockData,
		showGraph,
	])

	return (
		<div className="flex flex-col h-screen bg-zinc-950">
			{/* Header */}
			<header className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-6 py-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-xl font-semibold text-white">
							Memory Graph Playground
						</h1>
						<p className="text-sm text-zinc-400">
							Test the @supermemory/memory-graph package
						</p>
					</div>

					<form onSubmit={handleSubmit} className="flex items-center gap-3">
						<input
							type="password"
							placeholder="Enter your Supermemory API key"
							value={apiKey}
							onChange={(e) => {
								setApiKey(e.target.value)
								setContainerTags([])
								setContainerTagsError(null)
							}}
							className="w-80 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
						<div className="flex items-center gap-2">
							<input
								list="container-tag-options"
								value={containerTag}
								onChange={(e) => setContainerTag(e.target.value)}
								onFocus={() => {
									if (availableContainerTags.length === 0) {
										void fetchContainerTags()
									}
								}}
								disabled={!apiKey}
								placeholder={
									isLoadingContainerTags
										? "Loading container tags..."
										: "All container tags"
								}
								className="w-64 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
							/>
							<datalist id="container-tag-options">
								{availableContainerTags.map((tag) => (
									<option key={tag.containerTag} value={tag.containerTag}>
										{tag.name && tag.name !== tag.containerTag
											? `${tag.name} (${tag.containerTag})`
											: tag.containerTag}
									</option>
								))}
							</datalist>
							<button
								type="button"
								onClick={() => void fetchContainerTags()}
								disabled={!apiKey || isLoadingContainerTags}
								className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isLoadingContainerTags ? "Loading..." : "Tags"}
							</button>
						</div>
						<button
							type="submit"
							disabled={!apiKey || isLoading}
							className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isLoading ? "Loading..." : "Load Graph"}
						</button>
					</form>
				</div>
			</header>

			{/* Controls Panel */}
			<div className="shrink-0 border-b border-zinc-800 bg-zinc-900/50 px-6 py-3">
				<div className="flex items-center justify-between text-sm">
					<div className="flex items-center gap-6">
						<div className="flex items-center gap-2">
							<span className="text-zinc-400">Documents:</span>
							<span className="font-mono text-emerald-400">{displayCount}</span>
						</div>
						{stressTestCount > 0 && (
							<span className="rounded bg-amber-900/50 px-2 py-0.5 text-xs text-amber-400">
								Stress Test Mode
							</span>
						)}
						{pagination && !mockData && (
							<span className="font-mono text-xs text-zinc-500">
								Page {pagination.currentPage}/{pagination.totalPages}
							</span>
						)}
						{selectedContainerTags && (
							<span className="rounded bg-sky-950/70 px-2 py-0.5 font-mono text-xs text-sky-300">
								{selectedContainerTags[0]}
							</span>
						)}
						{containerTagsError && (
							<span className="text-xs text-amber-300">
								{containerTagsError.message}
							</span>
						)}
					</div>
					<div className="flex items-center gap-3">
						<span className="text-zinc-500 text-xs">Mode:</span>
						<div className="flex rounded-lg border border-zinc-700 bg-zinc-950/50 p-0.5">
							{(["consumer", "console"] as const).map((variant) => (
								<button
									key={variant}
									type="button"
									onClick={() => setGraphVariant(variant)}
									className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
										graphVariant === variant
											? "bg-blue-600 text-white"
											: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
									}`}
									aria-pressed={graphVariant === variant}
								>
									{variant}
								</button>
							))}
						</div>
						<div className="h-6 w-px bg-zinc-700" />
						<span className="text-zinc-500 text-xs">Load:</span>
						<div className="flex rounded-lg border border-zinc-700 bg-zinc-950/50 p-0.5">
							{(["zoom", "manual", "background"] as const).map((behavior) => (
								<button
									key={behavior}
									type="button"
									onClick={() => setLoadBehavior(behavior)}
									className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
										loadBehavior === behavior
											? "bg-emerald-600 text-white"
											: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
									}`}
									aria-pressed={loadBehavior === behavior}
								>
									{behavior}
								</button>
							))}
						</div>
						{loadBehavior === "manual" && (
							<button
								type="button"
								onClick={handleLoadMoreDocuments}
								disabled={!hasMore || isLoadingMore}
								className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isLoadingMore
									? "Loading..."
									: hasMore
										? "Load next"
										: "All loaded"}
							</button>
						)}
						{loadBehavior === "background" && !mockData && hasMore && (
							<span className="rounded bg-emerald-950/70 px-2 py-0.5 text-xs text-emerald-300">
								Auto paging
							</span>
						)}
						<div className="h-6 w-px bg-zinc-700" />
						{/* Stress test buttons */}
						<span className="text-zinc-500 text-xs">Stress Test:</span>
						{[50, 100, 200, 500].map((count) => (
							<button
								key={count}
								type="button"
								onClick={() => handleStressTest(count)}
								className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
									stressTestCount === count
										? "bg-amber-600 text-white"
										: "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
								}`}
							>
								{count} docs
							</button>
						))}
						<div className="h-6 w-px bg-zinc-700" />
						<button
							type="button"
							onClick={handleToggleSlideshow}
							className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
								isSlideshowActive
									? "bg-blue-600 text-white hover:bg-blue-700"
									: "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
							}`}
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
							>
								{isSlideshowActive ? (
									<rect x="6" y="6" width="12" height="12" />
								) : (
									<path d="M8 5v14l11-7z" />
								)}
							</svg>
							Slideshow
						</button>
					</div>
				</div>
			</div>

			{/* Main content */}
			<main className="flex-1 overflow-hidden">
				{!showGraph ? (
					<div className="flex h-full items-center justify-center">
						<div className="max-w-md text-center">
							<div className="mb-6 text-6xl">
								<svg
									className="mx-auto h-16 w-16 text-zinc-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
									/>
								</svg>
							</div>
							<h2 className="mb-2 text-xl font-semibold text-white">
								Get Started
							</h2>
							<p className="mb-6 text-zinc-400">
								Enter your API key above, or click a stress test button to
								generate mock data.
							</p>
							<div className="text-left text-sm text-zinc-500">
								<p className="mb-2 font-medium text-zinc-400">
									Features to test:
								</p>
								<ul className="list-inside list-disc space-y-1">
									<li>Pan and zoom the graph</li>
									<li>Click on nodes to see details</li>
									<li>Drag nodes around</li>
									<li>Arrow key navigation</li>
									<li>Stress test with 50-500 documents</li>
									<li>FPS counter (shown during stress tests)</li>
								</ul>
							</div>
						</div>
					</div>
				) : (
					<div className="h-full w-full">
						<MemoryGraph
							documents={graphDocuments}
							isLoading={isLoading}
							isLoadingMore={isLoadingMore}
							hasMore={graphHandlesLoadMore && hasMore}
							onLoadMore={
								graphHandlesLoadMore && hasMore
									? handleLoadMoreDocuments
									: undefined
							}
							error={error}
							variant={graphVariant}
							maxNodes={maxNodes}
							showFps={stressTestCount > 0}
							isSlideshowActive={isSlideshowActive}
							onSlideshowNodeChange={handleSlideshowNodeChange}
							onSlideshowStop={handleSlideshowStop}
							totalCount={totalCount}
							colors={
								graphVariant === "consumer" ? CONSUMER_GRAPH_COLORS : undefined
							}
						>
							<div className="flex h-full items-center justify-center">
								<p className="text-zinc-400">
									No memories found. Add some content to see your graph.
								</p>
							</div>
						</MemoryGraph>
					</div>
				)}
			</main>
		</div>
	)
}
