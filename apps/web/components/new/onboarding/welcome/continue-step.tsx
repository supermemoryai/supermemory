import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { motion, type Variants } from "motion/react"
import { useRouter } from "next/navigation"
import { ProfileStep } from "./profile-step"
import { continueVariants, contentVariants } from "@/lib/variants"

type OnboardingView = "continue" | "features" | "memories"

interface OnboardingContentStepProps {
	currentView?: OnboardingView
	onSubmit?: (data: {
		twitter: string
		linkedin: string
		description: string
		otherLinks: string[]
	}) => void
}

const containerVariants: Variants = {
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.4,
			ease: "easeOut",
		},
	},
	hidden: {
		opacity: 0,
		transition: {
			duration: 0,
		},
	},
}

export function OnboardingContentStep({
	currentView = "continue",
	onSubmit,
}: OnboardingContentStepProps) {
	const router = useRouter()

	const handleContinue = () => {
		router.push("/onboarding/welcome?step=features")
	}

	const handleAddMemories = () => {
		router.push("/onboarding/welcome?step=memories")
	}

	const isContinue = currentView === "continue"
	const isFeatures = currentView === "features"
	const isMemories = currentView === "memories"

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="hidden"
			className="text-center relative"
		>
			{/* Continue content */}
			<motion.div
				variants={continueVariants}
				animate={isContinue ? "visible" : "hidden"}
				initial="visible"
				className={cn(
					"flex flex-col items-center justify-center max-w-88",
					!isContinue && "absolute inset-0 pointer-events-none",
				)}
			>
				<p
					className={cn(
						"text-[#8A8A8A] text-sm mb-6 max-w-sm",
						dmSansClassName(),
					)}
				>
					I'm built with Supermemory's super fast memory API,
					<br /> so you never have to worry about forgetting <br /> what matters
					across your AI apps.
				</p>
				<Button
					variant="onboarding"
					onClick={handleContinue}
					style={{
						background: "linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
						width: "147px",
					}}
				>
					Continue →
				</Button>
			</motion.div>

			{/* Features content */}
			<motion.div
				variants={contentVariants}
				animate={isFeatures ? "visible" : "hiddenDown"}
				initial="hiddenDown"
				className={cn(
					"space-y-6 max-w-88",
					!isFeatures && "absolute inset-0 pointer-events-none",
				)}
			>
				<h2 className="text-white text-[32px] font-medium leading-[110%]">
					What I can do for you
				</h2>

				<div className={cn("space-y-4 mb-[24px] mx-4", dmSansClassName())}>
					<div className="flex items-start space-x-2">
						<div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0">
							<img
								src="/onboarding/human-brain.png"
								alt="Brain icon"
								className="w-14 h-14"
							/>
						</div>
						<div className="text-left">
							<p className="text-white font-light">Remember every context</p>
							<p className="text-[#8A8A8A] text-[14px]">
								I keep track of what you've saved and shared with your
								supermemory.
							</p>
						</div>
					</div>

					<div className="flex items-start space-x-2">
						<div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0">
							<img
								src="/onboarding/search.png"
								alt="Search icon"
								className="w-14 h-14"
							/>
						</div>
						<div className="text-left">
							<p className="text-white font-light">Find when you need it</p>
							<p className="text-[#8A8A8A] text-[14px]">
								I surface the right memories inside <br /> your supermemory,
								superfast.
							</p>
						</div>
					</div>

					<div className="flex items-start space-x-2">
						<div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0">
							<img
								src="/onboarding/plant.png"
								alt="Growth icon"
								className="w-14 h-14"
							/>
						</div>
						<div className="text-left">
							<p className="text-white font-light">
								Grow with your supermemory
							</p>
							<p className="text-[#8A8A8A] text-[14px]">
								I learn and personalize over time, so every interaction feels
								natural.
							</p>
						</div>
					</div>
				</div>

				<Button
					variant="onboarding"
					style={{
						background: "linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
					}}
					onClick={handleAddMemories}
				>
					Add memories →
				</Button>
			</motion.div>

			{/* Memories/Profile content */}
			<div
				className={cn(
					"w-full",
					!isMemories && "absolute inset-0 pointer-events-none",
				)}
			>
				{onSubmit && (
					<motion.div
						variants={contentVariants}
						animate={isMemories ? "visible" : "hiddenDown"}
						initial="hiddenDown"
					>
						<ProfileStep onSubmit={onSubmit} />
					</motion.div>
				)}
			</div>
		</motion.div>
	)
}
