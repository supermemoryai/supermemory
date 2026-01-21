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
import { useIsMobile } from "@hooks/use-mobile"
import { analytics } from "@/lib/analytics"

export default function NewPage() {
	const isMobile = useIsMobile()
	const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false)
	const [isMCPModalOpen, setIsMCPModalOpen] = useState(false)
	useHotkeys("c", () => {
		analytics.addDocumentModalOpened()
		setIsAddDocumentOpen(true)
	})
	const [isChatOpen, setIsChatOpen] = useState(!isMobile)

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
				/>
				<main
					key={`main-container-${isChatOpen}`}
					className="z-10 flex flex-col md:flex-row relative"
				>
					<div className="flex-1 p-4 md:p-6 md:pr-0">
						<MemoriesGrid isChatOpen={isChatOpen} />
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
			</div>
		</HotkeysProvider>
	)
}
