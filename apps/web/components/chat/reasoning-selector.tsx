"use client"

import { useEffect, useRef, useState } from "react"
import { BrainIcon, CheckIcon, MoreHorizontalIcon, ZapIcon } from "lucide-react"
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
			className="relative z-10 flex shrink-0 items-center"
		>
			<button
				type="button"
				disabled={disabled}
				onClick={() => setIsOpen((open) => !open)}
				className={cn(
					"cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50",
					variant === "icon"
						? "rounded p-1.5 hover:bg-white/10"
						: "flex items-center gap-1 rounded-full bg-fg-primary/5 px-2.5 py-1 text-[13px] hover:bg-fg-primary/10",
					dmSansClassName(),
				)}
				title="Reasoning"
				aria-label="Reasoning"
			>
				{variant === "icon" ? (
					<MoreHorizontalIcon className="size-3.5 text-white/50 hover:text-white/80" />
				) : (
					<>
						<SelectedIcon className="size-3 shrink-0 text-fg-subtle" />
						<span className="text-fg-primary">{selected?.label}</span>
					</>
				)}
			</button>

			{isOpen && (
				<div
					className={cn(
						"absolute left-0 z-50 w-44 overflow-hidden rounded-lg border border-surface-border bg-surface-card shadow-xl backdrop-blur-xl",
						dropdownDirection === "up" ? "bottom-full mb-2" : "top-full mt-2",
					)}
				>
					<div className="border-b border-surface-border px-3 py-1.5">
						<span className="text-[11px] font-medium text-fg-muted">
							Reasoning effort
						</span>
					</div>
					<div className="p-1">
						{reasoningOptions.map((option) => {
							const Icon = option.id === "thinking" ? BrainIcon : ZapIcon
							const isSelected = option.id === value
							return (
								<button
									key={option.id}
									type="button"
									onClick={() => handleSelect(option.id)}
									className={cn(
										"flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors",
										isSelected ? "bg-[#293952]/60" : "hover:bg-[#293952]/40",
									)}
								>
									<Icon className="size-3 shrink-0 text-white/60" />
									<span className="flex-1 text-[13px] font-medium text-white">
										{option.label}
									</span>
									{isSelected && (
										<CheckIcon className="size-3 shrink-0 text-[#E052A0]" />
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
