"use client"

import { AnimatePresence, motion } from "motion/react"
import { BrainIcon, ZapIcon } from "lucide-react"
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

const iconVariants = {
	initial: (toThinking: boolean) => ({
		y: toThinking ? "-110%" : "110%",
		opacity: 0,
	}),
	animate: { y: "0%", opacity: 1 },
	exit: (toThinking: boolean) => ({
		y: toThinking ? "110%" : "-110%",
		opacity: 0,
	}),
}

export function ReasoningSelector({
	value,
	onChange,
	disabled = false,
}: ReasoningSelectorProps) {
	const toThinking = value === "thinking"
	const Icon = toThinking ? BrainIcon : ZapIcon
	const selectedLabel =
		reasoningOptions.find((option) => option.id === value)?.label ?? "Reasoning"
	const nextValue: ReasoningEffort = toThinking ? "instant" : "thinking"

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={() => onChange(nextValue)}
			className={cn(
				"group flex shrink-0 cursor-pointer items-center rounded-md px-1.5 py-1 text-xs text-white/80 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50",
				dmSansClassName(),
			)}
			title={`Reasoning: ${selectedLabel} — click to switch`}
			aria-label={`Reasoning: ${selectedLabel}. Click to switch.`}
		>
			<span className="relative flex size-3.5 shrink-0 items-center justify-center overflow-hidden">
				<AnimatePresence initial={false} mode="popLayout" custom={toThinking}>
					<motion.span
						key={value}
						custom={toThinking}
						variants={iconVariants}
						initial="initial"
						animate="animate"
						exit="exit"
						transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
						className="absolute inset-0 flex items-center justify-center"
					>
						<Icon className="size-3.5 text-white/45 transition-colors group-hover:text-white/70" />
					</motion.span>
				</AnimatePresence>
			</span>
			<span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:ml-1 group-hover:max-w-[88px] group-hover:opacity-100">
				{selectedLabel}
			</span>
		</button>
	)
}
