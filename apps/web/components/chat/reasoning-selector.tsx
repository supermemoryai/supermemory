"use client"

import { useEffect, useRef, useState } from "react"
import {
	BrainIcon,
	CheckIcon,
	ChevronDownIcon,
	MoreHorizontalIcon,
	ZapIcon,
} from "lucide-react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { reasoningOptions, type ReasoningEffort } from "@/lib/models"

interface ReasoningSelectorProps {
	value: ReasoningEffort
	onChange: (value: ReasoningEffort) => void
	variant?: "pill" | "icon"
	disabled?: boolean
	dropdownDirection?: "up" | "down"
}

export function ReasoningSelector({
	value,
	onChange,
	variant = "pill",
	disabled = false,
	dropdownDirection = "up",
}: ReasoningSelectorProps) {
	const [isOpen, setIsOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const selected = reasoningOptions.find((option) => option.id === value)
	const SelectedIcon = value === "thinking" ? BrainIcon : ZapIcon
	const selectedLabel = selected?.label ?? "Reasoning"
	const selectedItemClass =
		"border border-[#267BF1]/35 bg-[#0A1A3A] text-white shadow-[inset_0_0_0_1px_rgba(75,160,250,0.08)]"

	useEffect(() => {
		if (!isOpen) return
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false)
			}
		}
		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, [isOpen])

	const handleSelect = (next: ReasoningEffort) => {
		onChange(next)
		setIsOpen(false)
	}

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative flex shrink-0 items-center",
				isOpen ? "z-[1000]" : "z-10",
			)}
		>
			<button
				type="button"
				disabled={disabled}
				onClick={() => setIsOpen((open) => !open)}
				className={cn(
					"cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50",
					variant === "icon"
						? "rounded p-1.5 hover:bg-white/10"
						: "flex size-9 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-black px-0 py-1.5 text-[13px] text-white hover:border-white/30 hover:bg-white/5 sm:size-auto sm:justify-start sm:px-2.5",
					dmSansClassName(),
				)}
				title={`Reasoning: ${selectedLabel}`}
				aria-label={`Reasoning: ${selectedLabel}`}
				aria-expanded={isOpen}
			>
				{variant === "icon" ? (
					<MoreHorizontalIcon className="size-3.5 text-white/50 hover:text-white/80" />
				) : (
					<>
						<SelectedIcon className="size-3.5 shrink-0 text-white/65" />
						<span className="hidden text-white sm:inline">
							{selected?.label}
						</span>
						<ChevronDownIcon className="hidden size-3.5 shrink-0 text-white/55 sm:block" />
					</>
				)}
			</button>

			{isOpen && (
				<div
					className={cn(
						"isolate absolute left-0 z-[1000] w-[min(14rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/15 bg-black p-1 shadow-[0_18px_48px_rgba(0,0,0,0.55)]",
						dropdownDirection === "up" ? "bottom-full mb-2" : "top-full mt-2",
					)}
				>
					<div className="space-y-1">
						{reasoningOptions.map((option) => {
							const Icon = option.id === "thinking" ? BrainIcon : ZapIcon
							const isSelected = option.id === value
							return (
								<button
									key={option.id}
									type="button"
									onClick={() => handleSelect(option.id)}
									className={cn(
										"flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
										isSelected
											? selectedItemClass
											: "text-white hover:bg-white/10",
									)}
								>
									<Icon
										className={cn(
											"size-4 shrink-0",
											isSelected ? "text-[#8DBDFF]" : "text-white/65",
										)}
									/>
									<div className="min-w-0 flex-1">
										<div
											className={cn(
												"text-[15px] font-medium",
												isSelected ? "text-white" : "text-white",
											)}
										>
											{option.label}
										</div>
									</div>
									{isSelected && (
										<CheckIcon className="size-4 shrink-0 text-[#8DBDFF]" />
									)}
								</button>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}
