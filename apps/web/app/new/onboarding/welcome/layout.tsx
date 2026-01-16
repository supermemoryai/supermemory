"use client"

import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	useRef,
	type ReactNode,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useOnboardingContext, type MemoryFormData } from "../layout"

export const WELCOME_STEPS = [
	"input",
	"greeting",
	"welcome",
	"username",
	"features",
	"memories",
] as const
export type WelcomeStep = (typeof WELCOME_STEPS)[number]

interface WelcomeContextValue {
	name: string
	setName: (name: string) => void
	isSubmitting: boolean
	setIsSubmitting: (value: boolean) => void
	showWelcomeContent: boolean
	memoryFormData: MemoryFormData
	setMemoryFormData: (data: MemoryFormData) => void
	currentStep: WelcomeStep
	goToStep: (step: WelcomeStep) => void
	goToSetup: (step?: string) => void
}

const WelcomeContext = createContext<WelcomeContextValue | null>(null)

export function useWelcomeContext() {
	const ctx = useContext(WelcomeContext)
	if (!ctx) {
		throw new Error("useWelcomeContext must be used within WelcomeLayout")
	}
	return ctx
}

export default function WelcomeLayout({ children }: { children: ReactNode }) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { name, setName, memoryFormData, setMemoryFormData } =
		useOnboardingContext()

	const stepParam = searchParams.get("step")
	const currentStep: WelcomeStep = WELCOME_STEPS.includes(
		stepParam as WelcomeStep,
	)
		? (stepParam as WelcomeStep)
		: "input"

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showWelcomeContent, setShowWelcomeContent] = useState(false)
	const isMountedRef = useRef(true)

	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
		}
	}, [])

	useEffect(() => {
		if (currentStep === "input") {
			setShowWelcomeContent(false)
			const timer = setTimeout(() => {
				if (isMountedRef.current) {
					setShowWelcomeContent(true)
				}
			}, 1000)
			return () => clearTimeout(timer)
		}
		setShowWelcomeContent(true)
	}, [currentStep])

	useEffect(() => {
		const timers: NodeJS.Timeout[] = []

		if (currentStep === "greeting") {
			timers.push(
				setTimeout(() => {
					if (isMountedRef.current) {
						router.replace("/new/onboarding/welcome?step=welcome")
					}
				}, 2000),
			)
		} else if (currentStep === "welcome") {
			timers.push(
				setTimeout(() => {
					if (isMountedRef.current) {
						router.replace("/new/onboarding/welcome?step=username")
					}
				}, 2000),
			)
		}

		return () => {
			timers.forEach(clearTimeout)
		}
	}, [currentStep, router])

	const goToStep = useCallback(
		(step: WelcomeStep) => {
			router.push(`/new/onboarding/welcome?step=${step}`)
		},
		[router],
	)

	const goToSetup = useCallback(
		(step = "relatable") => {
			router.push(`/new/onboarding/setup?step=${step}`)
		},
		[router],
	)

	const contextValue: WelcomeContextValue = {
		name,
		setName,
		isSubmitting,
		setIsSubmitting,
		showWelcomeContent,
		memoryFormData,
		setMemoryFormData,
		currentStep,
		goToStep,
		goToSetup,
	}

	return (
		<WelcomeContext.Provider value={contextValue}>
			{children}
		</WelcomeContext.Provider>
	)
}
