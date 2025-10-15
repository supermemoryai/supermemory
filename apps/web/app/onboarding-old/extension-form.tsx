"use client"

import {
	ArrowUpIcon,
	MicIcon,
	PlusIcon,
	MousePointer2,
	LoaderIcon,
	CheckIcon,
	XIcon,
	ChevronRightIcon,
} from "lucide-react"
import { NavMenu } from "./nav-menu"
import { useOnboarding } from "./onboarding-context"
import { motion, AnimatePresence, type ResolvedValues } from "framer-motion"
import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react"
import React from "react"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"

type CursorAction =
	| { type: "startAt"; target: React.RefObject<HTMLElement | null> }
	| { type: "startAtPercent"; xPercent: number; yPercent: number }
	| {
			type: "move"
			target: React.RefObject<HTMLElement | null>
			duration: number
	  }
	| { type: "move"; xPercent: number; yPercent: number; duration: number }
	| { type: "pause"; duration: number }
	| { type: "click" }
	| { type: "call"; fn: () => void }

interface CursorProps {
	actions: CursorAction[]
	className?: string
	onPositionChange?: (clientX: number, clientY: number) => void
}

function useContainerRect(ref: React.RefObject<HTMLDivElement | null>) {
	const rectRef = React.useRef<DOMRect | null>(null)

	useLayoutEffect(
		function setup() {
			if (!ref.current) return

			function measure() {
				if (ref.current) {
					rectRef.current = ref.current.getBoundingClientRect()
				}
			}

			measure()

			let resizeObserver: ResizeObserver | null = null
			if (typeof ResizeObserver !== "undefined") {
				resizeObserver = new ResizeObserver(function onResize() {
					measure()
				})
				if (ref.current) {
					resizeObserver.observe(ref.current)
				}
			}

			function onScroll() {
				measure()
			}

			window.addEventListener("resize", measure)
			window.addEventListener("scroll", onScroll, true)

			return function cleanup() {
				if (resizeObserver) {
					resizeObserver.disconnect()
				}
				window.removeEventListener("resize", measure)
				window.removeEventListener("scroll", onScroll, true)
			}
		},
		[ref],
	)

	return rectRef
}

