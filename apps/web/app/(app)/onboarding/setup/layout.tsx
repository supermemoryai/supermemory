"use client"

import {
	createContext,
	useContext,
	useCallback,
	useEffect,
	useRef,
	type ReactNode,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useOnboardingContext, type MemoryFormData } from "../layout"
import { analytics } from "@/lib/analytics"

export const SETUP_STEPS = ["relatable", "integrations"] as const
export type SetupStep = (typeof SETUP_STEPS)[number]

interface SetupContextValue {
	memoryFormData: MemoryFormData
	currentStep: SetupStep
	goToStep: (step: SetupStep) => void
	goToWelcome: (step?: string) => void
	finishOnboarding: () => void
}

const SetupContext = createContext<SetupContextValue | null>(null)

export function useSetupContext() {
	const ctx = useContext(SetupContext)
	if (!ctx) {
		throw new Error("useSetupContext must be used within SetupLayout")
	}
	return ctx
}

export default function SetupLayout({ children }: { children: ReactNode }) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { memoryFormData, resetOnboarding } = useOnboardingContext()

	const stepParam = searchParams.get("step")
	const currentStep: SetupStep = SETUP_STEPS.includes(stepParam as SetupStep)
		? (stepParam as SetupStep)
		: "relatable"
	const hasTrackedInitialStep = useRef(false)

	const goToStep = useCallback(
		(step: SetupStep) => {
			analytics.onboardingStepViewed({ step, trigger: "user" })
			router.push(`/onboarding/setup?step=${step}`)
		},
		[router],
	)

	const goToWelcome = useCallback(
		(step = "input") => {
			router.push(`/onboarding/welcome?step=${step}`)
		},
		[router],
	)

	const finishOnboarding = useCallback(() => {
		resetOnboarding()
		router.push("/")
	}, [router, resetOnboarding])

	useEffect(() => {
		if (!hasTrackedInitialStep.current) {
			analytics.onboardingStepViewed({ step: currentStep, trigger: "user" })
			hasTrackedInitialStep.current = true
		}
	}, [currentStep])

	const contextValue: SetupContextValue = {
		memoryFormData,
		currentStep,
		goToStep,
		goToWelcome,
		finishOnboarding,
	}

	return (
		<SetupContext.Provider value={contextValue}>
			{children}
		</SetupContext.Provider>
	)
}
