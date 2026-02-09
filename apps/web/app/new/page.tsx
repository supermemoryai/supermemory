"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/new/header"
import { ChatSidebar } from "@/components/new/chat"
import { MemoriesGrid } from "@/components/new/memories-grid"
import { GraphLayoutView } from "@/components/new/graph-layout-view"
import { AnimatedGradientBackground } from "@/components/new/animated-gradient-background"
import { AddDocumentModal } from "@/components/new/add-document"
import { MCPModal } from "@/components/new/mcp-modal"
import { DocumentModal } from "@/components/new/document-modal"
import { DocumentsCommandPalette } from "@/components/new/documents-command-palette"
import { FullscreenNoteModal } from "@/components/new/fullscreen-note-modal"
import type { HighlightItem } from "@/components/new/highlights-card"
import { HotkeysProvider } from "react-hotkeys-hook"
import { useHotkeys } from "react-hotkeys-hook"
import { AnimatePresence } from "motion/react"
import { useIsMobile } from "@hooks/use-mobile"
import { useProject } from "@/stores"
import {
	useQuickNoteDraftReset,
	useQuickNoteDraft,
} from "@/stores/quick-note-draft"
import { analytics } from "@/lib/analytics"
import { useDocumentMutations } from "@/hooks/use-document-mutations"
import { useQuery } from "@tanstack/react-query"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { useViewMode } from "@/lib/view-mode-context"
import { cn } from "@lib/utils"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export default function NewPage() {
	const isMobile = useIsMobile()
	const { selectedProject } = useProject()
	const { viewMode } = useViewMode()
	const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false)
	const [isMCPModalOpen, setIsMCPModalOpen] = useState(false)
	const [isSearchOpen, setIsSearchOpen] = useState(false)
	const [selectedDocument, setSelectedDocument] =
		useState<DocumentWithMemories | null>(null)
	const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)

	const [isFullScreenNoteOpen, setIsFullScreenNoteOpen] = useState(false)
	const [fullscreenInitialContent, setFullscreenInitialContent] = useState("")
	const [queuedChatSeed, setQueuedChatSeed] = useState<string | null>(null)
	const [searchPrefill, setSearchPrefill] = useState("")

	const resetDraft = useQuickNoteDraftReset(selectedProject)
	const { draft: quickNoteDraft } = useQuickNoteDraft(selectedProject || "")

	const { noteMutation } = useDocumentMutations({
		onClose: () => {
			resetDraft()
			setIsFullScreenNoteOpen(false)
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

				// Check Cache API for a fresh response
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

				// Store in Cache API with timestamp
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
		setIsAddDocumentOpen(true)
	})
	useHotkeys("mod+k", (e) => {
		e.preventDefault()
		analytics.searchOpened({ source: "hotkey" })
		setIsSearchOpen(true)
	})
	const [isChatOpen, setIsChatOpen] = useState(!isMobile)

	useEffect(() => {
		setIsChatOpen(!isMobile)
	}, [isMobile])

	const handleOpenDocument = useCallback((document: DocumentWithMemories) => {
		if (document.id) {
			analytics.documentModalOpened({ document_id: document.id })
		}
		setSelectedDocument(document)
		setIsDocumentModalOpen(true)
	}, [])

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

	const handleMaximize = useCallback((content: string) => {
		analytics.fullscreenNoteModalOpened()
		setFullscreenInitialContent(content)
		setIsFullScreenNoteOpen(true)
	}, [])

	const handleHighlightsChat = useCallback((seed: string) => {
		setQueuedChatSeed(seed)
		setIsChatOpen(true)
	}, [])

	const handleHighlightsShowRelated = useCallback((query: string) => {
		analytics.searchOpened({ source: "highlight_related" })
		setSearchPrefill(query)
		setIsSearchOpen(true)
	}, [])

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
						setIsAddDocumentOpen(true)
					}}
					onOpenMCP={() => {
						analytics.mcpModalOpened()
						setIsMCPModalOpen(true)
					}}
					onOpenChat={() => setIsChatOpen(true)}
					onOpenSearch={() => {
						analytics.searchOpened({ source: "header" })
						setIsSearchOpen(true)
					}}
				/>
				<main
					key={`main-container-${isChatOpen}-${viewMode}`}
					className={cn(
						"z-10 relative",
						isGraphMode && "h-[calc(100vh-86px)] overflow-hidden",
					)}
				>
					<div className={cn("relative z-10 flex flex-col md:flex-row h-full")}>
						{viewMode === "graph" && !isMobile ? (
							<div className="flex-1">
								<GraphLayoutView isChatOpen={isChatOpen} />
							</div>
						) : (
							<div className="flex-1 p-4 md:p-6 md:pr-0 pt-2!">
								<MemoriesGrid
									isChatOpen={isChatOpen}
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
						<div className="hidden md:block md:sticky md:top-0 md:h-screen">
							<AnimatePresence mode="popLayout">
								<ChatSidebar
									isChatOpen={isChatOpen}
									setIsChatOpen={setIsChatOpen}
									queuedMessage={queuedChatSeed}
									onConsumeQueuedMessage={() => setQueuedChatSeed(null)}
									emptyStateSuggestions={highlightsData?.questions}
								/>
							</AnimatePresence>
						</div>
					</div>
				</main>

				{isMobile && (
					<ChatSidebar
						isChatOpen={isChatOpen}
						setIsChatOpen={setIsChatOpen}
						queuedMessage={queuedChatSeed}
						onConsumeQueuedMessage={() => setQueuedChatSeed(null)}
						emptyStateSuggestions={highlightsData?.questions}
					/>
				)}

				<AddDocumentModal
					isOpen={isAddDocumentOpen}
					onClose={() => setIsAddDocumentOpen(false)}
				/>
				<MCPModal
					isOpen={isMCPModalOpen}
					onClose={() => setIsMCPModalOpen(false)}
				/>
				<DocumentsCommandPalette
					open={isSearchOpen}
					onOpenChange={(open) => {
						setIsSearchOpen(open)
						if (!open) setSearchPrefill("")
					}}
					projectId={selectedProject}
					onOpenDocument={handleOpenDocument}
					initialSearch={searchPrefill}
				/>
				<DocumentModal
					document={selectedDocument}
					isOpen={isDocumentModalOpen}
					onClose={() => setIsDocumentModalOpen(false)}
				/>
				<FullscreenNoteModal
					isOpen={isFullScreenNoteOpen}
					onClose={() => setIsFullScreenNoteOpen(false)}
					initialContent={fullscreenInitialContent}
					onSave={handleFullScreenSave}
					isSaving={noteMutation.isPending}
				/>
			</div>
		</HotkeysProvider>
	)
}
