"use client"

import { memo, useState, useCallback } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { Expand } from "lucide-react"
import { MemoryGraph } from "./memory-graph"
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog"
import { useGraphApi } from "./hooks/use-graph-api"

interface GraphCardProps {
	containerTags?: string[]
	width?: number
	height?: number
	className?: string
}

/**
 * GraphCard component - shows a preview of the memory graph and opens a full modal on click
 */
export const GraphCard = memo<GraphCardProps>(
	({ containerTags, width = 216, height = 220, className }) => {
		const [isModalOpen, setIsModalOpen] = useState(false)

		// Use the graph API to get stats for the preview
		const { data, isLoading, error } = useGraphApi({
			containerTags,
			includeMemories: true,
			limit: 20, // Small limit for preview
			enabled: true,
		})

		const handleOpenModal = useCallback(() => {
			setIsModalOpen(true)
		}, [])

		if (error) {
			return (
				<div
					className={cn(
						"bg-[#0B1017] border border-[rgba(255,255,255,0.05)] rounded-[18px] p-3 flex flex-col items-center justify-center",
						dmSansClassName(),
						className,
					)}
					style={{ width, height }}
				>
					<p className="text-[10px] text-red-400 text-center">
						Failed to load graph
					</p>
				</div>
			)
		}

		const stats = data.stats
		const documentCount = stats?.documentsWithSpatial ?? 0
		const memoryCount = stats?.memoriesWithSpatial ?? 0

		return (
			<>
				{/* Card Preview */}
				<button
					type="button"
					onClick={handleOpenModal}
					className={cn(
						"bg-[#0B1017] border border-[rgba(255,255,255,0.05)] rounded-[18px] p-3 flex flex-col cursor-pointer transition-all hover:border-[rgba(255,255,255,0.1)] hover:bg-[#0f1419] group relative overflow-hidden",
						dmSansClassName(),
						className,
					)}
					style={{ width, height }}
				>
					{/* Mini graph preview */}
					<div className="flex-1 w-full relative overflow-hidden rounded-lg">
						{isLoading ? (
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
							</div>
						) : data.nodes.length > 0 ? (
							<div className="absolute inset-0 pointer-events-none opacity-60">
								<MemoryGraph
									containerTags={containerTags}
									variant="consumer"
									maxNodes={20}
								/>
							</div>
						) : (
							<div className="absolute inset-0 flex items-center justify-center">
								<p className="text-[10px] text-[#737373] text-center">
									No documents yet
								</p>
							</div>
						)}

						{/* Expand overlay */}
						<div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
							<Expand className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
						</div>
					</div>

					{/* Stats footer */}
					<div className="mt-2 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-[10px] text-[#737373]">
								{documentCount} docs
							</span>
							<span className="text-[10px] text-[#4BA0FA]">
								{memoryCount} memories
							</span>
						</div>
						<span className="text-[10px] text-[#737373] group-hover:text-white transition-colors">
							View graph
						</span>
					</div>
				</button>

				{/* Full Graph Modal */}
				<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
					<DialogContent
						className="w-[95vw] h-[95vh] p-0 max-w-6xl sm:max-w-6xl"
						showCloseButton={true}
					>
						<DialogTitle className="sr-only">Memory Graph</DialogTitle>
						<div className="w-full h-full">
							<MemoryGraph containerTags={containerTags} variant="console" />
						</div>
					</DialogContent>
				</Dialog>
			</>
		)
	},
)

GraphCard.displayName = "GraphCard"
