"use client"

import { useAuth } from "@lib/auth-context"
import { $fetch } from "@repo/lib/api"
import { ENABLE_TEMPORAL_QUERIES } from "@repo/lib/constants"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { z } from "zod"
import {
	MemoryGraph,
	isMemoryWithinFilters,
	parseTemporalFilterState,
	type TemporalFilterState,
} from "@repo/ui/memory-graph"
import { Input } from "@repo/ui/components/input"
import { Button } from "@repo/ui/components/button"
import { Dialog, DialogContent } from "@repo/ui/components/dialog"
import { ConnectAIModal } from "@/components/connect-ai-modal"
import { MasonryMemoryList } from "@/components/masonry-memory-list"
import { AddMemoryView } from "@/components/views/add-memory"
import { useChatOpen, useProject, useGraphModal } from "@/stores"
import { useGraphHighlights } from "@/stores/highlights"
import { useIsMobile } from "@hooks/use-mobile"
import { analytics } from "@/lib/analytics"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

const toDateTimeLocalValue = (iso?: string | null) => {
	if (!iso) return ""
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return ""
	const pad = (value: number) => value.toString().padStart(2, "0")
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const fromDateTimeLocalValue = (value: string): string | null => {
	if (!value) return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return null
	return date.toISOString()
}

export function Memories() {
	const { user } = useAuth()
	const { documentIds: allHighlightDocumentIds } = useGraphHighlights()
	const { selectedProject } = useProject()
	const { isOpen } = useChatOpen()
	const { isOpen: showGraphModal, setIsOpen: setShowGraphModal } =
		useGraphModal()
	const [injectedDocs, setInjectedDocs] = useState<DocumentWithMemories[]>([])
	const [showAddMemoryView, setShowAddMemoryView] = useState(false)
	const [showConnectAIModal, setShowConnectAIModal] = useState(false)
	const isMobile = useIsMobile()
	const [temporalFilters, setTemporalFilters] = useState<TemporalFilterState>({
		asOf: null,
		from: null,
		to: null,
	})
	const [showTemporalControls, setShowTemporalControls] = useState(false)

	const IS_DEV = process.env.NODE_ENV === "development"
	const PAGE_SIZE = IS_DEV ? 100 : 100
	const MAX_TOTAL = 1000
	const queryKey = useMemo(
		() => [
			"documents-with-memories",
			selectedProject,
			...(ENABLE_TEMPORAL_QUERIES
				? [
						temporalFilters.asOf ?? null,
						temporalFilters.from ?? null,
						temporalFilters.to ?? null,
					]
				: []),
		],
		[selectedProject, temporalFilters],
	)

	const {
		data,
		error,
		isPending,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteQuery<DocumentsResponse, Error>({
		queryKey,
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
		enabled: !!user, // Only run query if user is authenticated
	})

	const baseDocuments = useMemo(() => {
		return (
			data?.pages.flatMap((p: DocumentsResponse) => p.documents ?? []) ?? []
		)
	}, [data])

	const allDocuments = useMemo(() => {
		if (injectedDocs.length === 0) return baseDocuments
		const byId = new Map<string, DocumentWithMemories>()
		for (const d of injectedDocs) byId.set(d.id, d)
		for (const d of baseDocuments) if (!byId.has(d.id)) byId.set(d.id, d)
		return Array.from(byId.values())
	}, [baseDocuments, injectedDocs])

	const parsedTemporalFilters = useMemo(
		() =>
			ENABLE_TEMPORAL_QUERIES
				? parseTemporalFilterState(temporalFilters)
				: null,
		[temporalFilters],
	)

	const hasTemporalFilters =
		Boolean(temporalFilters.asOf) ||
		Boolean(temporalFilters.from) ||
		Boolean(temporalFilters.to)

	const displayDocuments = useMemo(() => {
		if (!parsedTemporalFilters) return allDocuments

		return allDocuments
			.map((doc) => {
				const filteredMemories = doc.memoryEntries.filter((memory) =>
					isMemoryWithinFilters(memory, parsedTemporalFilters),
				)
				return {
					...doc,
					memoryEntries: filteredMemories,
				}
			})
			.filter((doc) => doc.memoryEntries.length > 0)
	}, [allDocuments, parsedTemporalFilters])

	const totalLoaded = displayDocuments.length
	const hasMore = hasNextPage
	const isLoadingMore = isFetchingNextPage

	const loadMoreDocuments = useCallback(async (): Promise<void> => {
		if (hasNextPage && !isFetchingNextPage) {
			await fetchNextPage()
			return
		}
		return
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])

	const handleTemporalInputChange = useCallback(
		(field: keyof TemporalFilterState, value: string) => {
			const isoValue = fromDateTimeLocalValue(value)
			setTemporalFilters((prev) => {
				if (prev[field] === isoValue) {
					return prev
				}
				const next = { ...prev, [field]: isoValue }
				if (field === "asOf") {
					analytics.temporalAsOfSet(next.asOf ?? null)
				} else {
					analytics.temporalWindowSet(next.from ?? null, next.to ?? null)
				}
				return next
			})
		},
		[],
	)

	const handleResetTemporal = useCallback(() => {
		setTemporalFilters({ asOf: null, from: null, to: null })
		analytics.temporalAsOfSet(null)
		analytics.temporalWindowSet(null, null)
	}, [])

	const toggleTemporalControls = useCallback(() => {
		setShowTemporalControls((prev) => {
			const next = !prev
			analytics.temporalFilterVisibilityChanged(next, hasTemporalFilters)
			return next
		})
	}, [hasTemporalFilters])

	// Handle highlighted documents injection for chat
	useEffect(() => {
		if (!isOpen) return
		if (!allHighlightDocumentIds || allHighlightDocumentIds.length === 0) return
		const present = new Set<string>()
		for (const d of [...baseDocuments, ...injectedDocs]) {
			if (d.id) present.add(d.id)
			if (d.customId) present.add(d.customId as string)
		}
		const missing = allHighlightDocumentIds.filter(
			(id: string) => !present.has(id),
		)
		if (missing.length === 0) return
		let cancelled = false
		const run = async () => {
			try {
				const resp = await $fetch("@post/documents/documents/by-ids", {
					body: {
						ids: missing,
						by: "customId",
						containerTags: selectedProject ? [selectedProject] : undefined,
					},
					disableValidation: true,
				})
				if (cancelled || resp?.error) return
				const extraDocs = resp?.data?.documents as
					| DocumentWithMemories[]
					| undefined
				if (!extraDocs || extraDocs.length === 0) return
				setInjectedDocs((prev) => {
					const seen = new Set<string>([
						...prev.map((d) => d.id),
						...baseDocuments.map((d) => d.id),
					])
					const merged = [...prev]
					for (const doc of extraDocs) {
						if (!seen.has(doc.id)) {
							merged.push(doc)
							seen.add(doc.id)
						}
					}
					return merged
				})
			} catch {}
		}
		void run()
		return () => {
			cancelled = true
		}
	}, [
		isOpen,
		allHighlightDocumentIds,
		baseDocuments,
		injectedDocs,
		selectedProject,
	])

	// Show connect AI modal if no documents
	useEffect(() => {
		if (displayDocuments.length === 0 && !isMobile) {
			setShowConnectAIModal(true)
		}
	}, [displayDocuments.length, isMobile])

	useEffect(() => {
		if (ENABLE_TEMPORAL_QUERIES && hasTemporalFilters) {
			setShowTemporalControls(true)
		}
	}, [hasTemporalFilters])

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
		<>
			{ENABLE_TEMPORAL_QUERIES && (
				<div className="mx-4 mb-6 md:mx-24">
					<div className="rounded-xl border border-border/40 bg-background/60 p-4 backdrop-blur">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-sm font-semibold text-foreground">
									Temporal filters{" "}
									<span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-primary">
										Beta
									</span>
								</p>
								<p className="text-xs text-muted-foreground">
									View memories from a specific moment or window. When server
									support lands, queries will apply remotely.
								</p>
							</div>
							<div className="flex items-center gap-2">
								{hasTemporalFilters && (
									<Button
										size="sm"
										variant="ghost"
										onClick={handleResetTemporal}
									>
										Reset
									</Button>
								)}
								<Button
									size="sm"
									variant="ghost"
									onClick={toggleTemporalControls}
								>
									{showTemporalControls ? "Hide" : "Show"}
								</Button>
							</div>
						</div>
						{showTemporalControls && (
							<div className="mt-4 grid gap-3 sm:grid-cols-3">
								<label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
									<span>As of</span>
									<Input
										type="datetime-local"
										value={toDateTimeLocalValue(temporalFilters.asOf)}
										onChange={(event) =>
											handleTemporalInputChange("asOf", event.target.value)
										}
									/>
								</label>
								<label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
									<span>Valid from</span>
									<Input
										type="datetime-local"
										value={toDateTimeLocalValue(temporalFilters.from)}
										onChange={(event) =>
											handleTemporalInputChange("from", event.target.value)
										}
									/>
								</label>
								<label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
									<span>Valid until</span>
									<Input
										type="datetime-local"
										value={toDateTimeLocalValue(temporalFilters.to)}
										onChange={(event) =>
											handleTemporalInputChange("to", event.target.value)
										}
									/>
								</label>
							</div>
						)}
					</div>
				</div>
			)}
			<div className="relative h-full mx-4 md:mx-24">
				<MasonryMemoryList
					documents={displayDocuments}
					error={error}
					hasMore={hasMore}
					isLoading={isPending}
					isLoadingMore={isLoadingMore}
					loadMoreDocuments={loadMoreDocuments}
					totalLoaded={totalLoaded}
				>
					<div className="absolute inset-0 flex items-center justify-center">
						{!isMobile ? (
							<ConnectAIModal
								onOpenChange={setShowConnectAIModal}
								open={showConnectAIModal}
							>
								<div className="rounded-xl overflow-hidden cursor-pointer hover:bg-white/5 transition-colors p-6">
									<div className="relative z-10 text-slate-200 text-center">
										<div className="flex flex-col gap-3">
											<button
												className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline"
												onClick={(e) => {
													e.stopPropagation()
													setShowAddMemoryView(true)
													setShowConnectAIModal(false)
												}}
												type="button"
											>
												Add your first memory
											</button>
										</div>
									</div>
								</div>
							</ConnectAIModal>
						) : (
							<div className="rounded-xl overflow-hidden cursor-pointer hover:bg-white/5 transition-colors p-6">
								<div className="relative z-10 text-slate-200 text-center">
									<div className="flex flex-col gap-3">
										<button
											className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline"
											onClick={(e) => {
												e.stopPropagation()
												setShowAddMemoryView(true)
											}}
											type="button"
										>
											Add your first memory
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</MasonryMemoryList>

				{showAddMemoryView && (
					<AddMemoryView
						initialTab="note"
						onClose={() => setShowAddMemoryView(false)}
					/>
				)}
			</div>

			{/* Memory Graph Modal */}
			<Dialog open={showGraphModal} onOpenChange={setShowGraphModal}>
				<DialogContent
					className="w-[95vw] h-[95vh] p-0  max-w-6xl sm:max-w-6xl"
					showCloseButton={true}
				>
					<div className="w-full h-full">
						<MemoryGraph
							documents={allDocuments}
							error={error}
							hasMore={hasMore}
							isLoading={isPending}
							isLoadingMore={isLoadingMore}
							loadMoreDocuments={loadMoreDocuments}
							totalLoaded={totalLoaded}
							variant="console"
							showSpacesSelector={true}
							highlightDocumentIds={allHighlightDocumentIds}
							highlightsVisible={isOpen}
							temporalFilters={ENABLE_TEMPORAL_QUERIES ? temporalFilters : null}
						>
							<div className="absolute inset-0 flex items-center justify-center">
								{!isMobile ? (
									<ConnectAIModal
										onOpenChange={setShowConnectAIModal}
										open={showConnectAIModal}
									>
										<div className="rounded-xl overflow-hidden cursor-pointer hover:bg-white/5 transition-colors p-6">
											<div className="relative z-10 text-slate-200 text-center">
												<div className="flex flex-col gap-3">
													<button
														className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline"
														onClick={(e) => {
															e.stopPropagation()
															setShowAddMemoryView(true)
															setShowConnectAIModal(false)
														}}
														type="button"
													>
														Add your first memory
													</button>
												</div>
											</div>
										</div>
									</ConnectAIModal>
								) : (
									<div className="rounded-xl overflow-hidden cursor-pointer hover:bg-white/5 transition-colors p-6">
										<div className="relative z-10 text-slate-200 text-center">
											<div className="flex flex-col gap-3">
												<button
													className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline"
													onClick={(e) => {
														e.stopPropagation()
														setShowAddMemoryView(true)
													}}
													type="button"
												>
													Add your first memory
												</button>
											</div>
										</div>
									</div>
								)}
							</div>
						</MemoryGraph>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
