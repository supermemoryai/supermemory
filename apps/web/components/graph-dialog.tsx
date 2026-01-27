"use client"

import { useAuth } from "@lib/auth-context"
import { useState } from "react"
import { MemoryGraph } from "@/components/new/memory-graph/memory-graph"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"
import { ConnectAIModal } from "@/components/connect-ai-modal"
import { AddMemoryView } from "@/components/views/add-memory"
import { useChatOpen, useProject, useGraphModal } from "@/stores"
import { useGraphHighlights } from "@/stores/highlights"
import { useIsMobile } from "@hooks/use-mobile"

/**
 * Graph Dialog component
 */
export function GraphDialog() {
	const { user } = useAuth()
	const { documentIds: allHighlightDocumentIds } = useGraphHighlights()
	const { selectedProject } = useProject()
	const { isOpen: isChatOpen } = useChatOpen()
	const { isOpen: showGraphModal, setIsOpen: setShowGraphModal } =
		useGraphModal()
	const [showAddMemoryView, setShowAddMemoryView] = useState(false)
	const [showConnectAIModal, setShowConnectAIModal] = useState(false)
	const isMobile = useIsMobile()

	if (!user) return null

	// Convert selectedProject to containerTags array
	const containerTags = selectedProject ? [selectedProject] : undefined

	return (
		<>
			<Dialog open={showGraphModal} onOpenChange={setShowGraphModal}>
				<DialogContent
					className="w-[95vw] h-[95vh] p-0 max-w-6xl sm:max-w-6xl"
					showCloseButton={true}
				>
					<DialogTitle className="sr-only">Memory Graph</DialogTitle>
					<div className="w-full h-full">
						<MemoryGraph
							containerTags={containerTags}
							variant="console"
							highlightDocumentIds={allHighlightDocumentIds}
							highlightsVisible={isChatOpen}
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

			{showAddMemoryView && (
				<AddMemoryView
					initialTab="note"
					onClose={() => setShowAddMemoryView(false)}
				/>
			)}
		</>
	)
}
