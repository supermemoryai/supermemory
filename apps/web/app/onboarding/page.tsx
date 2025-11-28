"use client"

import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { useState, useEffect } from "react"
import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"

import { InputStep } from "./welcome/input-step"
import { GreetingStep } from "./welcome/greeting-step"
import { WelcomeStep } from "./welcome/welcome-step"
import { ContinueStep } from "./welcome/continue-step"
import { FeaturesStep } from "./welcome/features-step"
import { MemoriesStep } from "./welcome/memories-step"
import { RelatableQuestion } from "./setup/relatable-question"
import { IntegrationsStep } from "./setup/integrations-step"

import { InitialHeader } from "@/components/initial-header"
import { SetupHeader } from "./setup/header"
import { ChatSidebar } from "./setup/chat-sidebar"
import { Logo } from "@ui/assets/Logo"
import NovaOrb from "@/components/nova/nova-orb"
import { AnimatedGradientBackground } from "./setup/page"

function UserSupermemory({ name }: { name: string }) {
	return (
		<motion.div
			className="absolute inset-0 flex items-center justify-center"
			initial={{ opacity: 0, y: 0 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 0 }}
			transition={{ duration: 1, ease: "easeOut" }}
		>
			<Logo className="h-14 text-white" />
			<div className="flex flex-col items-start justify-center ml-4">
				<p className="text-white text-xl font-medium leading-none">{name}'s</p>
				<p className="text-white font-bold text-4xl leading-none -mt-2">
					supermemory
				</p>
			</div>
		</motion.div>
	)
}

export default function OnboardingPage() {
	const searchParams = useSearchParams()
	const { user } = useAuth()

	const flow = searchParams.get("flow") as "welcome" | "setup" | null
	const step = searchParams.get("step") as string | null

	const [name, setName] = useState(user?.name ?? "")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [memoryFormData, setMemoryFormData] = useState<{
		twitter: string
		linkedin: string
		description: string
		otherLinks: string[]
	} | null>(null)

	const currentFlow = flow || "welcome"
	const currentStep = step || "input"

	useEffect(() => {
		if (user?.name) {
			setName(user.name)
			localStorage.setItem("username", user.name)
		}
	}, [user?.name])

	useEffect(() => {
		if (currentFlow !== "welcome") return

		const timers: NodeJS.Timeout[] = []

		switch (currentStep) {
			case "greeting":
				timers.push(
					setTimeout(() => {
						// Auto-advance to welcome step
						window.history.replaceState(
							null,
							"",
							"/onboarding?flow=welcome&step=welcome",
						)
					}, 2000),
				)
				break
			case "welcome":
				timers.push(
					setTimeout(() => {
						// Auto-advance to username step
						window.history.replaceState(
							null,
							"",
							"/onboarding?flow=welcome&step=username",
						)
					}, 2000),
				)
				break
		}

		return () => {
			timers.forEach(clearTimeout)
		}
	}, [currentStep, currentFlow])

	const handleSubmit = () => {
		localStorage.setItem("username", name)
		if (name.trim()) {
			setIsSubmitting(true)
			window.history.replaceState(
				null,
				"",
				"/onboarding?flow=welcome&step=greeting",
			)
			setIsSubmitting(false)
		}
	}

	const renderWelcomeStep = () => {
		switch (currentStep) {
			case "input":
				return (
					<InputStep
						key="input"
						name={name}
						setName={setName}
						handleSubmit={handleSubmit}
						isSubmitting={isSubmitting}
					/>
				)
			case "greeting":
				return <GreetingStep key="greeting" name={name} />
			case "welcome":
				return <WelcomeStep key="welcome" />
			case "username":
				return <ContinueStep key="username" />
			case "features":
				return <FeaturesStep key="features" />
			case "memories":
				return <MemoriesStep key="memories" onSubmit={setMemoryFormData} />
			default:
				return null
		}
	}

	const renderSetupStep = () => {
		switch (currentStep) {
			case "relatable":
				return <RelatableQuestion key="relatable" />
			case "integrations":
				return <IntegrationsStep key="integrations" />
			default:
				return null
		}
	}

	const isWelcomeFlow = currentFlow === "welcome"
	const isSetupFlow = currentFlow === "setup"

	const minimizeNovaOrb =
		isWelcomeFlow && ["features", "memories"].includes(currentStep)
	const novaSize = currentStep === "memories" ? 150 : 300

	const showUserSupermemory = isWelcomeFlow && currentStep === "username"

	return (
		<div className="min-h-screen bg-black">
			{isWelcomeFlow && (
				<InitialHeader
					showUserSupermemory={
						currentStep === "features" || currentStep === "memories"
					}
					name={name}
				/>
			)}
			{isSetupFlow && <SetupHeader />}

			{isSetupFlow && <AnimatedGradientBackground />}

			{isWelcomeFlow && (
				<div className="flex flex-col items-center justify-start min-h-[calc(100vh-86px)] relative">
					<motion.div
						className="fixed inset-0 bg-[url('/bg-rectangle.png')] bg-cover bg-center bg-no-repeat pointer-events-none"
						transition={{ duration: 0.75, ease: "easeOut", bounce: 0 }}
						style={{
							mixBlendMode: "soft-light",
							opacity: 0.6,
						}}
					/>
					<motion.div
						className={cn(
							"relative z-10 flex flex-col items-center justify-center",
							minimizeNovaOrb ? "mt-0" : "mt-16",
						)}
						animate={{
							gap: minimizeNovaOrb ? 0 : 16,
						}}
						transition={{
							duration: 0.6,
							ease: "easeOut",
						}}
						layout
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{
								opacity: 1,
								scale:
									currentStep === "features"
										? 0.7
										: currentStep === "memories"
											? 0.4
											: 1,
								padding: minimizeNovaOrb ? 0 : 48,
							}}
							transition={{
								duration: 0.8,
								ease: "easeOut",
								delay: 0.2,
							}}
							layout
							className="relative"
						>
							<NovaOrb size={novaSize} />
							{showUserSupermemory && <UserSupermemory name={name} />}
						</motion.div>

						<AnimatePresence mode="wait">{renderWelcomeStep()}</AnimatePresence>
					</motion.div>
				</div>
			)}

			{isSetupFlow && (
				<main className="relative min-h-screen">
					<div className="relative z-10">
						<div className="flex flex-row h-[calc(100vh-90px)] relative">
							<div className="flex-1 flex flex-col items-center justify-start p-8">
								<AnimatePresence mode="wait">
									{renderSetupStep()}
								</AnimatePresence>
							</div>

							<AnimatePresence mode="popLayout">
								<ChatSidebar formData={memoryFormData} />
							</AnimatePresence>
						</div>
					</div>
				</main>
			)}
		</div>
	)
}
