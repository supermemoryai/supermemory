"use client"

import { memo, useCallback, useRef } from "react"
import { useQueryState } from "nuqs"
import Image from "next/image"
import { MemoryGraph } from "./memory-graph/memory-graph"
import { useProject } from "@/stores"
import { useGraphHighlights } from "@/stores/highlights"
import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { ShareModal } from "./share-modal"
import { shareParam } from "@/lib/search-params"

interface GraphLayoutViewProps {
	isChatOpen: boolean
}

export const GraphLayoutView = memo<GraphLayoutViewProps>(({ isChatOpen }) => {
	const { effectiveContainerTags } = useProject()
	const { documentIds: allHighlightDocumentIds } = useGraphHighlights()
	const [isShareModalOpen, setIsShareModalOpen] = useQueryState(
		"share",
		shareParam,
	)
	const canvasRef = useRef<HTMLCanvasElement>(null)

	const handleShare = useCallback(() => {
		setIsShareModalOpen(true)
	}, [setIsShareModalOpen])

	const handleCloseShareModal = useCallback(() => {
		setIsShareModalOpen(false)
	}, [setIsShareModalOpen])

	return (
		<div className="relative w-full h-[calc(100vh-86px)]">
			{/* Full-width graph */}
			<div className="absolute inset-0">
				<MemoryGraph
					containerTags={effectiveContainerTags}
					variant="consumer"
					highlightDocumentIds={allHighlightDocumentIds}
					highlightsVisible={isChatOpen}
					maxNodes={200}
					canvasRef={canvasRef}
				/>
			</div>

			{/* Share graph button - top left */}
			<div className="absolute top-4 left-4 z-15">
				<Button
					variant="headers"
					className={cn(
						"rounded-full text-base gap-2 h-10!",
						dmSansClassName(),
					)}
					onClick={handleShare}
				>
					<Image
						src="/icons/share-graph.svg"
						alt="Share"
						width={16}
						height={16}
					/>
					Share graph
				</Button>
			</div>

			{/* Share modal */}
			<ShareModal
				isOpen={isShareModalOpen}
				onClose={handleCloseShareModal}
				graphCanvasRef={canvasRef}
			/>
		</div>
	)
})

GraphLayoutView.displayName = "GraphLayoutView"