function Cursor({ actions, className, onPositionChange }: CursorProps) {
	const [position, setPosition] = useState({ x: "0px", y: "0px" })
	const [scale, setScale] = useState(1)
	const [currentMoveDuration, setCurrentMoveDuration] = useState(0.7) // Default move duration
	const containerRef = useRef<HTMLDivElement>(null)
	const timeoutsRef = useRef<number[]>([])
	const containerRectRef = useContainerRect(containerRef)
	const lastUpdateRef = useRef(0)

	function moveToElement(
		elementRef: React.RefObject<HTMLElement | null>,
		duration: number,
	) {
		if (!containerRef.current || !elementRef.current) return

		setCurrentMoveDuration(duration / 1000) // Convert to seconds for Framer Motion

		const containerRect = containerRef.current.getBoundingClientRect()
		const elementRect = elementRef.current.getBoundingClientRect()
		// Position the TOP-LEFT of the cursor at the center of the target element
		const x = elementRect.left - containerRect.left + elementRect.width / 2
		const y = elementRect.top - containerRect.top + elementRect.height / 2

		setPosition({ x: `${x}px`, y: `${y}px` })
	}

	function setPositionByPercent(xPercent: number, yPercent: number) {
		if (!containerRef.current) return
		const containerRect = containerRef.current.getBoundingClientRect()
		// Percentages indicate where the TOP-LEFT of the cursor should be placed
		const x = (containerRect.width * xPercent) / 100
		const y = (containerRect.height * yPercent) / 100
		setCurrentMoveDuration(0) // snap without animating
		setPosition({ x: `${x}px`, y: `${y}px` })
	}

	function moveToPercent(xPercent: number, yPercent: number, duration: number) {
		if (!containerRef.current) return
		setCurrentMoveDuration(duration / 1000)
		const containerRect = containerRef.current.getBoundingClientRect()
		const x = (containerRect.width * xPercent) / 100
		const y = (containerRect.height * yPercent) / 100
		setPosition({ x: `${x}px`, y: `${y}px` })
	}

	useEffect(() => {
		// Clear any existing timeouts before scheduling new ones
		timeoutsRef.current.forEach((id) => {
			clearTimeout(id)
		})
		timeoutsRef.current = []

		let timeAccumulator = 0

		function schedule(callback: () => void, delay: number): number {
			const id = window.setTimeout(callback, delay)
			timeoutsRef.current.push(id)
			return id
		}

		function executeActions(): void {
			actions.forEach((action) => {
				// startAt should apply immediately at its place in the sequence and not advance time
				if (action.type === "startAt") {
					moveToElement(action.target, 0)
					return
				}
				if (action.type === "startAtPercent") {
					setPositionByPercent(action.xPercent, action.yPercent)
					return
				}

				schedule(() => {
					switch (action.type) {
						case "move":
							if ("target" in action) {
								moveToElement(action.target, action.duration)
							} else {
								moveToPercent(action.xPercent, action.yPercent, action.duration)
							}
							break
						case "click":
							setScale(0.9)
							schedule(function resetClickScale() {
								setScale(1)
							}, 100) // Fixed 100ms click duration
							break
						case "call":
							try {
								action.fn()
							} catch (_) {
								// no-op on errors to avoid breaking demo
							}
							break
						case "pause":
							// Pause doesn't require any action, just time passing
							break
					}
				}, timeAccumulator)

				// Add this action's duration to the accumulator for the next action
				if (action.type === "click") {
					timeAccumulator += 100
				} else if (action.type === "pause") {
					timeAccumulator += action.duration
				} else if (action.type === "move") {
					timeAccumulator += action.duration
				} else {
					// 'call' and startAt/startAtPercent don't consume time
				}
			})
		}

		// make sure refs are ready
		schedule(executeActions, 100)

		return function cleanup(): void {
			timeoutsRef.current.forEach((id) => {
				clearTimeout(id)
			})
			timeoutsRef.current = []
		}
	}, [actions])

	return (
		<div
			ref={containerRef}
			className={`absolute inset-0 pointer-events-none ${className || ""}`}
		>
			<motion.div
				animate={{
					x: position.x,
					y: position.y,
					scale: scale,
				}}
				transition={{
					x: { duration: currentMoveDuration, ease: "easeInOut" },
					y: { duration: currentMoveDuration, ease: "easeInOut" },
					scale: { duration: 0.1, ease: "easeInOut" },
				}}
				className="absolute top-0 left-0"
				style={{ zIndex: 10 }}
				onUpdate={(latest: ResolvedValues) => {
					if (!onPositionChange) return
					const containerRect = containerRectRef.current
					if (!containerRect) return
					const now = performance.now()
					if (now - lastUpdateRef.current < 50) return // ~20fps throttle
					lastUpdateRef.current = now
					const latestX =
						typeof latest.x === "number"
							? latest.x
							: Number.parseFloat(String(latest.x || 0))
					const latestY =
						typeof latest.y === "number"
							? latest.y
							: Number.parseFloat(String(latest.y || 0))
					const clientX = containerRect.left + latestX
					const clientY = containerRect.top + latestY
					onPositionChange(clientX, clientY)
				}}
			>
				<MousePointer2
					className="size-6 drop-shadow"
					strokeWidth={1.5}
					fill="white"
				/>
			</motion.div>
		</div>
	)
}

