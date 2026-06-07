"use client"

import { useMemo } from "react"
import type { UIMessage } from "@ai-sdk/react"
import { MemoryGraph } from "@/components/memory-graph"
import { AnimatedGradientBackground } from "@/components/animated-gradient-background"
import { useProject } from "@/stores"
import { extractHighlightDocumentIdsFromMessages } from "@/lib/chat-highlight-documents"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"

export function ChatGraphContextRail({
	messages,
	containerTags,
	className,
	showBackdrop = true,
}: {
	messages: UIMessage[]
	containerTags?: string[] | null
	className?: string
	showBackdrop?: boolean
}) {
	const { effectiveContainerTags } = useProject()
	const graphContainerTags =
		containerTags === undefined
			? effectiveContainerTags
			: (containerTags ?? undefined)
	const highlightIds = useMemo(
		() => extractHighlightDocumentIdsFromMessages(messages),
		[messages],
	)

	return (
		<div
			id="chat-graph-context-rail"
			className={cn(
				"relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
				showBackdrop && "bg-[#05080D]",
				dmSansClassName(),
				className,
			)}
		>
			{showBackdrop && (
				<>
					<AnimatedGradientBackground
						animateFromBottom={false}
						topPosition="55%"
					/>
					<div className="pointer-events-none absolute inset-0 z-0 bg-[#05080D]/50" />
					<div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,rgba(105,167,240,0.25)_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_at_center,black_60%,transparent_100%)]" />
				</>
			)}
			<div className="pointer-events-none absolute top-3 left-4 z-20">
				<p className="text-xs font-medium text-white/70">Memory map</p>
				<p className="mt-0.5 max-w-[14rem] text-[10px] leading-snug text-white/35">
					{highlightIds.length > 0
						? `${highlightIds.length} memor${highlightIds.length === 1 ? "y" : "ies"} used by Nova`
						: "Memories used by Nova will be highlighted here"}
				</p>
			</div>
			<div className="relative z-[2] min-h-0 flex-1 pt-10">
				<MemoryGraph
					containerTags={graphContainerTags}
					variant="consumer"
					highlightDocumentIds={highlightIds}
					highlightsVisible={highlightIds.length > 0}
					maxNodes={160}
				/>
			</div>
		</div>
	)
}
