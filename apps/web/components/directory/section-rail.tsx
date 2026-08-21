"use client"

import { cn } from "@lib/utils"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { dmSans125ClassName } from "@/lib/fonts"

export const sectionLabelClass = cn(
	dmSans125ClassName(),
	"text-[13px] font-semibold tracking-[-0.01em] text-[#A1A1AA]",
)

// Horizontally scrollable card rail with a section heading — shared by the
// main integrations directory and the Company Brain connections directory.
// Arrows appear only when the content actually overflows.
export function SectionRail({
	label,
	children,
	headerSlot,
	labelSlot,
	scrollbar = "hidden",
}: {
	label: string
	children: ReactNode
	headerSlot?: ReactNode
	labelSlot?: ReactNode
	scrollbar?: "hidden" | "visible"
}) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const [canScrollLeft, setCanScrollLeft] = useState(false)
	const [canScrollRight, setCanScrollRight] = useState(false)
	const [hasOverflow, setHasOverflow] = useState(false)

	const update = useCallback(() => {
		const el = scrollRef.current
		if (!el) return
		setHasOverflow(el.scrollWidth > el.clientWidth + 4)
		setCanScrollLeft(el.scrollLeft > 4)
		setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
	}, [])

	useEffect(() => {
		update()
		const el = scrollRef.current
		if (!el) return
		el.addEventListener("scroll", update, { passive: true })
		el.addEventListener("scrollend", update)
		const ro = new ResizeObserver(update)
		ro.observe(el)
		return () => {
			el.removeEventListener("scroll", update)
			el.removeEventListener("scrollend", update)
			ro.disconnect()
		}
	}, [update])

	const scrollBy = (dir: 1 | -1) => {
		scrollRef.current?.scrollBy({ left: 292 * dir, behavior: "smooth" })
		setTimeout(update, 450)
	}

	const arrowClass = cn(
		"flex size-7 items-center justify-center rounded-full bg-[#0D121A] text-[#FAFAFA] transition-opacity",
		"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]",
		"hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30",
	)

	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<h3 className={sectionLabelClass}>{label}</h3>
					{labelSlot}
				</div>
				<div className="hidden items-center gap-1.5 sm:flex">
					{headerSlot}
					{hasOverflow ? (
						<>
							<button
								type="button"
								aria-label="Show previous"
								disabled={!canScrollLeft}
								onClick={() => scrollBy(-1)}
								className={arrowClass}
							>
								<ArrowLeft className="size-3.5" />
							</button>
							<button
								type="button"
								aria-label="Show more"
								disabled={!canScrollRight}
								onClick={() => scrollBy(1)}
								className={arrowClass}
							>
								<ArrowRight className="size-3.5" />
							</button>
						</>
					) : null}
				</div>
			</div>
			<div
				ref={scrollRef}
				className={cn(
					"flex flex-col gap-1.5 sm:-mx-1 sm:flex-row sm:gap-3 sm:overflow-x-auto sm:px-1",
					scrollbar === "visible" ? "scrollbar-thin sm:pb-2" : "scrollbar-none",
				)}
			>
				{children}
			</div>
		</section>
	)
}

// Standard card width inside a rail: full-width stacked on mobile, 2-up on
// small screens, 3-up on large.
export const railItemClass =
	"w-full sm:shrink-0 sm:grow-0 sm:basis-[calc((100%_-_0.75rem)/2)] lg:basis-[calc((100%_-_1.5rem)/3)]"
