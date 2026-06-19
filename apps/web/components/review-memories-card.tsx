"use client"

import { ReviewMemoriesModal } from "@/components/review-memories-modal"
import { useInferredMemories } from "@/hooks/use-inferred-memories"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { ArrowRight } from "lucide-react"
import { useState } from "react"

// "Suggested for you" entry point — opens the swipe-review modal. Renders
// nothing when there's nothing to review, so it never adds empty chrome.
// Styled to match the Weekly digest box above it.
export function ReviewMemoriesCard({
	containerTag,
	className,
}: {
	containerTag: string | undefined
	className?: string
}) {
	const [open, setOpen] = useState(false)
	const { data: memories = [] } = useInferredMemories(containerTag)
	const count = memories.length

	if (count === 0) return null

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className={cn(
					"group flex w-full items-center justify-between gap-3 rounded-xl bg-[#0c1a30]/80 px-3.5 py-3 text-left shadow-[0_12px_40px_rgba(0,0,0,0.22)] ring-1 ring-[#4BA0FA]/20 backdrop-blur-md transition-colors hover:bg-[#0e2038]/90 hover:ring-[#4BA0FA]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4BA0FA]/45",
					dmSansClassName(),
					className,
				)}
			>
				<div className="min-w-0">
					<p className="text-[13px] font-semibold leading-tight text-fg-primary">
						Review suggestions
					</p>
					<p className="mt-1 truncate text-[11px] leading-tight text-fg-faint">
						{count} {count === 1 ? "memory" : "memories"} we inferred for you
					</p>
				</div>
				<span className="flex shrink-0 items-center gap-2 text-fg-faint transition-colors group-hover:text-fg-muted">
					<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1.5 text-[10px] font-bold text-[#00111f]">
						{count}
					</span>
					<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
				</span>
			</button>

			<ReviewMemoriesModal
				open={open}
				onOpenChange={setOpen}
				containerTag={containerTag}
			/>
		</>
	)
}
