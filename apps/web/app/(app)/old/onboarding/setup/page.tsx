"use client"

import { motion, AnimatePresence } from "motion/react"

import { IntegrationsStep } from "@/components/onboarding/setup/integrations-step"

import { SetupHeader } from "@/components/onboarding/setup/header"
import { ChatSidebar } from "@/components/onboarding/setup/chat-sidebar"
import { AnimatedGradientBackground } from "@/components/animated-gradient-background"
import { useIsMobile } from "@hooks/use-mobile"

import { useSetupContext } from "./layout"

export default function SetupPage() {
	const { memoryFormData } = useSetupContext()
	const isMobile = useIsMobile()

	return (
		<div className="relative h-screen overflow-hidden bg-black">
			<SetupHeader />

			<AnimatedGradientBackground animateFromBottom={false} />

			<main className="relative min-h-screen">
				<div className="relative z-10">
					<div className="flex flex-col lg:flex-row h-[calc(100vh-90px)] relative">
						<div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8">
							<AnimatePresence mode="wait">
								<IntegrationsStep key="integrations" />
							</AnimatePresence>
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
