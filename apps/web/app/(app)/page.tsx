"use client"

import {
	useState,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react"
import { AnimatePresence, motion } from "motion/react"
import { useQueryState } from "nuqs"
import { Header, PublicHeader } from "@/components/header"
import { ChatSidebar, HomeChatComposer } from "@/components/chat"
import { DashboardView } from "@/components/dashboard-view"
import { MemoriesGrid } from "@/components/memories-grid"
import { GraphLayoutView } from "@/components/graph-layout-view"
import { IntegrationsView, DetailWrapper } from "@/components/integrations-view"
import { MCPDetailView } from "@/components/mcp-modal/mcp-detail-view"
import { XBookmarksDetailView } from "@/components/onboarding/x-bookmarks-detail-view"
import { ChromeDetail } from "@/components/integrations/chrome-detail"
import { ShortcutsDetail } from "@/components/integrations/shortcuts-detail"
import { RaycastDetail } from "@/components/integrations/raycast-detail"
import { PluginsDetail } from "@/components/integrations/plugins-detail"
import { AnimatedGradientBackground } from "@/components/animated-gradient-background"
import { AddDocumentModal } from "@/components/add-document"
import { DocumentModal } from "@/components/document-modal"
import { DocumentsCommandPalette } from "@/components/documents-command-palette"
import { FullscreenNoteModal } from "@/components/fullscreen-note-modal"
import type { HighlightItem } from "@/components/highlights-card"
import { HotkeysProvider } from "react-hotkeys-hook"
import { useHotkeys } from "react-hotkeys-hook"
import { useIsMobile } from "@hooks/use-mobile"
import { useAuth } from "@lib/auth-context"
import { useProject } from "@/stores"
import { useContainerTags } from "@/hooks/use-container-tags"
import { DEFAULT_PROJECT_ID } from "@lib/constants"
import {
	useQuickNoteDraftReset,
	useQuickNoteDraft,
} from "@/stores/quick-note-draft"
import { analytics } from "@/lib/analytics"
import type { ModelId } from "@/lib/models"
import { useDocumentMutations } from "@/hooks/use-document-mutations"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { useViewMode } from "@/lib/view-mode-context"
import type { MemoryOfDay } from "@/components/dashboard-view"
import { ErrorBoundary } from "@/components/error-boundary"
import { cn } from "@lib/utils"
import {
	addDocumentParam,
	searchParam,
	qParam,
	docParam,
	fullscreenParam,
	threadParam,
	type IntegrationParamValue,
} from "@/lib/search-params"
import { getChatSpaceDisplayLabel } from "@/lib/chat-space-label"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

function subscribeViewportWidth(cb: () => void) {
	window.addEventListener("resize", cb)
	return () => window.removeEventListener("resize", cb)
}

function getViewportWidth() {
	return window.innerWidth
}

const GRADIENT_TOP_WIDTH_MAX = 1440

function gradientTopPositionForWidth(width: number) {
	const minW = 320
	const pctWide = 15
	const pctNarrow = 55
	const w = Math.min(GRADIENT_TOP_WIDTH_MAX, Math.max(minW, width))
	const t = (w - minW) / (GRADIENT_TOP_WIDTH_MAX - minW)
	const eased = t * t
	return `${Math.round(pctNarrow + eased * (pctWide - pctNarrow))}%`
}

function ViewErrorFallback() {
	return (
		<div className="flex-1 flex items-center justify-center p-8">
			<p className="text-muted-foreground">
				Something went wrong.{" "}
				<button
					type="button"
					className="underline cursor-pointer"
					onClick={() => window.location.reload()}
				>
					Reload
				</button>
			</p>
		</div>
	)
}

export default function NewPage() {
	const isMobile = useIsMobile()
	const { user, session } = useAuth()

	const { selectedProject, selectedProjects } = useProject()
	const selectedProjectTag = selectedProjects[0]
	const { allProjects } = useContainerTags()
	const dashboardSpaceLabel = useMemo(
		() =>
			getChatSpaceDisplayLabel({
				selectedProject,
				allProjects,
			}),
		[selectedProject, allProjects],
	)
	const emptyStateSpaceName = selectedProjectTag
		? selectedProjectTag === DEFAULT_PROJECT_ID
			? "My Space"
			: (allProjects.find((p) => p.containerTag === selectedProjectTag)?.name ??
				selectedProjectTag)
		: undefined

	const { viewMode, setViewMode } = useViewMode()
	const queryClient = useQueryClient()
	const [highlightsForceAt, setHighlightsForceAt] = useState(0)

	// Chrome extension auth: send session token via postMessage so the content script can store it
	useEffect(() => {
		const url = new URL(window.location.href)
		if (!url.searchParams.get("extension-auth-success")) return
		const sessionToken = session?.token
		const userData = { email: user?.email, name: user?.name, userId: user?.id }
		if (sessionToken && userData.email) {
			window.postMessage(
				{ token: encodeURIComponent(sessionToken), userData },
				window.location.origin,
			)
			url.searchParams.delete("extension-auth-success")
			window.history.replaceState({}, "", url.toString())
		}
	}, [user, session])

	// URL-driven modal states
	const [addDoc, setAddDoc] = useQueryState("add", addDocumentParam)
	const [isSearchOpen, setIsSearchOpen] = useQueryState("search", searchParam)
	const [searchPrefill, setSearchPrefill] = useQueryState("q", qParam)
	const [docId, setDocId] = useQueryState("doc", docParam)
	const [isFullscreen, setIsFullscreen] = useQueryState(
		"fullscreen",
		fullscreenParam,
	)
	const [, setThreadIdUrl] = useQueryState("thread", threadParam)

	// Ephemeral local state (not worth URL-encoding)
	const [fullscreenInitialContent, setFullscreenInitialContent] = useState("")
	const [queuedChatSeed, setQueuedChatSeed] = useState<string | null>(null)
	const [queuedChatModel, setQueuedChatModel] = useState<ModelId | null>(null)
	const [queuedMessageSource, setQueuedMessageSource] = useState<
		"highlight" | "home"
	>("highlight")
	const [selectedDocument, setSelectedDocument] =
		useState<DocumentWithMemories | null>(null)

	// Clear document when docId is removed (e.g. back button)
	useEffect(() => {
		if (!docId) setSelectedDocument(null)
	}, [docId])

	useEffect(() => {
		if (viewMode === "dashboard") void setThreadIdUrl(null)
	}, [viewMode, setThreadIdUrl])

	// Resolve document from cache when loading with ?doc=<id> (deep link / refresh)
	useEffect(() => {
		if (!docId || selectedDocument) return

		const tryResolve = () => {
			const queries = queryClient.getQueriesData<{
				pages: DocumentsResponse[]
			}>({ queryKey: ["documents-with-memories"] })
			for (const [, data] of queries) {
				if (!data?.pages) continue
				for (const page of data.pages) {
					const doc = page.documents?.find((d) => d.id === docId)
					if (doc) {
						setSelectedDocument(doc)
						return true
					}
				}
			}
			return false
		}

		if (tryResolve()) return

		const unsubscribe = queryClient.getQueryCache().subscribe(() => {
			if (tryResolve()) unsubscribe()
		})
		return unsubscribe
	}, [docId, selectedDocument, queryClient])

	const resetDraft = useQuickNoteDraftReset(selectedProject)
	const { draft: quickNoteDraft } = useQuickNoteDraft(selectedProject || "")
	const quickNoteDraftRef = useRef(quickNoteDraft)
	quickNoteDraftRef.current = quickNoteDraft

	const { noteMutation, bulkDeleteMutation } = useDocumentMutations({
		onClose: () => {
			resetDraft()
			setIsFullscreen(false)
		},
	})

	const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(
		new Set(),
	)
	const [isSelectionMode, setIsSelectionMode] = useState(false)

	const handleToggleSelection = useCallback((documentId: string) => {
		setSelectedDocumentIds((prev) => {
			const next = new Set(prev)
			if (next.has(documentId)) {
				next.delete(documentId)
			} else {
				next.add(documentId)
			}
			return next
		})
	}, [])

	const handleClearSelection = useCallback(() => {
		setSelectedDocumentIds(new Set())
		setIsSelectionMode(false)
	}, [])

	const handleEnterSelectionMode = useCallback(() => {
		setIsSelectionMode(true)
	}, [])

	const handleSelectAllVisible = useCallback((visibleIds: string[]) => {
		setSelectedDocumentIds((prev) => {
			const next = new Set(prev)
			for (const id of visibleIds) {
				next.add(id)
			}
			return next
		})
	}, [])

	const handleBulkDelete = useCallback(() => {
		const ids = Array.from(selectedDocumentIds)
		if (ids.length === 0) return
		bulkDeleteMutation.mutate(
			{ documentIds: ids },
			{
				onSuccess: () => {
					setSelectedDocumentIds(new Set())
					setIsSelectionMode(false)
					if (selectedDocument && ids.includes(selectedDocument.id ?? "")) {
						setDocId(null)
					}
				},
			},
		)
	}, [selectedDocumentIds, bulkDeleteMutation, selectedDocument, setDocId])

	type SpaceHighlightsResponse = {
		highlights: HighlightItem[]
		questions: string[]
		generatedAt: string
	}

	const HIGHLIGHTS_CACHE_NAME = "space-highlights-v1"
	const HIGHLIGHTS_MAX_AGE = 4 * 60 * 60 * 1000 // 4 hours

	const handleResetHighlights = useCallback(async () => {
		toast.success("Refreshing daily brief…")
		try {
			await caches.delete(HIGHLIGHTS_CACHE_NAME)
		} catch {}
		setHighlightsForceAt(Date.now())
	}, [])

	const { data: highlightsData, isLoading: isLoadingHighlights } =
		useQuery<SpaceHighlightsResponse>({
			queryKey: ["space-highlights", selectedProject, highlightsForceAt],
			queryFn: async (): Promise<SpaceHighlightsResponse> => {
				const spaceId = selectedProject || "sm_project_default"
				const forceRefresh = highlightsForceAt > 0
				const cacheKey = `${process.env.NEXT_PUBLIC_BACKEND_URL}/v3/space-highlights?spaceId=${spaceId}`

				if (!forceRefresh) {
					const cache = await caches.open(HIGHLIGHTS_CACHE_NAME)
					const cached = await cache.match(cacheKey)
					if (cached) {
						const age =
							Date.now() - Number(cached.headers.get("x-cached-at") || 0)
						if (age < HIGHLIGHTS_MAX_AGE) {
							return cached.json()
						}
					}
				}

				const response = await fetch(
					`${process.env.NEXT_PUBLIC_BACKEND_URL}/v3/space-highlights`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
						body: JSON.stringify({
							spaceId,
							highlightsCount: 3,
							questionsCount: 4,
							includeHighlights: true,
							includeQuestions: true,
							forceRefresh,
						}),
					},
				)

				if (!response.ok) {
					throw new Error("Failed to fetch space highlights")
				}

				const data = await response.json()

				// Update browser cache with fresh data (works for both normal and forced refresh)
				try {
					const freshCache = await caches.open(HIGHLIGHTS_CACHE_NAME)
					const cacheResponse = new Response(JSON.stringify(data), {
						headers: {
							"Content-Type": "application/json",
							"x-cached-at": String(Date.now()),
						},
					})
					await freshCache.put(cacheKey, cacheResponse)
				} catch {}

				// Reset force flag after the forced fetch completes so future project-switches
				// use the normal cache path instead of always bypassing it.
				if (forceRefresh) setHighlightsForceAt(0)

				return data
			},
			staleTime: HIGHLIGHTS_MAX_AGE,
			refetchOnWindowFocus: false,
		})

	const { data: memoryOfDay = null } = useQuery<MemoryOfDay | null>({
		queryKey: [
			"memory-of-day",
			user?.id,
			new Date().toISOString().slice(0, 10),
		],
		queryFn: async (): Promise<MemoryOfDay | null> => {
			const cacheKey = `memory-of-day:${user?.id}:${new Date().toISOString().slice(0, 10)}`
			try {
				const stored = localStorage.getItem(cacheKey)
				if (stored) return JSON.parse(stored) as MemoryOfDay
			} catch {}

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/v3/memory-of-day`,
				{ credentials: "include" },
			)
			if (!response.ok) return null
			const data = (await response.json()) as MemoryOfDay | null
			if (data) {
				try {
					localStorage.setItem(cacheKey, JSON.stringify(data))
				} catch {}
			}
			return data
		},
		staleTime: 24 * 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		enabled: !!user,
	})

	useHotkeys("c", () => {
		analytics.addDocumentModalOpened()
		setAddDoc("note")
	})
	useHotkeys("mod+k", (e) => {
		e.preventDefault()
		analytics.searchOpened({ source: "hotkey" })
		setIsSearchOpen(true)
	})

	const handleOpenDocument = useCallback(
		(document: DocumentWithMemories) => {
			if (document.id) {
				analytics.documentModalOpened({ document_id: document.id })
				setSelectedDocument(document)
				setDocId(document.id)
			}
		},
		[setDocId],
	)

	// Separate from handleOpenDocument because the graph view only has a document ID,
	// not the full document object. The modal will fetch the document via the docId
	// query param, so there may be a brief loading state (unlike handleOpenDocument
	// which pre-populates via setSelectedDocument).
	const handleOpenDocumentById = useCallback(
		(documentId: string) => {
			analytics.documentModalOpened({ document_id: documentId })
			setDocId(documentId)
		},
		[setDocId],
	)

	const handleQuickNoteSave = useCallback(
		(content: string) => {
			if (content.trim()) {
				const hadPreviousContent = quickNoteDraftRef.current.trim().length > 0
				noteMutation.mutate(
					{ content, project: selectedProject },
					{
						onSuccess: () => {
							if (hadPreviousContent) {
								analytics.quickNoteEdited()
							} else {
								analytics.quickNoteCreated()
							}
						},
					},
				)
			}
		},
		[selectedProject, noteMutation],
	)

	const handleFullScreenSave = useCallback(
		(content: string) => {
			if (content.trim()) {
				const hadInitialContent = fullscreenInitialContent.trim().length > 0
				noteMutation.mutate(
					{ content, project: selectedProject },
					{
						onSuccess: () => {
							if (hadInitialContent) {
								analytics.quickNoteEdited()
							} else {
								analytics.quickNoteCreated()
							}
						},
					},
				)
			}
		},
		[selectedProject, noteMutation, fullscreenInitialContent],
	)

	const handleMaximize = useCallback(
		(content: string) => {
			analytics.fullscreenNoteModalOpened()
			setFullscreenInitialContent(content)
			setIsFullscreen(true)
		},
		[setIsFullscreen],
	)

	const handleHighlightsChat = useCallback(
		(seed: string) => {
			setQueuedChatSeed(seed)
			setQueuedChatModel(null)
			setQueuedMessageSource("highlight")
			void setViewMode("chat")
		},
		[setViewMode],
	)

	const handleHomeChatStart = useCallback(
		(message: string, model: ModelId) => {
			setQueuedChatSeed(message)
			setQueuedChatModel(model)
			setQueuedMessageSource("home")
			void setViewMode("chat")
		},
		[setViewMode],
	)

	const consumeQueuedChat = useCallback(() => {
		setQueuedChatSeed(null)
		setQueuedChatModel(null)
		setQueuedMessageSource("highlight")
	}, [])

	const handleHighlightsShowRelated = useCallback(
		(query: string) => {
			analytics.searchOpened({ source: "highlight_related" })
			setSearchPrefill(query)
			setIsSearchOpen(true)
		},
		[setSearchPrefill, setIsSearchOpen],
	)

	const handleOpenIntegrations = useCallback(
		(integration?: IntegrationParamValue) => {
			void setViewMode(integration ?? "integrations")
		},
		[setViewMode],
	)

	const handleOpenPlugins = useCallback(() => {
		void setViewMode("plugins")
	}, [setViewMode])

	const handleAddMemory = useCallback(
		(tab: "note" | "link") => {
			analytics.addDocumentModalOpened()
			setAddDoc(tab)
		},
		[setAddDoc],
	)

	const viewportWidth = useSyncExternalStore(
		subscribeViewportWidth,
		getViewportWidth,
		() => GRADIENT_TOP_WIDTH_MAX,
	)
	const gradientTopPosition = gradientTopPositionForWidth(viewportWidth)

	const isChatView = viewMode === "chat"
	const showNovaBackdrop =
		viewMode === "graph" || viewMode === "list" || viewMode === "dashboard"
	const isDashboardShell =
		viewMode === "dashboard" || (viewMode === "graph" && isMobile)
	const isGraphMode = viewMode === "graph"

	return (
		<HotkeysProvider>
			<div
				className={cn(
					"relative flex min-h-dvh flex-col bg-[#05080D]",
					isGraphMode && "h-dvh overflow-hidden",
				)}
			>
				{showNovaBackdrop && (
					<>
						<AnimatedGradientBackground
							animateFromBottom={false}
							topPosition={gradientTopPosition}
						/>
						<div
							className="pointer-events-none absolute inset-0 z-0 bg-[#05080D]/50"
							aria-hidden
						/>
						<div
							id="graph-dotted-grid"
							className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,rgba(105,167,240,0.25)_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_at_center,black_60%,transparent_100%)]"
						/>
					</>
				)}
				{!session && viewMode === "mcp" ? (
					<PublicHeader />
				) : (
					<Header
						onAddMemory={() => {
							analytics.addDocumentModalOpened()
							setAddDoc("note")
						}}
						onOpenSearch={() => {
							analytics.searchOpened({ source: "header" })
							setIsSearchOpen(true)
						}}
					/>
				)}
				<AnimatePresence mode="wait">
					<motion.main
						key={`main-container-${viewMode}`}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
						className={cn(
							"relative z-10 flex min-h-0 flex-1 flex-col",
							(isGraphMode || isChatView) && "overflow-hidden",
						)}
					>
						<div
							className={cn(
								"relative z-10 flex min-h-0 flex-1 flex-col md:flex-row",
							)}
						>
							<ErrorBoundary fallback={<ViewErrorFallback />}>
								{isChatView ? (
									<div className="flex min-h-0 w-full min-w-0 flex-1 flex-col md:self-stretch">
										<ChatSidebar
											layout="page"
											isChatOpen
											setIsChatOpen={(open) => {
												if (!open) void setViewMode("dashboard")
											}}
											queuedMessage={queuedChatSeed}
											onConsumeQueuedMessage={consumeQueuedChat}
											queuedMessageSource={queuedMessageSource}
											initialSelectedModel={queuedChatModel}
											emptyStateSuggestions={highlightsData?.questions}
										/>
									</div>
								) : viewMode === "integrations" ? (
									<div className="min-h-0 min-w-0 flex-1 p-4 pt-2! md:p-6 md:pr-0">
										<IntegrationsView />
									</div>
								) : viewMode === "mcp" ? (
									<MCPDetailView
										onBack={() => void setViewMode("integrations")}
									/>
								) : viewMode === "plugins" ? (
									<DetailWrapper
										onBack={() => void setViewMode("integrations")}
									>
										<PluginsDetail />
									</DetailWrapper>
								) : viewMode === "chrome" ? (
									<DetailWrapper
										onBack={() => void setViewMode("integrations")}
									>
										<ChromeDetail />
									</DetailWrapper>
								) : viewMode === "shortcuts" ? (
									<DetailWrapper
										onBack={() => void setViewMode("integrations")}
									>
										<ShortcutsDetail />
									</DetailWrapper>
								) : viewMode === "raycast" ? (
									<DetailWrapper
										onBack={() => void setViewMode("integrations")}
									>
										<RaycastDetail />
									</DetailWrapper>
								) : viewMode === "import" ? (
									<XBookmarksDetailView
										onBack={() => void setViewMode("integrations")}
									/>
								) : viewMode === "graph" ? (
									<div className="min-h-0 min-w-0 flex-1">
										<GraphLayoutView onOpenDocument={handleOpenDocumentById} />
									</div>
								) : viewMode === "list" ? (
									<div
										className={cn(
											"min-h-0 min-w-0 flex-1 p-4 pt-2! md:p-6 md:pr-0",
											"pb-10 md:pb-12",
										)}
									>
										<MemoriesGrid
											isChatOpen={false}
											onOpenDocument={handleOpenDocument}
											isSelectionMode={isSelectionMode}
											selectedDocumentIds={selectedDocumentIds}
											onEnterSelectionMode={handleEnterSelectionMode}
											onToggleSelection={handleToggleSelection}
											onClearSelection={handleClearSelection}
											onSelectAllVisible={handleSelectAllVisible}
											onBulkDelete={handleBulkDelete}
											isBulkDeleting={bulkDeleteMutation.isPending}
											quickNoteProps={{
												onSave: handleQuickNoteSave,
												onMaximize: handleMaximize,
												isSaving: noteMutation.isPending,
											}}
											highlightsProps={{
												items: highlightsData?.highlights || [],
												onChat: handleHighlightsChat,
												onShowRelated: handleHighlightsShowRelated,
												isLoading: isLoadingHighlights,
											}}
											emptyStateProps={{
												onAddMemory: handleAddMemory,
												onOpenIntegrations: handleOpenIntegrations,
												isAllSpaces: false,
												spaceName: emptyStateSpaceName,
												onSwitchToAllSpaces: undefined,
											}}
										/>
									</div>
								) : (
									<DashboardView
										spaceLabel={dashboardSpaceLabel}
										headerNotice={undefined}
										highlights={highlightsData?.highlights ?? []}
										isLoadingHighlights={isLoadingHighlights}
										onAddMemory={handleAddMemory}
										onOpenSearch={() => {
											analytics.searchOpened({ source: "header" })
											setIsSearchOpen(true)
										}}
										onOpenIntegrations={handleOpenIntegrations}
										onOpenPlugins={handleOpenPlugins}
										onNavigateToMemories={() => void setViewMode("list")}
										onNavigateToGraph={() => void setViewMode("graph")}
										onOpenDocument={handleOpenDocument}
										onHighlightsChat={handleHighlightsChat}
										onHighlightsShowRelated={handleHighlightsShowRelated}
										onResetHighlights={handleResetHighlights}
										memoryOfDay={memoryOfDay}
									/>
								)}
							</ErrorBoundary>
						</div>
					</motion.main>
				</AnimatePresence>

				{isDashboardShell && (
					<div
						className={cn(
							"pointer-events-none fixed inset-x-0 z-30 bg-gradient-to-t from-black via-black/40 to-transparent pt-12",
							isMobile ? "bottom-[4.5rem]" : "bottom-0",
						)}
					>
						<div className="pointer-events-auto">
							<HomeChatComposer onStartChat={handleHomeChatStart} />
						</div>
					</div>
				)}

				<AddDocumentModal
					isOpen={addDoc !== null}
					onClose={() => setAddDoc(null)}
				/>
				<DocumentsCommandPalette
					open={isSearchOpen}
					onOpenChange={(open) => {
						setIsSearchOpen(open)
						if (!open) setSearchPrefill("")
					}}
					projectId={selectedProject}
					onOpenDocument={handleOpenDocument}
					onAddMemory={() => {
						analytics.addDocumentModalOpened()
						setAddDoc("note")
					}}
					onOpenIntegrations={() => setViewMode("integrations")}
					initialSearch={searchPrefill}
				/>
				<DocumentModal
					document={selectedDocument}
					isOpen={docId !== null}
					onClose={() => setDocId(null)}
				/>
				<FullscreenNoteModal
					isOpen={isFullscreen}
					onClose={() => setIsFullscreen(false)}
					initialContent={fullscreenInitialContent}
					onSave={handleFullScreenSave}
					isSaving={noteMutation.isPending}
				/>
			</div>
		</HotkeysProvider>
	)
}
