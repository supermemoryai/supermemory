"use client"

import { Badge } from "@ui/components/badge"
import { ChevronDown, Eye, Search, X } from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"
import type { SpacesDropdownProps } from "./types"
import { cn } from "@lib/utils"

export const SpacesDropdown = memo<SpacesDropdownProps>(
	({ selectedSpace, availableSpaces, spaceMemoryCounts, onSpaceChange }) => {
		const [isOpen, setIsOpen] = useState(false)
		const [searchQuery, setSearchQuery] = useState("")
		const [highlightedIndex, setHighlightedIndex] = useState(-1)
		const dropdownRef = useRef<HTMLDivElement>(null)
		const searchInputRef = useRef<HTMLInputElement>(null)
		const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

		// Close dropdown when clicking outside
		useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				if (
					dropdownRef.current &&
					!dropdownRef.current.contains(event.target as Node)
				) {
					setIsOpen(false)
				}
			}

			document.addEventListener("mousedown", handleClickOutside)
			return () => document.removeEventListener("mousedown", handleClickOutside)
		}, [])

		// Focus search input when dropdown opens
		useEffect(() => {
			if (isOpen && searchInputRef.current) {
				searchInputRef.current.focus()
			}
		}, [isOpen])

		// Clear search query and reset highlighted index when dropdown closes
		useEffect(() => {
			if (!isOpen) {
				setSearchQuery("")
				setHighlightedIndex(-1)
			}
		}, [isOpen])

		// Filter spaces based on search query (client-side)
		const filteredSpaces = searchQuery
			? availableSpaces.filter((space) =>
					space.toLowerCase().includes(searchQuery.toLowerCase()),
				)
			: availableSpaces

		const totalMemories = Object.values(spaceMemoryCounts).reduce(
			(sum, count) => sum + count,
			0,
		)

		// Total items including "Latest" option
		const totalItems = filteredSpaces.length + 1

		// Scroll highlighted item into view
		useEffect(() => {
			if (highlightedIndex >= 0 && highlightedIndex < totalItems) {
				const element = itemRefs.current.get(highlightedIndex)
				if (element) {
					element.scrollIntoView({
						block: "nearest",
						behavior: "smooth",
					})
				}
			}
		}, [highlightedIndex, totalItems])

		// Handle keyboard navigation
		const handleKeyDown = (e: React.KeyboardEvent) => {
			if (!isOpen) return

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault()
					setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0))
					break
				case "ArrowUp":
					e.preventDefault()
					setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1))
					break
				case "Enter":
					e.preventDefault()
					if (highlightedIndex === 0) {
						onSpaceChange("all")
						setIsOpen(false)
					} else if (
						highlightedIndex > 0 &&
						highlightedIndex <= filteredSpaces.length
					) {
						const selected = filteredSpaces[highlightedIndex - 1]
						if (selected) {
							onSpaceChange(selected)
							setIsOpen(false)
						}
					}
					break
				case "Escape":
					e.preventDefault()
					setIsOpen(false)
					break
			}
		}

		return (
			<div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
				<button
					className={cn(
						"flex items-center gap-3 px-4 py-3 rounded-xl",
						"border-2 border-transparent",
						"backdrop-blur-[12px] transition-all cursor-pointer min-w-60",
						"shadow-[inset_0px_2px_1px_rgba(84,84,84,0.15)]",
						"hover:shadow-[inset_0px_2px_1px_rgba(84,84,84,0.25)]",
					)}
					style={{
						backgroundImage:
							"linear-gradient(#1a1f29, #1a1f29), linear-gradient(150.262deg, #A4E8F5 0%, #267FFA 26%, #464646 49%, #747474 70%, #A4E8F5 100%)",
						backgroundOrigin: "border-box",
						backgroundClip: "padding-box, border-box",
					}}
					onClick={() => setIsOpen(!isOpen)}
					type="button"
				>
					<Eye className="w-4 h-4 text-slate-300" />
					<div className="flex-1 text-left">
						<span className="text-sm text-slate-300 font-medium">
							{selectedSpace === "all"
								? "Latest"
								: selectedSpace || "Select space"}
						</span>
						<div className="text-xs text-slate-500">
							{selectedSpace === "all"
								? ""
								: `${spaceMemoryCounts[selectedSpace] || 0} memories`}
						</div>
					</div>
					<ChevronDown
						className={cn(
							"w-4 h-4 text-slate-300 transition-transform duration-200",
							isOpen && "rotate-180",
						)}
					/>
				</button>

				{isOpen && (
					<div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-[12px] border border-slate-700/40 rounded-xl shadow-xl z-20 overflow-hidden">
						<div className="p-1">
							{/* Search Input - Always show for filtering */}
							<div className="flex items-center gap-2 p-2 border-b border-slate-700/40">
								<div className="flex-1 flex items-center gap-2">
									<Search className="w-4 h-4 text-slate-500" />
									<input
										className="flex-1 bg-transparent text-sm text-slate-300 border-none outline-none placeholder:text-slate-500"
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search spaces..."
										ref={searchInputRef}
										type="text"
										value={searchQuery}
									/>
									{searchQuery && (
										<button
											className="text-slate-500 cursor-pointer border-none bg-transparent transition-colors hover:text-slate-300"
											onClick={() => setSearchQuery("")}
											type="button"
											aria-label="Clear search"
										>
											<X className="w-4 h-4" />
										</button>
									)}
								</div>
							</div>

							{/* Spaces List */}
							<div className="max-h-64 overflow-y-auto">
								{/* Always show "Latest" option */}
								<button
									ref={(el) => {
										if (el) itemRefs.current.set(0, el)
									}}
									className={cn(
										"w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer border-none",
										selectedSpace === "all"
											? "bg-blue-500/20 text-blue-300"
											: highlightedIndex === 0
												? "bg-slate-700/70 text-slate-300"
												: "bg-transparent text-slate-300 hover:bg-slate-700/50",
									)}
									onClick={() => {
										onSpaceChange("all")
										setIsOpen(false)
									}}
									onMouseEnter={() => setHighlightedIndex(0)}
									type="button"
								>
									<span className="text-sm flex-1">Latest</span>
									<Badge className="bg-slate-700/50 text-slate-300 text-xs ml-2">
										{totalMemories}
									</Badge>
								</button>

								{/* Show all spaces, filtered by search query */}
								{filteredSpaces.length > 0
									? filteredSpaces.map((space, index) => {
											const itemIndex = index + 1
											return (
												<button
													ref={(el) => {
														if (el) itemRefs.current.set(itemIndex, el)
													}}
													className={cn(
														"w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer border-none",
														selectedSpace === space
															? "bg-blue-500/20 text-blue-300"
															: highlightedIndex === itemIndex
																? "bg-slate-700/70 text-slate-300"
																: "bg-transparent text-slate-300 hover:bg-slate-700/50",
													)}
													key={space}
													onClick={() => {
														onSpaceChange(space)
														setIsOpen(false)
													}}
													onMouseEnter={() => setHighlightedIndex(itemIndex)}
													type="button"
												>
													<span className="text-sm flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
														{space}
													</span>
													<Badge className="bg-slate-700/50 text-slate-300 text-xs ml-2">
														{spaceMemoryCounts[space] || 0}
													</Badge>
												</button>
											)
										})
									: searchQuery && (
											<div className="px-3 py-2 text-sm text-slate-500 text-center">
												No spaces found matching "{searchQuery}"
											</div>
										)}
							</div>
						</div>
					</div>
				)}
			</div>
		)
	},
)

SpacesDropdown.displayName = "SpacesDropdown"
