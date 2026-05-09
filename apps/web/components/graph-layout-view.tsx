"use client"

import { memo, useCallback, useRef } from "react"
import { useQueryState } from "nuqs"
import Image from "next/image"
import { Share2 } from "lucide-react"
import { MemoryGraph } from "./memory-graph"
import { useProject } from "@/stores"
import { useGraphHighlights } from "@/stores/highlights"
import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { ShareModal } from "./share-modal"
import { shareParam } from "@/lib/search-params"

export const GraphLayoutView = memo(function GraphLayoutView() {
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
		<div className="relative h-full min-h-[calc(100dvh-8.5rem)] w-full md:min-h-0">
			{/* Full-width graph */}
			<div className="absolute inset-0">
				<MemoryGraph
					containerTags={effectiveContainerTags}
					variant="consumer"
					highlightDocumentIds={allHighlightDocumentIds}
					highlightsVisible
					maxNodes={undefined}
					canvasRef={canvasRef}
				/>
			</div>

			{/* Share graph button - top left */}
			<div className="absolute left-3 top-3 z-15 md:left-4 md:top-4">
				<Button
					variant="headers"
					className={cn(
						"size-10 rounded-full p-0 md:size-auto md:h-10! md:px-4",
						"md:gap-2 md:text-base",
						dmSansClassName(),
					)}
					onClick={handleShare}
					aria-label="Share graph"
				>
					<Image
						src="/icons/share-graph.svg"
						alt="Share"
						width={16}
						height={16}
						className="hidden md:block"
					/>
					<Share2 className="size-4 md:hidden" />
					<span className="hidden md:inline">Share graph</span>
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
