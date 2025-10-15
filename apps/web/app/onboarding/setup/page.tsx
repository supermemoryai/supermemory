"use client"

import { SetupHeader } from "./header"
import { AnimatePresence, motion } from "motion/react"
import { RelatableQuestion } from "./relatable-question"
import { IntegrationsStep } from "./integrations-step"
import { ChatSidebar } from "./chat-sidebar"
import { useState } from "react"

function AnimatedGradientBackground() {
	return (
		<div className="fixed inset-0 z-0 overflow-hidden">
			<motion.div
				className="absolute top-[40%] left-0 right-0 bottom-0 bg-[url('/onboarding/bg-gradient-0.png')] bg-[length:150%_auto] bg-top bg-no-repeat"
				initial={{ y: "100%" }}
				animate={{
					y: 0,
					opacity: [1, 0, 1],
				}}
				transition={{
					y: { duration: 0.75, ease: "easeOut" },
					opacity: {
						duration: 8,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					},
				}}
			/>
			<motion.div
				className="absolute top-[40%] left-0 right-0 bottom-0 bg-[url('/onboarding/bg-gradient-1.png')] bg-[length:150%_auto] bg-top bg-no-repeat"
				initial={{ y: "100%" }}
				animate={{
					y: 0,
					opacity: [0, 1, 0],
				}}
				transition={{
					y: { duration: 0.75, ease: "easeOut" },
					opacity: {
						duration: 8,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					},
				}}
			/>
			<motion.div
				className="absolute top-0 left-0 right-0 bottom-0 bg-[url('/bg-rectangle.png')] bg-cover bg-center bg-no-repeat"
				initial={{ y: "100%" }}
				animate={{ y: 0 }}
				transition={{ duration: 0.75, ease: "easeOut", bounce: 0 }}
				style={{
					mixBlendMode: "soft-light",
					opacity: 0.6,
				}}
			/>
		</div>
	)
}

export default function SetupPage() {
	const [currentStep, setCurrentStep] = useState<"relatable" | "integrations">(
		"relatable",
	)

	const handleContinueOrSkip = () => {
		setCurrentStep("integrations")
	}

	const handleBack = () => {
		setCurrentStep("relatable")
	}

	return (
		<main className="relative min-h-screen bg-[#080A0D]">
			<AnimatedGradientBackground />
			<div className="relative z-10">
				<SetupHeader />
				<div className="flex flex-row h-[calc(100vh-90px)] relative">
					<div className="flex-1 flex flex-col items-center justify-start p-8">
						{currentStep === "relatable" && (
							<RelatableQuestion onContinueOrSkip={handleContinueOrSkip} />
						)}
						{currentStep === "integrations" && (
							<IntegrationsStep onBack={handleBack} />
						)}
					</div>

					<AnimatePresence mode="popLayout">
						<ChatSidebar />
					</AnimatePresence>
				</div>
			</div>
		</main>
	)
}
