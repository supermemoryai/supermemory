"use client";

import { Badge } from "@/ui/badge";
import { ChevronDown, Eye } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import type { SpacesDropdownProps } from "@/types";
import * as styles from "./spaces-dropdown.css";

export const SpacesDropdown = memo<SpacesDropdownProps>(
	({ selectedSpace, availableSpaces, spaceMemoryCounts, onSpaceChange }) => {
		const [isOpen, setIsOpen] = useState(false);
		const dropdownRef = useRef<HTMLDivElement>(null);

		// Close dropdown when clicking outside
		useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				if (
					dropdownRef.current &&
					!dropdownRef.current.contains(event.target as Node)
				) {
					setIsOpen(false);
				}
			};

			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}, []);

		const totalMemories = Object.values(spaceMemoryCounts).reduce(
			(sum, count) => sum + count,
			0,
		);

		return (
			<div className={styles.container} ref={dropdownRef}>
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
								? "All Spaces"
								: selectedSpace || "Select space"}
						</span>
						<div className={styles.triggerSubtext}>
							{selectedSpace === "all"
								? `${totalMemories} total memories`
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
							<button
								className={
									selectedSpace === "all"
										? styles.dropdownItemActive
										: styles.dropdownItem
								}
								onClick={() => {
									onSpaceChange("all");
									setIsOpen(false);
								}}
								type="button"
							>
								<span className={styles.dropdownItemLabel}>All Spaces</span>
								<Badge className={styles.dropdownItemBadge}>
									{totalMemories}
								</Badge>
							</button>
							{availableSpaces.map((space) => (
								<button
									className={
										selectedSpace === space
											? styles.dropdownItemActive
											: styles.dropdownItem
									}
									key={space}
									onClick={() => {
										onSpaceChange(space);
										setIsOpen(false);
									}}
									type="button"
								>
									<span className={styles.dropdownItemLabelTruncate}>{space}</span>
									<Badge className={styles.dropdownItemBadge}>
										{spaceMemoryCounts[space] || 0}
									</Badge>
								</button>
							))}
						</div>
					</div>
				)}
			</div>
		);
	},
);

SpacesDropdown.displayName = "SpacesDropdown";
