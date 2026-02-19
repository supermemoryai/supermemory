"use client"

import { memo, useMemo } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { Expand } from "lucide-react"
import { useGraphApi } from "./hooks/use-graph-api"
import { useViewMode } from "@/lib/view-mode-context"

export interface GraphCardProps {
	containerTags?: string[]
	width?: number
	height?: number
	className?: string
}

// Simple seeded random for deterministic node positions
function seededRandom(seed: number) {
	let s = seed
	return () => {
		s = (s * 16807 + 0) % 2147483647
		return s / 2147483647
	}
}

function StaticGraphPreview({
	documentCount,
	memoryCount,
	width,
	height,
}: {
	documentCount: number
	memoryCount: number
	width: number
	height: number
}) {
	const nodes = useMemo(() => {
		const rand = seededRandom(42)
		const count = Math.min(documentCount + memoryCount, 30)
		const docCount = Math.min(documentCount, 12)
		const result: {
			x: number
			y: number
			r: number
			color: string
			opacity: number
		}[] = []

		const pad = 20
		for (let i = 0; i < count; i++) {
			const isDoc = i < docCount
			result.push({
				x: pad + rand() * (width - pad * 2),
				y: pad + rand() * (height - pad * 2),
				r: isDoc ? 4 + rand() * 3 : 2 + rand() * 2,
				color: isDoc ? "#4BA0FA" : "#36FDFD",
				opacity: 0.4 + rand() * 0.4,
			})
		}
		return result
	}, [documentCount, memoryCount, width, height])

	const edges = useMemo(() => {
		if (nodes.length < 2) return []
		const rand = seededRandom(123)
		const result: { x1: number; y1: number; x2: number; y2: number }[] = []
		const edgeCount = Math.min(nodes.length - 1, 20)
		for (let i = 0; i < edgeCount; i++) {
			const a = Math.floor(rand() * nodes.length)
			let b = Math.floor(rand() * nodes.length)
			if (b === a) b = (a + 1) % nodes.length
			result.push({
				x1: nodes[a]!.x,
				y1: nodes[a]!.y,
				x2: nodes[b]!.x,
				y2: nodes[b]!.y,
			})
		}
		return result
	}, [nodes])

	return (
		<svg
			width={width}
			height={height}
			className="absolute inset-0"
			viewBox={`0 0 ${width} ${height}`}
		>
			{edges.map((e, i) => (
				<line
					key={i}
					x1={e.x1}
					y1={e.y1}
					x2={e.x2}
					y2={e.y2}
					stroke="#4BA0FA"
					strokeOpacity={0.15}
					strokeWidth={1}
				/>
			))}
			{nodes.map((n, i) => (
				<circle
					key={i}
					cx={n.x}
					cy={n.y}
					r={n.r}
					fill={n.color}
					opacity={n.opacity}
				/>
			))}
		</svg>
	)
}

export const GraphCard = memo<GraphCardProps>(
	({ containerTags, width = 216, height = 220, className }) => {
		const { setViewMode } = useViewMode()

		const { data, isLoading, error } = useGraphApi({
			containerTags,
			limit: 20,
			enabled: true,
		})

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

		const documentCount = data.stats?.documentsWithSpatial ?? 0
		const memoryCount = data.documents.reduce(
			(sum, d) => sum + d.memories.length,
			0,
		)

		return (
			<button
				type="button"
				onClick={() => setViewMode("graph")}
				className={cn(
					"bg-[#0B1017] border border-[rgba(255,255,255,0.05)] rounded-[18px] p-3 flex flex-col cursor-pointer transition-all hover:border-[rgba(255,255,255,0.1)] hover:bg-[#0f1419] group relative overflow-hidden",
					dmSansClassName(),
					className,
				)}
				style={{ width, height }}
			>
				<div className="flex-1 w-full relative overflow-hidden rounded-lg">
					{isLoading ? (
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
						</div>
					) : documentCount > 0 || memoryCount > 0 ? (
						<StaticGraphPreview
							documentCount={documentCount}
							memoryCount={memoryCount}
							width={width - 24}
							height={height - 56}
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center">
							<p className="text-[10px] text-[#737373] text-center">
								No documents yet
							</p>
						</div>
					)}

					<div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
						<Expand className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
					</div>
				</div>

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
		)
	},
)

GraphCard.displayName = "GraphCard"
