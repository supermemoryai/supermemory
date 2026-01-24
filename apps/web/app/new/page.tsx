"use client"

import { useState, useCallback } from "react"
import { Header } from "@/components/new/header"
import { ChatSidebar } from "@/components/new/chat"
import { MemoriesGrid } from "@/components/new/memories-grid"
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
import { useQuickNoteDraftReset } from "@/stores/quick-note-draft"
import { analytics } from "@/lib/analytics"
import { useDocumentMutations } from "@/hooks/use-document-mutations"
import { useQuery } from "@tanstack/react-query"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export default function NewPage() {
	const isMobile = useIsMobile()
	const { selectedProject } = useProject()
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

	const { noteMutation } = useDocumentMutations({
		onClose: () => {
			resetDraft()
			setIsFullScreenNoteOpen(false)
		},
	})

	// Fetch space highlights (highlights + suggested questions)
	type SpaceHighlightsResponse = {
		highlights: HighlightItem[]
		questions: string[]
		generatedAt: string
	}
	const { data: highlightsData, isLoading: isLoadingHighlights } =
		useQuery<SpaceHighlightsResponse>({
			queryKey: ["space-highlights", selectedProject],
			queryFn: async (): Promise<SpaceHighlightsResponse> => {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_BACKEND_URL}/v3/space-highlights`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
						body: JSON.stringify({
							spaceId: selectedProject || "sm_project_default",
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

				return response.json()
			},
			staleTime: 4 * 60 * 60 * 1000, // 4 hours (matches backend cache)
			refetchOnWindowFocus: false,
		})

	useHotkeys("c", () => {
		analytics.addDocumentModalOpened()
		setIsAddDocumentOpen(true)
	})
	useHotkeys("mod+k", (e) => {
		e.preventDefault()
		setIsSearchOpen(true)
	})
	const [isChatOpen, setIsChatOpen] = useState(!isMobile)

	const handleOpenDocument = useCallback((document: DocumentWithMemories) => {
		setSelectedDocument(document)
		setIsDocumentModalOpen(true)
	}, [])

	const handleQuickNoteSave = useCallback(
		(content: string) => {
			if (content.trim()) {
				noteMutation.mutate({ content, project: selectedProject })
			}
		},
		[selectedProject, noteMutation],
	)

	const handleFullScreenSave = useCallback(
		(content: string) => {
			if (content.trim()) {
				noteMutation.mutate({ content, project: selectedProject })
			}
		},
		[selectedProject, noteMutation],
	)

	const handleMaximize = useCallback(
		(content: string) => {
			setFullscreenInitialContent(content)
			setIsFullScreenNoteOpen(true)
		},
		[],
	)

	const handleHighlightsChat = useCallback((seed: string) => {
		setQueuedChatSeed(seed)
		setIsChatOpen(true)
	}, [])

	const handleHighlightsShowRelated = useCallback((query: string) => {
		setSearchPrefill(query)
		setIsSearchOpen(true)
	}, [])

	return (
		<HotkeysProvider>
			<div className="bg-black min-h-screen">
				<AnimatedGradientBackground
					topPosition="15%"
					animateFromBottom={false}
				/>
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
					onOpenSearch={() => setIsSearchOpen(true)}
				/>
				<main
					key={`main-container-${isChatOpen}`}
					className="z-10 flex flex-col md:flex-row relative"
				>
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
