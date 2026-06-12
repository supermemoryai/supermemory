"use client"

import { LogoFull } from "@ui/assets/Logo"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { motion } from "motion/react"
import { BRAIN_STEPS, BRAIN_STEP_LABELS, type BrainStep } from "./types"

interface ShellProps {
	step: BrainStep
	domain?: string | null
	children: React.ReactNode
}

export function BrainShell({ step, children }: ShellProps) {
	const visibleSteps: BrainStep[] = BRAIN_STEPS

	return (
		<div
			className={cn(
				"relative min-h-dvh bg-[#05080D] text-[#FAFAFA] flex flex-col overflow-hidden",
				dmSansClassName(),
			)}
		>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 select-none"
				style={{
					background:
						"radial-gradient(ellipse 80% 60% at 50% 40%, rgba(75,160,250,0.08) 0%, rgba(34,97,202,0.04) 35%, transparent 70%)",
				}}
			/>

			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 select-none"
				style={{
					backgroundImage:
						"radial-gradient(circle at center, rgba(105,167,240,0.22) 1px, transparent 1px)",
					backgroundSize: "28px 28px",
					maskImage:
						"radial-gradient(ellipse at center, black 0%, black 40%, transparent 90%)",
					WebkitMaskImage:
						"radial-gradient(ellipse at center, black 0%, black 40%, transparent 90%)",
				}}
			/>

			<header className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center px-6 md:px-10 py-4 gap-4">
				<LogoFull className="h-5 md:h-6 text-[#fafafa] justify-self-start" />
				<StepIndicator step={step} visibleSteps={visibleSteps} />
				<span aria-hidden />
			</header>

			<main
				className={cn(
					"relative z-10 flex-1 flex justify-center px-4 md:px-10 py-6 md:py-10",
					step === "sources"
						? "items-start overflow-y-auto"
						: "items-center overflow-hidden",
				)}
			>
				<div
					className={cn(
						"w-full",
						step === "sources" ? "max-w-none" : "max-w-5xl",
					)}
				>
					{children}
				</div>
			</main>
		</div>
	)
}

function StepIndicator({
	step,
	visibleSteps,
}: {
	step: BrainStep
	visibleSteps: BrainStep[]
}) {
	const currentIdx = visibleSteps.indexOf(step)
	return (
		<div className="flex items-start">
			{visibleSteps.map((s, i) => {
				const isDone = i < currentIdx
				const isCurrent = i === currentIdx
				const isLast = i === visibleSteps.length - 1
				return (
					<div key={s} className="flex items-start">
						<div className="flex flex-col items-center gap-1.5 min-w-[58px]">
							<StepDot done={isDone} current={isCurrent} />
							<span
								className={cn(
									"text-[11px] font-medium transition-colors leading-none",
									isCurrent
										? "text-[#fafafa]"
										: isDone
											? "text-[#737373]"
											: "text-[#525D6E]",
								)}
							>
								{BRAIN_STEP_LABELS[s]}
							</span>
						</div>
						{!isLast && (
							<div className="flex-1 h-px min-w-[28px] mt-[5px]">
								<motion.div
									initial={false}
									animate={{
										background: isDone
											? "linear-gradient(to right, #4BA0FA, rgba(75,160,250,0.4))"
											: "#2E353D",
									}}
									transition={{ duration: 0.3 }}
									className="h-full w-full rounded-full"
								/>
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}

function StepDot({ done, current }: { done: boolean; current: boolean }) {
	if (current) {
		return (
			<div className="relative size-3 flex items-center justify-center">
				<motion.span
					layoutId="brain-step-ring"
					className="absolute inset-0 rounded-full border-2 border-[#4BA0FA]"
				/>
				<span className="size-1.5 rounded-full bg-[#4BA0FA]" />
			</div>
		)
	}
	if (done) {
		return (
			<div className="size-3 flex items-center justify-center">
				<span className="size-2.5 rounded-full bg-[#4BA0FA]" />
			</div>
		)
	}
	return (
		<div className="size-3 flex items-center justify-center">
			<span className="size-2.5 rounded-full border border-[#2E353D]" />
		</div>
	)
}
