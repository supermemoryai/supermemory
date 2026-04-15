"use client"

import { useState, useCallback, useEffect } from "react"
import { useQueryState } from "nuqs"
import { Header } from "@/components/header"
import { ChatSidebar, HomeChatComposer } from "@/components/chat"
import { MemoriesGrid } from "@/components/memories-grid"
import { GraphLayoutView } from "@/components/graph-layout-view"
import { IntegrationsView } from "@/components/integrations-view"
// AnimatedGradientBackground — commented for now (see helpers + usage below).
// import { AnimatedGradientBackground } from "@/components/animated-gradient-background"
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
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { useViewMode } from "@/lib/view-mode-context"
import { ErrorBoundary } from "@/components/error-boundary"
import { cn } from "@lib/utils"
import {
	addDocumentParam,
	searchParam,
	qParam,
	docParam,
	fullscreenParam,
	integrationParam,
	pluginsPanelParam,
	type IntegrationParamValue,
} from "@/lib/search-params"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

/*
 * Animated gradient — commented for now (restore with import + JSX in NewPage).
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
	const pctNarrow = 70
	const w = Math.min(GRADIENT_TOP_WIDTH_MAX, Math.max(minW, width))
	const t = (w - minW) / (GRADIENT_TOP_WIDTH_MAX - minW)
	const eased = t * t
	return `${Math.round(pctNarrow + eased * (pctWide - pctNarrow))}%`
}
*/

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
	const {
		selectedProject,
		isNovaSpaces,
		novaContainerTags,
		selectedProjects,
		setSelectedProjects,
	} = useProject()
	const selectedProjectTag = selectedProjects[0]
	const isNovaContext =
		isNovaSpaces ||
		(selectedProjectTag !== undefined &&
			novaContainerTags.includes(selectedProjectTag))
	const { allProjects } = useContainerTags()
	const emptyStateSpaceName =
		!isNovaSpaces && selectedProjectTag
			? selectedProjectTag === DEFAULT_PROJECT_ID
				? "My Space"
				: (allProjects.find((p) => p.containerTag === selectedProjectTag)
						?.name ?? selectedProjectTag)
			: undefined

	const handleSwitchToAllSpacesFromEmptyState = useCallback(() => {
		analytics.spaceSwitched({ space_id: "nova_spaces" })
		setSelectedProjects([])
	}, [setSelectedProjects])

	const { viewMode, setViewMode } = useViewMode()
	const queryClient = useQueryClient()

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
	const [integrationFromUrl, setIntegration] = useQueryState(
		"integration",
		integrationParam,
	)
	const [pluginsPanelFromUrl] = useQueryState("plugins", pluginsPanelParam)

	useEffect(() => {
		if (integrationFromUrl || pluginsPanelFromUrl === true) {
			void setViewMode("integrations")
		}
	}, [integrationFromUrl, pluginsPanelFromUrl, setViewMode])

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

	const { data: highlightsData, isLoading: isLoadingHighlights } =
		useQuery<SpaceHighlightsResponse>({
			queryKey: ["space-highlights", selectedProject],
			queryFn: async (): Promise<SpaceHighlightsResponse> => {
				const spaceId = selectedProject || "sm_project_default"
				const cacheKey = `${process.env.NEXT_PUBLIC_BACKEND_URL}/v3/space-highlights?spaceId=${spaceId}`

				const cache = await caches.open(HIGHLIGHTS_CACHE_NAME)
				const cached = await cache.match(cacheKey)
				if (cached) {
					const age =
						Date.now() - Number(cached.headers.get("x-cached-at") || 0)
					if (age < HIGHLIGHTS_MAX_AGE) {
						return cached.json()
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
						}),
					},
				)

				if (!response.ok) {
					throw new Error("Failed to fetch space highlights")
				}

				const data = await response.json()

				const cacheResponse = new Response(JSON.stringify(data), {
					headers: {
						"Content-Type": "application/json",
						"x-cached-at": String(Date.now()),
					},
				})
				await cache.put(cacheKey, cacheResponse)

				return data
			},
			staleTime: HIGHLIGHTS_MAX_AGE,
			refetchOnWindowFocus: false,
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

	const handleQuickNoteSave = useCallback(
		(content: string) => {
			if (content.trim()) {
				const hadPreviousContent = quickNoteDraft.trim().length > 0
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
		[selectedProject, noteMutation, quickNoteDraft],
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
			setViewMode("integrations")
			if (integration) {
				setIntegration(integration)
			} else {
				setIntegration(null)
			}
		},
		[setViewMode, setIntegration],
	)

	const handleAddMemory = useCallback(
		(tab: "note" | "link") => {
			analytics.addDocumentModalOpened()
			setAddDoc(tab)
		},
		[setAddDoc],
	)

	const isChatView = viewMode === "chat"
	const isGraphMode = viewMode === "graph" && !isMobile

	// Animated gradient — commented for now (use with useSyncExternalStore + helpers above).
	// const viewportWidth = useSyncExternalStore(
	// 	subscribeViewportWidth,
	// 	getViewportWidth,
	// 	() => GRADIENT_TOP_WIDTH_MAX,
	// )
	// const gradientTopPosition = gradientTopPositionForWidth(viewportWidth)

	return (
		<HotkeysProvider>
			<div
				className={cn(
					"relative flex min-h-dvh flex-col bg-black",
					isGraphMode && "h-dvh overflow-hidden",
				)}
			>
				{/* AnimatedGradientBackground: off for now (import + helpers commented above). */}
				{isGraphMode && (
					<div
						id="graph-dotted-grid"
						className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,rgba(105,167,240,0.25)_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_at_center,black_60%,transparent_100%)]"
					/>
				)}
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
				<main
					key={`main-container-${viewMode}`}
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
											if (!open) void setViewMode("list")
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
							) : viewMode === "graph" && !isMobile ? (
								<div className="min-h-0 min-w-0 flex-1">
									<GraphLayoutView />
								</div>
							) : (
								<div
									className={cn(
										"min-h-0 min-w-0 flex-1 p-4 pt-2! md:p-6 md:pr-0",
										viewMode === "list" && "pb-32 md:pb-36",
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
										emptyStateProps={
											isNovaContext
												? {
														onAddMemory: handleAddMemory,
														onOpenIntegrations: handleOpenIntegrations,
														isAllSpaces: isNovaSpaces,
														spaceName: emptyStateSpaceName,
														onSwitchToAllSpaces: isNovaSpaces
															? undefined
															: handleSwitchToAllSpacesFromEmptyState,
													}
												: undefined
										}
									/>
								</div>
							)}
						</ErrorBoundary>
					</div>
				</main>

				{viewMode === "list" && (
					<div
						className={cn(
							"pointer-events-none fixed inset-x-0 z-30",
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
					novaContainerTags={isNovaSpaces ? novaContainerTags : undefined}
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
