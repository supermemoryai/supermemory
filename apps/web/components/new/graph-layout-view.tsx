"use client"

import { memo, useState, useCallback } from "react"
import { MemoryGraph } from "./memory-graph/memory-graph"
import { useProject } from "@/stores"
import { useGraphHighlights } from "@/stores/highlights"
import { Share2 } from "lucide-react"
import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"

interface GraphLayoutViewProps {
	isChatOpen: boolean
}

export const GraphLayoutView = memo<GraphLayoutViewProps>(({ isChatOpen }) => {
	const { selectedProject } = useProject()
	const { documentIds: allHighlightDocumentIds } = useGraphHighlights()
	const [_isShareModalOpen, setIsShareModalOpen] = useState(false)

	const containerTags = selectedProject ? [selectedProject] : undefined

	const handleShare = useCallback(() => {
		setIsShareModalOpen(true)
	}, [])

	return (
		<div className="relative w-full h-[calc(100vh-56px)]">
			{/* Full-width graph */}
			<div className="absolute inset-0">
				<MemoryGraph
					containerTags={containerTags}
					variant="consumer"
					highlightDocumentIds={allHighlightDocumentIds}
					highlightsVisible={isChatOpen}
					maxNodes={200}
				/>
			</div>

			{/* Share graph button - top left */}
			<div className="absolute top-4 left-4 z-[15]">
				<Button
					variant="headers"
					className={cn(
						"rounded-full text-base gap-2 h-10!",
						dmSansClassName(),
					)}
					onClick={handleShare}
				>
					<Share2 className="size-4" />
					Share graph
				</Button>
			</div>
		</div>
	)
})

GraphLayoutView.displayName = "GraphLayoutView"
