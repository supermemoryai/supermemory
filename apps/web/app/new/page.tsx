"use client"

import { useState } from "react"
import { Header } from "@/components/new/header"
import { ChatSidebar } from "@/components/new/chat"
import { MemoriesGrid } from "@/components/new/memories-grid"
import { AnimatedGradientBackground } from "@/components/new/animated-gradient-background"
import { AddDocumentModal } from "@/components/new/add-document"
import { MCPModal } from "@/components/new/mcp-modal"
import { HotkeysProvider } from "react-hotkeys-hook"
import { useHotkeys } from "react-hotkeys-hook"
import { AnimatePresence } from "motion/react"

export default function NewPage() {
	const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false)
	const [isMCPModalOpen, setIsMCPModalOpen] = useState(false)
	useHotkeys("c", () => setIsAddDocumentOpen(true))
	const [isChatOpen, setIsChatOpen] = useState(true)

	return (
		<HotkeysProvider>
			<div className="bg-black">
				<AnimatedGradientBackground
					topPosition="15%"
					animateFromBottom={false}
				/>
				<Header
					onAddMemory={() => setIsAddDocumentOpen(true)}
					onOpenMCP={() => setIsMCPModalOpen(true)}
				/>
				<main
					key={`main-container-${isChatOpen}`}
					className="z-10 flex flex-row relative"
				>
					<div className="flex-1 p-6 pr-0">
						<MemoriesGrid isChatOpen={isChatOpen} />
					</div>
					<div className="sticky top-0 h-screen">
						<AnimatePresence mode="popLayout">
							<ChatSidebar
								isChatOpen={isChatOpen}
								setIsChatOpen={setIsChatOpen}
							/>
						</AnimatePresence>
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
