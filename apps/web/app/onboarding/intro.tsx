"use client"

import { AnimatedText } from "./animated-text"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@repo/ui/components/button"
import { cn } from "@lib/utils"
import { useOnboarding } from "./onboarding-context"

export function Intro() {
	const { nextStep, introTriggers: triggers } = useOnboarding()

	return (
		<motion.div
			className="flex flex-col gap-4 relative text-2xl md:text-4xl w-full text-white text-center"
			layout
			transition={{
				layout: { duration: 0.8, ease: "anticipate" },
			}}
		>
			<AnimatePresence mode="popLayout">
				<p className="font-medium text-base">Hey there!</p>
				{triggers.first && (
					<motion.div
						key="first"
						layout
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{
							opacity: { duration: 0.3 },
							layout: { duration: 0.8, ease: "easeInOut" },
						}}
					>
						<AnimatedText trigger={triggers.first} delay={0}>
							Intelligence without memory
						</AnimatedText>
					</motion.div>
				)}
				{triggers.second && (
					<motion.div
						key="second"
						layout
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{
							opacity: { duration: 0.3 },
							layout: { duration: 0.8, ease: "easeInOut" },
						}}
					>
						<AnimatedText trigger={triggers.second} delay={0.4}>
							is just sophisticated randomness.
						</AnimatedText>
					</motion.div>
				)}
			</AnimatePresence>
			<motion.div
				key="fourth"
				className="justify-center flex mt-6"
				initial={{ opacity: 0, filter: "blur(5px)" }}
				animate={{
					opacity: triggers.fourth ? 1 : 0,
					filter: triggers.fourth ? "blur(0px)" : "blur(5px)",
				}}
				transition={{
					opacity: { duration: 0.6, ease: "easeOut" },
					filter: { duration: 0.4, ease: "easeOut" },
				}}
			>
				<Button
					variant={"default"}
					size={"sm"}
					className={cn(
						"bg-[#1e3a5f] hover:bg-[#2a4a75] border-2 border-[#4a7ba7]/50 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300",
						!triggers.fourth && "pointer-events-none opacity-50",
					)}
					style={{
						transform: triggers.fourth ? "scale(1)" : "scale(0.95)",
					}}
					onClick={nextStep}
				>
					Get Started
				</Button>
			</motion.div>
		</motion.div>
	)
}
