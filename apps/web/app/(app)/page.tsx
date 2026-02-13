"use client"

import { useState, useCallback, useEffect } from "react"
import { useQueryState } from "nuqs"
import { Header } from "@/components/new/header"
import { ChatSidebar } from "@/components/new/chat"
import { MemoriesGrid } from "@/components/new/memories-grid"
import { GraphLayoutView } from "@/components/new/graph-layout-view"
import { IntegrationsView } from "@/components/new/integrations-view"
import { AnimatedGradientBackground } from "@/components/new/animated-gradient-background"
import { AddDocumentModal } from "@/components/new/add-document"
import { DocumentModal } from "@/components/new/document-modal"
import { DocumentsCommandPalette } from "@/components/new/documents-command-palette"
import { FullscreenNoteModal } from "@/components/new/fullscreen-note-modal"
import type { HighlightItem } from "@/components/new/highlights-card"
import { HotkeysProvider } from "react-hotkeys-hook"
import { useHotkeys } from "react-hotkeys-hook"
import { AnimatePresence } from "motion/react"
import { useIsMobile } from "@hooks/use-mobile"
import { useAuth } from "@lib/auth-context"
import { useProject } from "@/stores"
import {
	useQuickNoteDraftReset,
	useQuickNoteDraft,
} from "@/stores/quick-note-draft"
import { analytics } from "@/lib/analytics"
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
	chatParam,
} from "@/lib/search-params"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

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
	const { selectedProject } = useProject()
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
	const [isFullscreen, setIsFullscreen] = useQueryState("fullscreen", fullscreenParam)
	const [isChatOpen, setIsChatOpen] = useQueryState("chat", chatParam)

	// Ephemeral local state (not worth URL-encoding)
	const [fullscreenInitialContent, setFullscreenInitialContent] = useState("")
	const [queuedChatSeed, setQueuedChatSeed] = useState<string | null>(null)
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

	const { noteMutation } = useDocumentMutations({
		onClose: () => {
			resetDraft()
			setIsFullscreen(false)
		},
	})

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
			setIsChatOpen(true)
		},
		[setIsChatOpen],
	)

	const handleHighlightsShowRelated = useCallback(
		(query: string) => {
			analytics.searchOpened({ source: "highlight_related" })
			setSearchPrefill(query)
			setIsSearchOpen(true)
		},
		[setSearchPrefill, setIsSearchOpen],
	)

	const chatOpen = isChatOpen !== null ? isChatOpen : !isMobile
	const isGraphMode = viewMode === "graph" && !isMobile

	return (
		<HotkeysProvider>
			<div
				className={cn(
					"bg-black min-h-screen",
					isGraphMode && "h-screen overflow-hidden",
				)}
			>
				<AnimatedGradientBackground
					topPosition="15%"
					animateFromBottom={false}
				/>
				{isGraphMode && (
					<div
						id="graph-dotted-grid"
						className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,#69A7F0_0.1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_at_center,black_60%,transparent_100%)]"
					/>
				)}
				<Header
					onAddMemory={() => {
						analytics.addDocumentModalOpened()
						setAddDoc("note")
					}}
					onOpenChat={() => setIsChatOpen(true)}
					onOpenSearch={() => {
						analytics.searchOpened({ source: "header" })
						setIsSearchOpen(true)
					}}
				/>
				<main
					key={`main-container-${chatOpen}-${viewMode}`}
					className={cn(
						"z-10 relative",
						isGraphMode && "h-[calc(100vh-86px)] overflow-hidden",
					)}
				>
					<div className={cn("relative z-10 flex flex-col md:flex-row h-full")}>
						<ErrorBoundary fallback={<ViewErrorFallback />}>
						{viewMode === "integrations" ? (
							<div className="flex-1 p-4 md:p-6 md:pr-0 pt-2!">
								<IntegrationsView />
							</div>
						) : viewMode === "graph" && !isMobile ? (
							<div className="flex-1">
								<GraphLayoutView isChatOpen={chatOpen} />
							</div>
						) : (
							<div className="flex-1 p-4 md:p-6 md:pr-0 pt-2!">
								<MemoriesGrid
									isChatOpen={chatOpen}
									onOpenDocument={handleOpenDocument}
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
								/>
							</div>
						)}
						</ErrorBoundary>
						<div className="hidden md:block md:sticky md:top-0 md:h-screen">
							<AnimatePresence mode="popLayout">
								<ErrorBoundary>
									<ChatSidebar
										isChatOpen={chatOpen}
										setIsChatOpen={(open) => setIsChatOpen(open)}
										queuedMessage={queuedChatSeed}
										onConsumeQueuedMessage={() => setQueuedChatSeed(null)}
										emptyStateSuggestions={highlightsData?.questions}
									/>
								</ErrorBoundary>
							</AnimatePresence>
						</div>
					</div>
				</main>

				{isMobile && (
					<ChatSidebar
						isChatOpen={chatOpen}
						setIsChatOpen={(open) => setIsChatOpen(open)}
						queuedMessage={queuedChatSeed}
						onConsumeQueuedMessage={() => setQueuedChatSeed(null)}
						emptyStateSuggestions={highlightsData?.questions}
					/>
				)}

				<AddDocumentModal
					isOpen={addDoc !== null}
					onClose={() => setAddDoc(null)}
					defaultTab={addDoc ?? undefined}
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