function SnippetDemo() {
	const snippetRootRef = useRef<HTMLDivElement>(null)
	const sentenceRef = useRef<HTMLSpanElement>(null)
	const [currentEndIndex, setCurrentEndIndex] = useState<number>(0)
	const lastStableIndexRef = useRef<number>(0)
	const [cursorActions, setCursorActions] = useState<CursorAction[]>([])
	const [menuOpen, setMenuOpen] = useState<boolean>(false)
	const [hoveredMenuIndex, setHoveredMenuIndex] = useState<number | null>(null)
	const menuItemRefs = useRef<(HTMLDivElement | null)[]>([])
	const menuItem6Ref = useRef<HTMLElement | null>(null)
	const charRectsRef = useRef<DOMRect[]>([])

	const targetText =
		'There\'s an Italian dish called saltimbocca, which means "leap into the mouth."'

	function getIndexFromClientPoint(clientX: number, clientY: number): number {
		const rects = charRectsRef.current
		if (!sentenceRef.current || rects.length === 0) return 0
		let bestIdx = 0
		let bestDist = Number.POSITIVE_INFINITY
		for (let i = 0; i < rects.length; i++) {
			const r = rects[i]
			if (!r) continue
			const cx = r.left + r.width / 2
			const cy = r.top + r.height / 2
			const dx = clientX - cx
			const dy = clientY - cy
			const d = dx * dx + dy * dy
			if (d < bestDist) {
				bestDist = d
				bestIdx = i
			}
		}
		return bestIdx
	}

	function getMenuItemIndexFromPoint(
		clientX: number,
		clientY: number,
	): number | null {
		const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
		if (!el) return null

		const menuItem = el.closest("[data-menu-idx]") as HTMLElement | null
		if (menuItem) {
			const idx = Number.parseInt(menuItem.dataset.menuIdx || "", 10)
			return Number.isFinite(idx) ? idx : null
		}
		return null
	}

	useLayoutEffect(
		function setupCharRectsMeasurement() {
			function measureCharRects(): void {
				if (!sentenceRef.current) {
					charRectsRef.current = []
					return
				}
				const spans = sentenceRef.current.querySelectorAll("span[data-idx]")
				const rects: DOMRect[] = []
				spans.forEach(function collect(node) {
					rects.push((node as HTMLElement).getBoundingClientRect())
				})
				charRectsRef.current = rects
			}

			measureCharRects()

			let ro1: ResizeObserver | null = null
			let ro2: ResizeObserver | null = null
			if (typeof ResizeObserver !== "undefined") {
				ro1 = new ResizeObserver(function onResize() {
					measureCharRects()
				})
				ro2 = new ResizeObserver(function onResize() {
					measureCharRects()
				})
				if (snippetRootRef.current) ro1.observe(snippetRootRef.current)
				if (sentenceRef.current) ro2.observe(sentenceRef.current)
			}

			function onScroll(): void {
				measureCharRects()
			}
			window.addEventListener("resize", measureCharRects)
			window.addEventListener("scroll", onScroll, true)

			return function cleanup(): void {
				if (ro1) ro1.disconnect()
				if (ro2) ro2.disconnect()
				window.removeEventListener("resize", measureCharRects)
				window.removeEventListener("scroll", onScroll, true)
			}
		},
		[targetText],
	)

	useEffect(function setupActionsOnce() {
		lastStableIndexRef.current = 0
		setCurrentEndIndex(0)
		if (!sentenceRef.current) return
		const total = targetText.length
		const firstSpan = sentenceRef.current.querySelector(
			'span[data-idx="0"]',
		) as HTMLSpanElement | null
		const lastSpan = sentenceRef.current.querySelector(
			`span[data-idx="${Math.max(0, total - 1)}"]`,
		) as HTMLSpanElement | null
		if (!firstSpan || !lastSpan) return
		const firstRef = { current: firstSpan } as React.RefObject<HTMLElement>
		const lastRef = { current: lastSpan } as React.RefObject<HTMLElement>
		setCursorActions([
			{
				type: "call",
				fn: function reset() {
					lastStableIndexRef.current = 0
					setCurrentEndIndex(0)
					setHoveredMenuIndex(null)
				},
			},
			{ type: "startAt", target: firstRef },
			{ type: "pause", duration: 200 },
			{ type: "move", target: lastRef, duration: 1800 },
			{ type: "pause", duration: 1200 },
			{ type: "click" },
			{
				type: "call",
				fn: () => {
					setMenuOpen(true)
				},
			},
			{ type: "pause", duration: 1000 },
			{ type: "move", target: menuItem6Ref, duration: 1000 },
			{ type: "pause", duration: 500 },
			{ type: "click" },
		])
	}, [])

	return (
		<div
			ref={snippetRootRef}
			className="size-full select-none text-xs relative overflow-hidden"
		>
			<Cursor
				actions={cursorActions}
				onPositionChange={function onPositionChange(
					clientX: number,
					clientY: number,
				) {
					// Handle text highlighting
					const textIdx = getIndexFromClientPoint(clientX, clientY)
					const next =
						textIdx < lastStableIndexRef.current
							? lastStableIndexRef.current
							: textIdx
					if (next !== lastStableIndexRef.current) {
						lastStableIndexRef.current = next
						setCurrentEndIndex(next)
					}

					// Handle menu item hovering
					if (menuOpen) {
						const menuIdx = getMenuItemIndexFromPoint(clientX, clientY)
						if (menuIdx !== hoveredMenuIndex) {
							setHoveredMenuIndex(menuIdx)
						}
					}
				}}
			/>
			<div className="h-[125%] w-full bg-white text-justify p-4 text-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
				writing is easier to read, and the easier something is to read, the more
				deeply readers will engage with it. The less energy they expend on your
				prose, the more they'll have left for your ideas. And the further
				they'll read. Most readers' energy tends to flag part way through an
				article or essay. If the friction of reading is low enough, more keep
				going till the end.{" "}
				<span ref={sentenceRef}>
					{targetText.split("").map(function renderChar(ch, idx) {
						const highlighted = idx <= currentEndIndex
						return (
							<span
								key={`char-${idx}-${ch}`}
								data-idx={idx}
								className={highlighted ? "bg-blue-200/70" : undefined}
							>
								{ch}
							</span>
						)
					})}
				</span>
				<span className="size-0 relative">
					{menuOpen && (
						<div className="flex flex-col w-48 text-left absolute top-0 right-0 text-white bg-zinc-800/70 text-xs border-0.5 backdrop-blur-sm border-zinc-900/80 rounded-md px-1.5 py-1.5">
							{[
								"Back",
								"Forward",
								"Reload",
								"Save As...",
								"Print...",
								"Translate to English",
								"Save to Supermemory",
								"View Page Source",
								"Inspect",
							].map((item, idx) => (
								<React.Fragment key={item}>
									<div
										ref={(el) => {
											menuItemRefs.current[idx] = el
											if (idx === 6) {
												menuItem6Ref.current = el
											}
										}}
										data-menu-idx={idx}
										className={cn(
											"px-2 py-0.5 flex items-center gap-1.5 rounded-sm transition-colors",
											(idx === 0 || idx === 1) && "text-white/30",
											hoveredMenuIndex === idx && "bg-blue-500",
										)}
									>
										{idx === 6 && (
											<img
												src="/images/icon-16.png"
												alt="Supermemory"
												className="size-3.5"
											/>
										)}
										{item}
									</div>
									{[2, 5, 6].includes(idx) && (
										<div className="h-px rounded-full my-1 mx-2 bg-zinc-300/20" />
									)}
								</React.Fragment>
							))}
						</div>
					)}
				</span>{" "}
				My goal when writing might be called saltintesta: the ideas leap into
				your head and you barely notice the words that got them there. It's too
				much to hope that writing could ever be pure ideas. You might not even
				want it to be. But for most writers, most of the time, that's the goal
				to aim for. The gap between most writing and pure ideas is not filled
				with poetry. Plus it's more considerate to write simply. When you write
				in a fancy way to impress people, you're making them do extra work just
				so you can seem cool. It's like trailing a long train behind you that
				readers have to carry.
			</div>
		</div>
	)
}

