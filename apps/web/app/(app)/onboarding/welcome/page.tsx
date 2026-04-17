"use client"

import { useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@lib/utils"

import { InputStep } from "@/components/onboarding/welcome/input-step"
import { GreetingStep } from "@/components/onboarding/welcome/greeting-step"
import { WelcomeStep } from "@/components/onboarding/welcome/welcome-step"
import { OnboardingContentStep } from "@/components/onboarding/welcome/continue-step"

import { InitialHeader } from "@/components/initial-header"
import { Logo } from "@ui/assets/Logo"
import NovaOrb from "@/components/nova/nova-orb"
import { AnimatedGradientBackground } from "@/components/animated-gradient-background"

import {
	useWelcomeContext,
	type WelcomeStep as WelcomeStepType,
} from "./layout"
import { gapVariants, orbVariants } from "@/lib/variants"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { analytics } from "@/lib/analytics"
import { toast } from "sonner"

function generateSlugFromName(value: string) {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "") || "org"
	)
}

function generateOrgSlug(name: string) {
	const base = generateSlugFromName(name.trim())
	const randomNum = Math.floor(100000 + Math.random() * 900000)
	return `${base}-${randomNum}`
}

function generateUsername(name: string) {
	const base = generateSlugFromName(name.trim()).replace(/-/g, "_")
	const randomNum = Math.floor(100000 + Math.random() * 900000)
	return `${base}${randomNum}`
}

function UserSupermemory({ name }: { name: string }) {
	return (
		<motion.div
			className="absolute inset-0 top-[-34px] flex items-center justify-center z-10"
			initial={{ opacity: 0, y: 0 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 0 }}
			transition={{ duration: 1, ease: "easeOut" }}
		>
			<Logo className="h-14 text-white" />
			<div className="flex flex-col items-start justify-center ml-4">
				<p className="text-white text-[25px] font-medium leading-none">
					{name.split(" ")[0]}'s
				</p>
				<p className="text-white font-bold text-4xl leading-none -mt-2">
					supermemory
				</p>
			</div>
		</motion.div>
	)
}

function StepNotFound({
	goToStep,
}: {
	goToStep: (step: WelcomeStepType) => void
}) {
	return (
		<motion.div
			className="text-center"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
		>
			<h2 className="text-white text-2xl mb-4">Unknown step</h2>
			<button
				type="button"
				onClick={() => goToStep("input")}
				className="text-blue-400 underline"
			>
				Start from beginning
			</button>
		</motion.div>
	)
}

export default function WelcomePage() {
	const {
		name,
		setName,
		isSubmitting,
		setIsSubmitting,
		showWelcomeContent,
		setMemoryFormData,
		currentStep,
		goToStep,
	} = useWelcomeContext()

	const { refetchOrganizations, setActiveOrg } = useAuth()
	const submitLockRef = useRef(false)

	const handleSubmit = async () => {
		const trimmed = name.trim()
		if (!trimmed) return
		if (submitLockRef.current) return
		submitLockRef.current = true
		localStorage.setItem("username", trimmed)
		setIsSubmitting(true)

		try {
			await authClient.updateUser({
				displayUsername: trimmed,
				username: generateUsername(trimmed),
			})

			const refetchResult = await refetchOrganizations()
			const refetchData = (
				refetchResult as { data?: unknown[] | null | undefined }
			)?.data
			const existingOrgs = Array.isArray(refetchData) ? refetchData : []

			if (existingOrgs.length > 0) {
				analytics.onboardingNameSubmitted({
					name_length: trimmed.length,
				})
				goToStep("greeting")
				return
			}

			const uniqueSlug = generateOrgSlug(trimmed)
			const completedAt = new Date().toISOString()
			const newOrg = await authClient.organization.create({
				name: trimmed,
				slug: uniqueSlug,
				metadata: {
					signupSource: "consumer",
					webOnboarding: {
						completedAt: null,
						steps: {
							welcomeInput: {
								startedAt: completedAt,
								completedAt,
								data: {},
							},
						},
					},
				},
			})

			await setActiveOrg(newOrg.slug)

			analytics.onboardingNameSubmitted({ name_length: trimmed.length })
			goToStep("greeting")
		} catch (error) {
			console.error("Onboarding submit failed:", error)
			toast.error(
				error instanceof Error
					? error.message
					: "Could not set up your workspace. Please try again.",
			)
		} finally {
			submitLockRef.current = false
			setIsSubmitting(false)
		}
	}

	const renderStep = () => {
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
			case "features":
			case "memories":
				return (
					<OnboardingContentStep
						key="onboarding-content"
						currentView={
							currentStep === "username"
								? "continue"
								: currentStep === "features"
									? "features"
									: "memories"
						}
						onSubmit={setMemoryFormData}
					/>
				)
			default:
				return <StepNotFound key="not-found" goToStep={goToStep} />
		}
	}

	const minimizeNovaOrb = ["features", "memories"].includes(currentStep)
	const novaSize = currentStep === "memories" ? 150 : 300
	const showUserSupermemory = currentStep === "username"

	return (
		<div className="h-screen overflow-hidden bg-black">
			<InitialHeader
				showUserSupermemory={
					currentStep === "features" || currentStep === "memories"
				}
				showSkipOnboarding={currentStep !== "input"}
				name={name}
			/>

			{currentStep === "input" && (
				<AnimatedGradientBackground animateFromBottom={true} />
			)}

			{showWelcomeContent && (
				<div className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto">
					<motion.div
						className="absolute inset-0 bg-[url('/bg-rectangle.png')] bg-cover bg-center bg-no-repeat pointer-events-none"
						transition={{ duration: 0.75, ease: "easeOut", bounce: 0 }}
						style={{
							mixBlendMode: "soft-light",
							opacity: 0.6,
						}}
					/>
					<motion.div
						className={cn(
							"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center",
						)}
						variants={gapVariants}
						animate={minimizeNovaOrb ? "minimized" : "default"}
					>
						<motion.div
							variants={orbVariants}
							animate={
								currentStep === "features"
									? "features"
									: currentStep === "memories"
										? "memories"
										: "default"
							}
							initial={{
								padding: 0,
								paddingTop: 0,
								y: 60,
							}}
							className="relative"
						>
							<NovaOrb size={novaSize} />
							{showUserSupermemory && <UserSupermemory name={name} />}
						</motion.div>

						<AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
					</motion.div>
				</div>
			)}
		</div>
	)
}
