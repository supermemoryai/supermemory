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
import { HotkeysProvider } from "react-hotkeys-hook"
import { useHotkeys } from "react-hotkeys-hook"
import { AnimatePresence } from "motion/react"
import { useIsMobile } from "@hooks/use-mobile"
import { useProject } from "@/stores"
import { analytics } from "@/lib/analytics"
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
					<div className="flex-1 p-4 md:p-6 md:pr-0">
						<MemoriesGrid
							isChatOpen={isChatOpen}
							onOpenDocument={handleOpenDocument}
						/>
					</div>
					<div className="hidden md:block md:sticky md:top-0 md:h-screen">
						<AnimatePresence mode="popLayout">
							<ChatSidebar
								isChatOpen={isChatOpen}
								setIsChatOpen={setIsChatOpen}
							/>
						</AnimatePresence>
					</div>
				</main>

				{isMobile && (
					<ChatSidebar isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen} />
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
					onOpenChange={setIsSearchOpen}
					projectId={selectedProject}
					onOpenDocument={handleOpenDocument}
				/>
				<DocumentModal
					document={selectedDocument}
					isOpen={isDocumentModalOpen}
					onClose={() => setIsDocumentModalOpen(false)}
				/>
			</div>
		</HotkeysProvider>
	)
}
