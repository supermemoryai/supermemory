"use client"

import { useState } from "react"
import { Header } from "@/components/new/header"
import { ChatSidebar } from "@/components/new/chat"
import { AnimatePresence } from "motion/react"
import { MemoriesGrid } from "@/components/new/memories-grid"
import { AnimatedGradientBackground } from "@/components/new/animated-gradient-background"
import { AddDocumentModal } from "@/components/new/add-document"
import { MCPModal } from "@/components/new/mcp-modal"
import { HotkeysProvider } from "react-hotkeys-hook"
import { useHotkeys } from "react-hotkeys-hook"

export default function NewPage() {
	const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false)
	const [isMCPModalOpen, setIsMCPModalOpen] = useState(false)
	useHotkeys("c", () => setIsAddDocumentOpen(true))

	return (
		<HotkeysProvider>
			<div className="h-screen overflow-hidden bg-black">
				<AnimatedGradientBackground
					topPosition="15%"
					animateFromBottom={false}
				/>
				<Header
					onAddMemory={() => setIsAddDocumentOpen(true)}
					onOpenMCP={() => setIsMCPModalOpen(true)}
				/>
				<main className="relative">
					<div className="relative z-10">
						<div className="flex flex-row h-[calc(100vh-90px)] relative">
							<div className="flex-1 flex flex-col justify-start p-6 pr-0">
								<MemoriesGrid />
							</div>

							<AnimatePresence mode="popLayout">
								<ChatSidebar />
							</AnimatePresence>
						</div>
					</div>
				</main>
				<AddDocumentModal
					isOpen={isAddDocumentOpen}
					onClose={() => setIsAddDocumentOpen(false)}
				/>
				<MCPModal
					isOpen={isMCPModalOpen}
					onClose={() => setIsMCPModalOpen(false)}
				/>
			</div>
		</HotkeysProvider>
	)
}
