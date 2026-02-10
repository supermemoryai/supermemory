"use client"

import { motion, AnimatePresence } from "motion/react"

import { RelatableQuestion } from "@/components/new/onboarding/setup/relatable-question"
import { IntegrationsStep } from "@/components/new/onboarding/setup/integrations-step"

import { SetupHeader } from "@/components/new/onboarding/setup/header"
import { ChatSidebar } from "@/components/new/onboarding/setup/chat-sidebar"
import { AnimatedGradientBackground } from "@/components/new/animated-gradient-background"
import { useIsMobile } from "@hooks/use-mobile"

import { useSetupContext, type SetupStep } from "./layout"

function StepNotFound({ goToStep }: { goToStep: (step: SetupStep) => void }) {
	return (
		<motion.div
			className="text-center"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
		>
			<h2 className="text-white text-2xl mb-4">Unknown step</h2>
			<button
				type="button"
				onClick={() => goToStep("relatable")}
				className="text-blue-400 underline"
			>
				Go to first step
			</button>
		</motion.div>
	)
}

export default function SetupPage() {
	const { memoryFormData, currentStep, goToStep } = useSetupContext()
	const isMobile = useIsMobile()

	const renderStep = () => {
		switch (currentStep) {
			case "relatable":
				return <RelatableQuestion key="relatable" />
			case "integrations":
				return <IntegrationsStep key="integrations" />
			default:
				return <StepNotFound key="not-found" goToStep={goToStep} />
		}
	}

	return (
		<div className="h-screen overflow-hidden bg-black">
			<SetupHeader />

			<AnimatedGradientBackground animateFromBottom={false} />

			<main className="relative min-h-screen">
				<div className="relative z-10">
					<div className="flex flex-col lg:flex-row h-[calc(100vh-90px)] relative">
						<div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8">
							<AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
						</div>

						{!isMobile && (
							<AnimatePresence mode="popLayout">
								<ChatSidebar formData={memoryFormData} />
							</AnimatePresence>
						)}
					</div>
				</div>
			</main>

			{isMobile && <ChatSidebar formData={memoryFormData} />}
		</div>
	)
}
