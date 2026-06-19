"use client"

import { dmSansClassName } from "@/lib/fonts"
import {
	type InferredMemory,
	useInferredMemories,
	useReviewInferredMemory,
} from "@/hooks/use-inferred-memories"
import { cn } from "@lib/utils"
import { Dialog, DialogContent } from "@ui/components/dialog"
import { Check, X } from "lucide-react"
import {
	AnimatePresence,
	motion,
	useMotionValue,
	useReducedMotion,
	useTransform,
} from "motion/react"
import { useCallback, useEffect, useState } from "react"

// Distance / velocity past which a drag commits to a decision.
const SWIPE_OFFSET = 120
const SWIPE_VELOCITY = 600
const STACK_DEPTH = 3 // how many cards are visible at once

type Decision = "approve" | "decline" | "skip"

export function ReviewMemoriesModal({
	open,
	onOpenChange,
	containerTag,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	containerTag: string | undefined
}) {
	const { data: memories = [] } = useInferredMemories(containerTag)
	const { mutate: review } = useReviewInferredMemory(containerTag)
	const reduceMotion = useReducedMotion()

	// Snapshot the queue when the modal opens so cache updates from the
	// mutation don't reshuffle the stack mid-session.
	const [cards, setCards] = useState<InferredMemory[]>([])
	const [index, setIndex] = useState(0)
	const [exitDir, setExitDir] = useState(1)
	const [approved, setApproved] = useState(0)

	// Intentionally keyed on `open` only: including `memories` would reset the
	// stack every time the review mutation trims the cache. The queue is loaded
	// by the time the trigger renders, so a snapshot on open is sufficient.
	// biome-ignore lint/correctness/useExhaustiveDependencies: snapshot-on-open
	useEffect(() => {
		if (!open) return
		setCards(memories)
		setIndex(0)
		setApproved(0)
	}, [open])

	const current = cards[index]
	const done = cards.length > 0 && index >= cards.length

	const decide = useCallback(
		(decision: Decision) => {
			const card = cards[index]
			if (!card) return
			// 1 = fly right (approve), -1 = fly left (decline), 0 = drop down (skip)
			setExitDir(decision === "approve" ? 1 : decision === "decline" ? -1 : 0)
			if (decision === "approve") {
				setApproved((n) => n + 1)
				review({ memoryId: card.id, action: "approve" })
			} else if (decision === "decline") {
				review({ memoryId: card.id, action: "decline" })
			}
			// skip persists nothing — it simply resurfaces in a later session.
			setIndex((i) => i + 1)
		},
		[cards, index, review],
	)

	// Keyboard: ← decline, → approve, ↓/space skip.
	useEffect(() => {
		if (!open || done || !current) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight") decide("approve")
			else if (e.key === "ArrowLeft") decide("decline")
			else if (e.key === "ArrowDown" || e.key === " ") {
				e.preventDefault()
				decide("skip")
			}
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [open, done, current, decide])

	const visible = cards.slice(index, index + STACK_DEPTH)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"border-surface-border bg-surface-base p-0 gap-0 overflow-hidden sm:max-w-[420px] rounded-[22px]",
					dmSansClassName(),
				)}
				showCloseButton={false}
			>
				{/* Header */}
				<div className="flex items-start justify-between px-6 pt-6 pb-4">
					<div>
						<p className="text-[15px] font-semibold leading-tight text-fg-primary">
							Suggested memories
						</p>
						<p className="mt-1 text-[12px] leading-tight text-fg-faint">
							Memories we inferred — keep the ones that fit
						</p>
					</div>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className="-mr-1 -mt-1 rounded-full p-1.5 text-fg-faint transition-colors hover:bg-white/[0.06] hover:text-fg-muted"
						aria-label="Close"
					>
						<X className="size-4" />
					</button>
				</div>

				{/* Progress dots */}
				{!done && cards.length > 0 && (
					<div className="flex items-center justify-between px-6 pb-1">
						<div className="flex flex-wrap items-center gap-1.5">
							{cards.map((c, i) => (
								<span
									key={c.id}
									className={cn(
										"h-1.5 rounded-full transition-all duration-300",
										i === index
											? "w-5 bg-brand-accent"
											: i < index
												? "w-1.5 bg-brand-accent/40"
												: "w-1.5 bg-white/15",
									)}
								/>
							))}
						</div>
						<span className="shrink-0 pl-3 text-[11px] tabular-nums text-fg-faint">
							{Math.min(index + 1, cards.length)}/{cards.length}
						</span>
					</div>
				)}

				{/* Card deck */}
				<div className="relative px-6 pt-4 pb-3">
					<div className="relative h-[340px]">
						{/* Nova glow halo behind the deck */}
						{!done && (
							<div
								aria-hidden
								className="pointer-events-none absolute -inset-3 rounded-[28px] opacity-70 blur-2xl"
								style={{
									background:
										"radial-gradient(58% 52% at 50% 42%, rgba(75,160,250,0.45), rgba(54,216,196,0.16) 58%, transparent 76%)",
								}}
							/>
						)}
						{done ? (
							<DoneState approved={approved} total={cards.length} />
						) : (
							<AnimatePresence custom={exitDir} initial={false}>
								{visible.map((mem, i) => (
									<SwipeCard
										key={mem.id}
										memory={mem}
										depth={i}
										globalIndex={index + i}
										isTop={i === 0}
										reduceMotion={!!reduceMotion}
										onDecide={decide}
									/>
								))}
							</AnimatePresence>
						)}
					</div>
				</div>

				{/* Controls */}
				{!done && current && (
					<div className="flex items-center justify-center gap-3 px-5 pb-6 pt-3">
						<motion.button
							type="button"
							aria-label="Decline"
							onClick={() => decide("decline")}
							whileHover={{ scale: 1.07 }}
							whileTap={{ scale: 0.9 }}
							transition={{ duration: 0.15 }}
							className="flex size-14 items-center justify-center rounded-full border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 text-[#ff6b6b] transition-colors hover:bg-[#ff6b6b]/20"
						>
							<X className="size-6" />
						</motion.button>
						<motion.button
							type="button"
							onClick={() => decide("skip")}
							whileHover={{ scale: 1.04 }}
							whileTap={{ scale: 0.94 }}
							transition={{ duration: 0.15 }}
							className="h-10 rounded-full border border-white/10 bg-white/[0.03] px-5 text-[13px] font-medium text-fg-muted transition-colors hover:bg-white/[0.07] hover:text-fg-primary"
						>
							Skip
						</motion.button>
						<motion.button
							type="button"
							aria-label="Keep"
							onClick={() => decide("approve")}
							whileHover={{ scale: 1.07 }}
							whileTap={{ scale: 0.9 }}
							transition={{ duration: 0.15 }}
							className="flex size-14 items-center justify-center rounded-full border border-[#4ade80]/30 bg-[#4ade80]/10 text-[#4ade80] transition-colors hover:bg-[#4ade80]/20"
						>
							<Check className="size-6" />
						</motion.button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}

function SwipeCard({
	memory,
	depth,
	globalIndex,
	isTop,
	reduceMotion,
	onDecide,
}: {
	memory: InferredMemory
	depth: number
	globalIndex: number
	isTop: boolean
	reduceMotion: boolean
	onDecide: (d: Decision) => void
}) {
	const x = useMotionValue(0)
	const rotate = useTransform(x, [-200, 200], reduceMotion ? [0, 0] : [-8, 8])

	// Slack-style: the whole card washes green (keep) / red (decline) and the
	// border + verdict pill intensify the closer you get to committing.
	const wash = useTransform(
		x,
		[-150, -30, 0, 30, 150],
		[
			"rgba(239,68,68,0.34)",
			"rgba(239,68,68,0.04)",
			"rgba(255,255,255,0)",
			"rgba(74,222,128,0.04)",
			"rgba(74,222,128,0.34)",
		],
	)
	const borderColor = useTransform(
		x,
		[-150, -30, 0, 30, 150],
		[
			"rgba(239,68,68,0.7)",
			"rgba(255,255,255,0.08)",
			"rgba(255,255,255,0.08)",
			"rgba(255,255,255,0.08)",
			"rgba(74,222,128,0.7)",
		],
	)
	const keepOpacity = useTransform(x, [30, 120], [0, 1])
	const keepScale = useTransform(x, [30, 120], [0.7, 1])
	const declineOpacity = useTransform(x, [-120, -30], [1, 0])
	const declineScale = useTransform(x, [-120, -30], [1, 0.7])

	const scale = 1 - depth * 0.055
	const y = depth * 16

	return (
		<motion.div
			className="absolute inset-0"
			style={{
				x: isTop ? x : 0,
				rotate: isTop ? rotate : 0,
				// Absolute position keeps the exiting card above the one rising behind.
				zIndex: 999 - globalIndex,
			}}
			variants={{
				exit: (dir: number) => {
					if (reduceMotion)
						return { opacity: 0, transition: { duration: 0.25 } }
					// dir 0 = skip → drop straight down; ±1 = fly out sideways.
					if (dir === 0)
						return {
							y: 480,
							opacity: 0,
							scale: 0.9,
							transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
						}
					return {
						x: dir * 540,
						opacity: 0,
						rotate: dir * 12,
						transition: { duration: 0.42, ease: [0.4, 0, 0.2, 1] },
					}
				},
			}}
			exit="exit"
			initial={{ scale: scale - 0.04, y: y + 10, opacity: 0 }}
			animate={{
				scale,
				y,
				opacity: depth === 0 ? 1 : depth === 1 ? 0.8 : 0.45,
			}}
			transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
			drag={isTop ? "x" : false}
			dragSnapToOrigin
			dragElastic={0.7}
			whileDrag={{ scale: 1.02 }}
			onDragEnd={(_e, info) => {
				if (!isTop) return
				const { offset, velocity } = info
				if (offset.x > SWIPE_OFFSET || velocity.x > SWIPE_VELOCITY)
					onDecide("approve")
				else if (offset.x < -SWIPE_OFFSET || velocity.x < -SWIPE_VELOCITY)
					onDecide("decline")
			}}
		>
			<motion.div
				style={isTop ? { borderColor } : undefined}
				className={cn(
					"relative h-full overflow-hidden rounded-[20px] border border-white/[0.08] bg-surface-card shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55)]",
					isTop && "cursor-grab active:cursor-grabbing",
				)}
			>
				{/* Full-card color wash that tracks the swipe */}
				{isTop && (
					<motion.div
						aria-hidden
						className="pointer-events-none absolute inset-0"
						style={{ backgroundColor: wash }}
					/>
				)}

				{/* Verdict pills — slide/scale in toward the swipe direction */}
				{isTop && (
					<>
						<motion.div
							style={{ opacity: keepOpacity, scale: keepScale }}
							className="pointer-events-none absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-[#4ade80] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#06230f] shadow-lg"
						>
							<Check className="size-3.5" /> Keep
						</motion.div>
						<motion.div
							style={{ opacity: declineOpacity, scale: declineScale }}
							className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-[#ff6b6b] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#2a0808] shadow-lg"
						>
							<X className="size-3.5" /> Decline
						</motion.div>
					</>
				)}

				<div className="relative flex h-full flex-col p-6">
					<div className="flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-accent/85">
						<span className="size-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(75,160,250,0.8)]" />
						Inferred
					</div>

					<div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
						<p className="text-[19px] font-medium leading-[1.32] tracking-[-0.01em] text-fg-primary">
							{memory.memory}
						</p>
					</div>

					<div className="mt-4 flex shrink-0 items-center gap-2 text-[11px] text-fg-faint">
						{memory.parentCount > 0 && (
							<span className="rounded-full bg-white/[0.04] px-2 py-0.5 ring-1 ring-white/[0.06]">
								{memory.parentCount === 1
									? "from 1 memory"
									: `from ${memory.parentCount} memories`}
							</span>
						)}
						<span>{relativeTime(memory.createdAt)}</span>
					</div>
				</div>
			</motion.div>
		</motion.div>
	)
}

function DoneState({ approved, total }: { approved: number; total: number }) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.96 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
			className="flex h-full flex-col items-center justify-center gap-3 text-center"
		>
			<span className="flex size-14 items-center justify-center rounded-full bg-[#4ade801a] ring-1 ring-[#4ade8055]">
				<Check className="size-7 text-[#4ade80]" />
			</span>
			<div>
				<p className="text-base font-semibold text-fg-primary">All caught up</p>
				<p className="mt-1 text-[13px] text-fg-faint">
					{approved > 0
						? `You kept ${approved} of ${total} suggested ${total === 1 ? "memory" : "memories"}.`
						: "Nothing kept this time — they'll stay tucked away."}
				</p>
			</div>
		</motion.div>
	)
}

function relativeTime(iso: string): string {
	const then = new Date(iso).getTime()
	if (Number.isNaN(then)) return ""
	const diff = Date.now() - then
	const day = 86_400_000
	if (diff < day) return "today"
	if (diff < 2 * day) return "yesterday"
	if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
	if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`
	return `${Math.floor(diff / (30 * day))}mo ago`
}
