"use client"

import { Badge } from "@/ui/badge"
import { ChevronDown, Eye, Search, X } from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"
import type { SpacesDropdownProps } from "@/types"
import * as styles from "./spaces-dropdown.css"

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
						const selectedSpace = filteredSpaces[highlightedIndex - 1]
						if (selectedSpace) {
							onSpaceChange(selectedSpace)
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
			<div
				className={styles.container}
				ref={dropdownRef}
				onKeyDown={handleKeyDown}
			>
				<button
					className={styles.trigger}
					onClick={() => setIsOpen(!isOpen)}
					type="button"
				>
					{/*@ts-ignore */}
					<Eye className={styles.triggerIcon} />
					<div className={styles.triggerContent}>
						<span className={styles.triggerLabel}>
							{selectedSpace === "all"
								? "Latest"
								: selectedSpace || "Select space"}
						</span>
						<div className={styles.triggerSubtext}>
							{selectedSpace === "all"
								? ""
								: `${spaceMemoryCounts[selectedSpace] || 0} memories`}
						</div>
					</div>
					{/*@ts-ignore */}
					<ChevronDown
						className={`${styles.triggerChevron} ${isOpen ? styles.triggerChevronOpen : ""}`}
					/>
				</button>

				{isOpen && (
					<div className={styles.dropdown}>
						<div className={styles.dropdownInner}>
							{/* Search Input - Always show for filtering */}
							<div className={styles.searchContainer}>
								<div className={styles.searchForm}>
									{/*@ts-ignore */}
									<Search className={styles.searchIcon} />
									<input
										className={styles.searchInput}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search spaces..."
										ref={searchInputRef}
										type="text"
										value={searchQuery}
									/>
									{searchQuery && (
										<button
											className={styles.searchClearButton}
											onClick={() => setSearchQuery("")}
											type="button"
											aria-label="Clear search"
										>
											{/*@ts-ignore */}
											<X className={styles.searchIcon} />
										</button>
									)}
								</div>
							</div>

							{/* Spaces List */}
							<div className={styles.dropdownList}>
								{/* Always show "Latest" option */}
								<button
									ref={(el) => {
										if (el) itemRefs.current.set(0, el)
									}}
									className={
										selectedSpace === "all"
											? styles.dropdownItemActive
											: highlightedIndex === 0
												? styles.dropdownItemHighlighted
												: styles.dropdownItem
									}
									onClick={() => {
										onSpaceChange("all")
										setIsOpen(false)
									}}
									onMouseEnter={() => setHighlightedIndex(0)}
									type="button"
								>
									<span className={styles.dropdownItemLabel}>Latest</span>
									<Badge className={styles.dropdownItemBadge}>
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
													className={
														selectedSpace === space
															? styles.dropdownItemActive
															: highlightedIndex === itemIndex
																? styles.dropdownItemHighlighted
																: styles.dropdownItem
													}
													key={space}
													onClick={() => {
														onSpaceChange(space)
														setIsOpen(false)
													}}
													onMouseEnter={() => setHighlightedIndex(itemIndex)}
													type="button"
												>
													<span className={styles.dropdownItemLabelTruncate}>
														{space}
													</span>
													<Badge className={styles.dropdownItemBadge}>
														{spaceMemoryCounts[space] || 0}
													</Badge>
												</button>
											)
										})
									: searchQuery && (
											<div className={styles.emptyState}>
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