function ChatGPTDemo() {
	const iconRef = useRef<HTMLImageElement>(null)
	const submitButtonRef = useRef<HTMLDivElement>(null)
	const [enhancementStatus, setEnhancementStatus] = useState<
		"notStarted" | "enhancing" | "done"
	>("notStarted")
	const [memoriesExpanded, setMemoriesExpanded] = useState(false)

	const cursorActions: CursorAction[] = useMemo(
		() => [
			{
				type: "call",
				fn: function resetStates() {
					setEnhancementStatus("notStarted")
					setMemoriesExpanded(false)
				},
			},
			{ type: "startAtPercent", xPercent: 80, yPercent: 80 },
			{ type: "pause", duration: 1000 },
			{ type: "move", target: iconRef, duration: 1000 },
			{ type: "pause", duration: 1000 },
			{ type: "click" },
			{
				type: "call",
				fn: function startEnhancing() {
					setEnhancementStatus("enhancing")
				},
			},
			{ type: "pause", duration: 1000 },
			{ type: "move", xPercent: 10, yPercent: 80, duration: 1000 },
			{
				type: "call",
				fn: function finishEnhancing() {
					setEnhancementStatus("done")
				},
			},
			{ type: "pause", duration: 500 },
			{ type: "move", target: iconRef, duration: 1000 },
			{
				type: "call",
				fn: function expandMemories() {
					setMemoriesExpanded(true)
				},
			},
			{ type: "pause", duration: 1000 },
			{ type: "move", xPercent: 80, yPercent: 80, duration: 1000 },
		],
		[],
	)

	return (
		<div
			className="size-full relative overflow-hidden select-none pointer-events-none text-white flex flex-col gap-6 items-center justify-center"
			style={{
				backgroundColor: "#212121",
				fontFamily: "ui-sans-serif, -apple-system, system-ui",
			}}
		>
			<Cursor actions={cursorActions} />
			<div className="text-xl">What's on your mind today?</div>
			<div
				className="w-[85%] text-sm rounded-3xl p-2 flex flex-col gap-2"
				style={{ backgroundColor: "#303030" }}
			>
				<div className="p-2">what are my card's benefits?</div>
				<div className="flex justify-between items-center p-1 pt-0">
					<PlusIcon className="size-5" strokeWidth={1.5} />
					<div className="flex items-center gap-2">
						<div className="h-4.5 flex items-center">
							<motion.div
								ref={iconRef}
								layout
								initial={false}
								animate={{
									backgroundColor:
										enhancementStatus === "notStarted"
											? "transparent"
											: "#1e1b4b",
									borderColor:
										enhancementStatus === "notStarted"
											? "transparent"
											: "#4338ca",
									borderWidth: enhancementStatus === "notStarted" ? 0 : 1,
									paddingLeft:
										enhancementStatus === "notStarted"
											? 0
											: enhancementStatus === "enhancing"
												? 4
												: 8,
									paddingRight:
										enhancementStatus === "notStarted"
											? 0
											: enhancementStatus === "enhancing"
												? 6
												: 8,
									paddingTop: enhancementStatus === "notStarted" ? 0 : 4,
									paddingBottom: enhancementStatus === "notStarted" ? 0 : 4,
									marginTop: enhancementStatus === "notStarted" ? 0 : 4,
									marginBottom: enhancementStatus === "notStarted" ? 0 : 4,
								}}
								transition={{
									duration: 0.2,
									ease: "easeInOut",
									layout: { duration: 0.2, ease: "easeInOut" },
								}}
								className="rounded-full text-xs w-fit flex items-center relative"
								style={{ border: "solid" }}
							>
								{enhancementStatus === "notStarted" && (
									<img
										src="/images/icon-16.png"
										alt="Enhance with Supermemory"
										className="size-5"
									/>
								)}
								{enhancementStatus === "enhancing" && (
									<>
										<LoaderIcon className="size-3 animate-spin" />
										<motion.span
											initial={{ opacity: 0, width: 0 }}
											animate={{ opacity: 1, width: "auto" }}
											transition={{ delay: 0.1, duration: 0.2 }}
											className="ml-2 whitespace-nowrap overflow-hidden"
										>
											Searching...
										</motion.span>
									</>
								)}
								{enhancementStatus === "done" && (
									<>
										<CheckIcon className="size-3 text-green-400" />
										<motion.span
											initial={{ opacity: 0, width: "auto" }}
											animate={{ opacity: 1, width: "auto" }}
											transition={{ delay: 0.1, duration: 0.2 }}
											className="ml-2"
										>
											Including 1 memory
										</motion.span>
									</>
								)}
								<AnimatePresence>
									{memoriesExpanded && (
										<motion.div
											initial={{
												opacity: 0,
												scale: 0.95,
												y: -8,
											}}
											animate={{
												opacity: 1,
												scale: 1,
												y: 0,
											}}
											exit={{
												opacity: 0,
												scale: 0.95,
												y: -8,
											}}
											transition={{
												duration: 0.15,
												ease: [0.16, 1, 0.3, 1],
											}}
											className="absolute left-1/2 -translate-x-1/2 top-8 bg-[#1e1b4b] border border-[#4338ca] w-56 rounded-lg p-2"
											style={{ transformOrigin: "top center" }}
										>
											<div className="flex items-center gap-2">
												<img
													src="/images/icon-16.png"
													alt="Enhance with Supermemory"
													className="size-5"
												/>
												<span className="text-xs">
													User possesses an American Express Platinum card
												</span>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</motion.div>
						</div>

						<MicIcon className="size-4" strokeWidth={1.5} />
						<div
							ref={submitButtonRef}
							className="rounded-full bg-white size-6 flex items-center justify-center"
						>
							<ArrowUpIcon className="size-4 text-black" />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function TwitterDemo() {
	const importButtonRef = useRef<HTMLButtonElement>(null)
	const [importStatus, setImportStatus] = useState<
		"notStarted" | "importing" | "done"
	>("notStarted")

	const cursorActions: CursorAction[] = useMemo(
		() => [
			{
				type: "call",
				fn: function resetStates() {
					setImportStatus("notStarted")
				},
			},
			{ type: "startAtPercent", xPercent: 10, yPercent: 80 },
			{ type: "pause", duration: 1300 },
			{ type: "move", target: importButtonRef, duration: 1100 },
			{ type: "pause", duration: 800 },
			{ type: "click" },
			{
				type: "call",
				fn: function startImporting() {
					setImportStatus("importing")
				},
			},
			{ type: "pause", duration: 700 },
			{ type: "move", xPercent: 80, yPercent: 80, duration: 1200 },
			{
				type: "call",
				fn: function finishImporting() {
					setImportStatus("done")
				},
			},
		],
		[],
	)

	return (
		<div className="size-full relative overflow-hidden select-none flex flex-col items-center justify-center">
			<div className="bg-white text-black px-5 py-3 text-sm rounded-2xl w-9/10">
				<div className="flex justify-between items-center">
					<div className="flex items-center gap-2">
						<span className="text-xl font-bold">𝕏</span>
						<span className="text-base font-medium">
							Import Twitter Bookmarks
						</span>
					</div>
					<XIcon className="size-4" />
				</div>
				<div className="mt-3">
					<p className="text-sm text-zinc-600">
						This will import all your Twitter bookmarks to Supermemory
					</p>
				</div>
				<div className="mt-3">
					<motion.button
						ref={importButtonRef}
						animate={{
							backgroundColor:
								importStatus === "importing"
									? "#f59e0b"
									: importStatus === "done"
										? "#10b981"
										: "#3b82f6",
						}}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="text-white px-4 py-2 rounded-lg flex items-center gap-2 min-w-[180px] justify-center"
					>
						<AnimatePresence mode="wait">
							{importStatus === "importing" && (
								<motion.div
									initial={{ opacity: 0, scale: 0 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0 }}
									transition={{ duration: 0.2 }}
								>
									<LoaderIcon className="size-4 animate-spin" />
								</motion.div>
							)}
							{importStatus === "done" && (
								<motion.div
									initial={{ opacity: 0, scale: 0 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0 }}
									transition={{ duration: 0.2 }}
								>
									<CheckIcon className="size-4" />
								</motion.div>
							)}
						</AnimatePresence>
						<motion.span
							key={importStatus}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.3, ease: "easeInOut" }}
						>
							{importStatus === "importing"
								? "Importing bookmarks..."
								: importStatus === "done"
									? "Import successful"
									: "Import All Bookmarks"}
						</motion.span>
					</motion.button>
				</div>
			</div>
			<Cursor actions={cursorActions} />
		</div>
	)
}

export function ExtensionForm() {
	const { totalSteps, nextStep, getStepNumberFor } = useOnboarding()
	return (
		<div className="relative flex items-start flex-col gap-6 w-full">
			<div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-6 relative">
				<div className="flex flex-col items-start text-left gap-4 flex-1">
					<NavMenu>
						<p className="text-base text-white/60">
							Step {getStepNumberFor("extension")} of {totalSteps}
						</p>
					</NavMenu>
					<h1 className="text-white font-medium text-2xl md:text-4xl">
						Install the Chrome extension
					</h1>
					<p className="text-white/80 text-lg md:text-2xl">
						Bring Supermemory everywhere
					</p>
				</div>
				<div className="flex flex-col items-end text-center gap-3 w-full md:w-auto">
					<Button
						variant="link"
						size="lg"
						className="text-white/80 hover:text-white font-medium! text-lg w-fit px-0! cursor-pointer"
						onClick={nextStep}
					>
						Continue
						<ChevronRightIcon className="size-4" />
					</Button>
					<a
						href="https://chromewebstore.google.com/detail/afpgkkipfdpeaflnpoaffkcankadgjfc?utm_source=item-share-cb"
						rel="noopener noreferrer"
						target="_blank"
						className="bg-zinc-50/80 backdrop-blur-lg border-2 hover:bg-zinc-100/80 transition-colors duration-100 border-zinc-200/80 shadow-xs rounded-full pl-3.5 pr-4 py-2.5 text-base font-sans tracking-tight font-medium flex items-center gap-3 w-full md:w-auto justify-center"
					>
						<img
							src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Google_Chrome_icon_%28February_2022%29.svg/2048px-Google_Chrome_icon_%28February_2022%29.svg.png"
							alt="Chrome"
							className="size-5"
						/>
						Add to Chrome
					</a>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl gap-4 text-base font-sans font-medium tracking-normal">
				<div className="flex flex-col w-full max-w-80 divide-y divide-zinc-200 border border-zinc-200 shadow-xs rounded-xl overflow-hidden">
					<div className="p-4 bg-white">
						<h2 className="text-lg">Remember anything, anywhere</h2>
						<p className="text-zinc-600 text-sm">
							Just right-click to save instantly.
						</p>
					</div>
					<div className="aspect-square bg-blue-500">
						<SnippetDemo />
					</div>
				</div>
				<div className="flex flex-col w-full max-w-80 divide-y divide-zinc-200 border border-zinc-200 shadow-xs rounded-xl overflow-hidden">
					<div className="p-4 bg-white">
						<h2 className="text-lg">Integrate with your AI</h2>
						{/* Supercharge your AI with memory */}
						{/* Supercharge any AI with Supermemory. */}
						{/* ChatGPT is better with Supermemory. */}
						{/* Seamless integration with your workflow */}
						<p className="text-zinc-600 text-sm">
							{/* Integrates with ChatGPT and Claude. */}
							{/* Integrates with your chat apps */}
							Enhance any prompt with Supermemory.
							{/* Seamlessly */}
						</p>
					</div>
					<div className="aspect-square bg-blue-500">
						<ChatGPTDemo />
					</div>
				</div>
				<div className="flex flex-col w-full max-w-80 divide-y divide-zinc-200 border border-zinc-200 shadow-xs rounded-xl overflow-hidden">
					<div className="p-4 bg-white">
						<h2 className="text-lg">Import Twitter bookmarks</h2>
						<p className="text-zinc-600 text-sm">
							Search semantically and effortlessly.
							{/* Import instantly and search effortlessly. */}
						</p>
					</div>
					<div className="aspect-square bg-blue-500">
						<TwitterDemo />
					</div>
				</div>
			</div>
		</div>
	)
}
