"use client"

import {
	createContext,
	useContext,
	useState,
	useEffect,
	type ReactNode,
	useMemo,
} from "react"
import { useQueryState } from "nuqs"
import { useIsMobile } from "@hooks/use-mobile"

// Define the context interface
interface OnboardingContextType {
	currentStep: OnboardingStep
	setStep: (step: OnboardingStep) => void
	nextStep: () => void
	previousStep: () => void
	totalSteps: number
	currentStepIndex: number
	// Visible-step aware helpers
	visibleSteps: OnboardingStep[]
	currentVisibleStepIndex: number
	currentVisibleStepNumber: number
	getStepNumberFor: (step: OnboardingStep) => number
	introTriggers: {
		first: boolean
		second: boolean
		third: boolean
		fourth: boolean
	}
	orbsRevealed: boolean
	resetIntroTriggers: () => void
}

// Create the context
const OnboardingContext = createContext<OnboardingContextType | undefined>(
	undefined,
)

// Define the base step order
const BASE_STEP_ORDER = [
	"intro",
	"name",
	"bio",
	"mcp",
	"extension",
	"welcome",
] as const

export type OnboardingStep = (typeof BASE_STEP_ORDER)[number]

interface OnboardingProviderProps {
	children: ReactNode
	initialStep?: OnboardingStep
}

export function OnboardingProvider({
	children,
	initialStep = "intro",
}: OnboardingProviderProps) {
	// Helper function to validate if a step is valid
	const isValidStep = (step: string): step is OnboardingStep => {
		return BASE_STEP_ORDER.includes(step as OnboardingStep)
	}

	const [currentStep, setCurrentStep] = useQueryState("step", {
		defaultValue: initialStep,
		parse: (value: string) => {
			// Validate the step from URL - if invalid, use the initial step
			return isValidStep(value) ? value : initialStep
		},
		serialize: (value: OnboardingStep) => value,
	})
	const [orbsRevealed, setOrbsRevealed] = useState(false)
	const [introTriggers, setIntroTriggers] = useState({
		first: false,
		second: false,
		third: false,
		fourth: false,
	})
	const isMobile = useIsMobile()

	// Compute visible steps based on device
	const visibleSteps = useMemo(() => {
		if (isMobile) {
			// On mobile, hide MCP and Extension steps
			return BASE_STEP_ORDER.filter((s) => s !== "mcp" && s !== "extension")
		}
		return [...BASE_STEP_ORDER]
	}, [isMobile])

	// Setup intro trigger timings when on intro step
	useEffect(() => {
		if (currentStep !== "intro") return

		const cleanups = [
			setTimeout(() => {
				setIntroTriggers((prev) => ({ ...prev, first: true }))
			}, 300),
			setTimeout(() => {
				setIntroTriggers((prev) => ({ ...prev, second: true }))
			}, 300),
			setTimeout(() => {
				setIntroTriggers((prev) => ({ ...prev, third: true }))
			}, 300),
			setTimeout(() => {
				setIntroTriggers((prev) => ({ ...prev, fourth: true }))
			}, 400),
		]

		return () => cleanups.forEach(clearTimeout)
	}, [currentStep])

	// Set orbs as revealed once the fourth trigger is activated OR if we're on any non-intro step
	useEffect(() => {
		if (currentStep !== "intro") {
			// If we're not on the intro step, orbs should always be visible
			// (user has either completed intro or navigated directly to another step)
			if (!orbsRevealed) {
				setOrbsRevealed(true)
			}
		} else if (introTriggers.fourth && !orbsRevealed) {
			// On intro step, reveal orbs only after the fourth trigger
			setOrbsRevealed(true)
		}
	}, [introTriggers.fourth, orbsRevealed, currentStep])

	// Ensure current step is always part of visible steps; if not, advance to the next visible step
	useEffect(() => {
		if (!visibleSteps.includes(currentStep)) {
			if (visibleSteps.length === 0) return
			const baseIndex = BASE_STEP_ORDER.indexOf(currentStep)
			// Find the next visible step after the current base index
			const nextAfterBase = visibleSteps.find(
				(step) => BASE_STEP_ORDER.indexOf(step) > baseIndex,
			)
			const targetStep = nextAfterBase ?? visibleSteps[visibleSteps.length - 1]!
			setCurrentStep(targetStep)
		}
	}, [visibleSteps, currentStep])

	function setStep(step: OnboardingStep) {
		setCurrentStep(step)
	}

	function nextStep() {
		const currentIndex = visibleSteps.indexOf(currentStep)
		const nextIndex = currentIndex + 1

		if (nextIndex < visibleSteps.length) {
			setStep(visibleSteps[nextIndex]!)
		}
	}

	function previousStep() {
		const currentIndex = visibleSteps.indexOf(currentStep)
		const previousIndex = currentIndex - 1

		if (previousIndex >= 0) {
			setStep(visibleSteps[previousIndex]!)
		}
	}

	function resetIntroTriggers() {
		setIntroTriggers({
			first: false,
			second: false,
			third: false,
			fourth: false,
		})
	}

	const currentStepIndex = BASE_STEP_ORDER.indexOf(currentStep)

	// Visible-step aware helpers
	const stepsForNumbering = useMemo(
		() => visibleSteps.filter((s) => s !== "intro" && s !== "welcome"),
		[visibleSteps],
	)

	function getStepNumberFor(step: OnboardingStep): number {
		if (step === "intro" || step === "welcome") {
			return 0
		}
		const idx = stepsForNumbering.indexOf(step)
		return idx === -1 ? 0 : idx + 1
	}

	const currentVisibleStepIndex = useMemo(
		() => visibleSteps.indexOf(currentStep),
		[visibleSteps, currentStep],
	)
	const currentVisibleStepNumber = useMemo(
		() => getStepNumberFor(currentStep),
		[currentStep, stepsForNumbering],
	)
	const totalSteps = stepsForNumbering.length

	const contextValue: OnboardingContextType = {
		currentStep,
		setStep,
		nextStep,
		previousStep,
		totalSteps,
		currentStepIndex,
		visibleSteps,
		currentVisibleStepIndex,
		currentVisibleStepNumber,
		getStepNumberFor,
		introTriggers,
		orbsRevealed,
		resetIntroTriggers,
	}

	return (
		<OnboardingContext.Provider value={contextValue}>
			{children}
		</OnboardingContext.Provider>
	)
}

export function useOnboarding() {
	const context = useContext(OnboardingContext)

	if (context === undefined) {
		throw new Error("useOnboarding must be used within an OnboardingProvider")
	}

	return context
}
