"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { InitialHeader } from "@/components/initial-header"
import { useAuth } from "@lib/auth-context"
import { InputStep } from "./input-step"
import { GreetingStep } from "./greeting-step"
import { WelcomeStep } from "./welcome-step"
import { ContinueStep } from "./continue-step"
import { FeaturesStep } from "./features-step"
import { MemoriesStep } from "./memories-step"
import { Logo } from "@ui/assets/Logo"
import NovaOrb from "@/components/nova/nova-orb"
import { cn } from "@lib/utils"
import { AnimatedGradientBackground } from "../setup/page"

type OnboardStep =
	| "input"
	| "greeting"
	| "welcome"
	| "username"
	| "features"
	| "memories"

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
				<p className="text-white text-xl leading-none">{name}'s</p>
				<p className="text-white font-bold text-4xl leading-none -mt-2">
					supermemory
				</p>
			</div>
		</motion.div>
	)
}

export default function OnboardPage() {
	const { user } = useAuth()
	const [name, setName] = useState(user?.name ?? "")
	const [currentStep, setCurrentStep] = useState<OnboardStep>("input")
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = () => {
		localStorage.setItem("username", name)
		if (name.trim()) {
			setIsSubmitting(true)
			setCurrentStep("greeting")
			setIsSubmitting(false)
		}
	}

	useEffect(() => {
		if (user?.name) {
			setName(user.name)
			localStorage.setItem("username", user.name)
		}
	}, [user?.name])

	useEffect(() => {
		const timers: NodeJS.Timeout[] = []

		switch (currentStep) {
			case "greeting":
				timers.push(setTimeout(() => setCurrentStep("welcome"), 2000))
				break
			case "welcome":
				timers.push(setTimeout(() => setCurrentStep("username"), 2000))
				break
		}

		return () => {
			timers.forEach(clearTimeout)
		}
	}, [currentStep])

	return (
		<div className="min-h-screen bg-black">
			<InitialHeader
				showUserSupermemory={currentStep === "features"}
				name={name}
			/>
			<AnimatedGradientBackground />
			<div className="flex flex-col items-center justify-start h-[calc(100vh-86px)] relative">
				<motion.div
					className="absolute inset-0 bg-[url('/bg-rectangle.png')] bg-cover bg-center bg-no-repeat"
					transition={{ duration: 0.75, ease: "easeOut", bounce: 0 }}
					style={{
						mixBlendMode: "soft-light",
						opacity: 0.6,
					}}
				/>
				<motion.div
					className={cn(
						"relative z-10 flex flex-col items-center justify-center",
						currentStep === "features" || currentStep === "memories"
							? "mt-0"
							: "mt-16",
					)}
					animate={{
						gap:
							currentStep === "features" || currentStep === "memories" ? 0 : 16,
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
							padding:
								currentStep === "features" || currentStep === "memories"
									? 0
									: 32,
						}}
						transition={{
							duration: 0.8,
							ease: "easeOut",
							delay: 0.2,
						}}
						layout
						className="relative"
					>
						<NovaOrb size={currentStep === "memories" ? 150 : 300} />
						{currentStep === "username" && <UserSupermemory name={name} />}
					</motion.div>

					<AnimatePresence mode="wait">
						{currentStep === "input" && (
							<InputStep
								key="input"
								name={name}
								setName={setName}
								handleSubmit={handleSubmit}
								isSubmitting={isSubmitting}
							/>
						)}

						{currentStep === "greeting" && (
							<GreetingStep key="greeting" name={name} />
						)}

						{currentStep === "welcome" && <WelcomeStep key="welcome" />}

						{currentStep === "username" && (
							<ContinueStep
								key="username"
								setCurrentStep={(step) => setCurrentStep(step as OnboardStep)}
							/>
						)}
						{currentStep === "features" && (
							<FeaturesStep
								key="features"
								setCurrentStep={(step) => setCurrentStep(step as OnboardStep)}
							/>
						)}
						{currentStep === "memories" && <MemoriesStep key="memories" />}
					</AnimatePresence>
				</motion.div>
			</div>
		</div>
	)
}
