"use client";

import { cn } from "@repo/lib/utils";
import { Badge } from "@repo/ui/components/badge";
import { ChevronDown, Eye } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import type { SpacesDropdownProps } from "./types";

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
			<div className="relative" ref={dropdownRef}>
				{isOpen && (
					<div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/40 rounded-xl shadow-xl z-20 overflow-hidden">
						<div className="p-1">
							<button
								className={cn(
									"w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors",
									selectedSpace === "all"
										? "bg-blue-500/20 text-blue-300"
										: "text-slate-200 hover:bg-slate-700/50",
								)}
								onClick={() => {
									onSpaceChange("all");
									setIsOpen(false);
								}}
								type="button"
							>
								<span className="text-sm">All Spaces</span>
								<Badge className="bg-slate-700/50 text-slate-300 text-xs">
									{totalMemories}
								</Badge>
							</button>
							{availableSpaces.map((space) => (
								<button
									className={cn(
										"w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors",
										selectedSpace === space
											? "bg-blue-500/20 text-blue-300"
											: "text-slate-200 hover:bg-slate-700/50",
									)}
									key={space}
									onClick={() => {
										onSpaceChange(space);
										setIsOpen(false);
									}}
									type="button"
								>
									<span className="text-sm truncate flex-1">{space}</span>
									<Badge className="bg-slate-700/50 text-slate-300 text-xs ml-2">
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
