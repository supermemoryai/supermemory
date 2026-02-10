"use client"

import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	type ReactNode,
} from "react"
import { useAuth } from "@lib/auth-context"

export type MemoryFormData = {
	twitter: string
	linkedin: string
	description: string
	otherLinks: string[]
} | null

interface OnboardingContextValue {
	name: string
	setName: (name: string) => void
	memoryFormData: MemoryFormData
	setMemoryFormData: (data: MemoryFormData) => void
	resetOnboarding: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function useOnboardingContext() {
	const ctx = useContext(OnboardingContext)
	if (!ctx) {
		throw new Error("useOnboardingContext must be used within OnboardingLayout")
	}
	return ctx
}

export default function OnboardingLayout({
	children,
}: {
	children: ReactNode
}) {
	const { user } = useAuth()

	const [name, setNameState] = useState<string>("")
	const [memoryFormData, setMemoryFormDataState] =
		useState<MemoryFormData>(null)

	useEffect(() => {
		const storedName = localStorage.getItem("onboarding_name")
		const storedMemoryFormData = localStorage.getItem(
			"onboarding_memoryFormData",
		)

		if (storedName) {
			setNameState(storedName)
		} else if (user?.displayUsername) {
			setNameState(user.displayUsername)
			localStorage.setItem("onboarding_name", user.displayUsername)
		} else if (user?.name) {
			setNameState(user.name)
			localStorage.setItem("onboarding_name", user.name)
		}

		if (storedMemoryFormData) {
			try {
				setMemoryFormDataState(JSON.parse(storedMemoryFormData))
			} catch {
				// ignore parse errors
			}
		}
	}, [user?.displayUsername, user?.name])

	const setName = useCallback((newName: string) => {
		setNameState(newName)
		localStorage.setItem("onboarding_name", newName)
		localStorage.setItem("username", newName)
	}, [])

	const setMemoryFormData = useCallback((data: MemoryFormData) => {
		setMemoryFormDataState(data)
		if (data) {
			localStorage.setItem("onboarding_memoryFormData", JSON.stringify(data))
		} else {
			localStorage.removeItem("onboarding_memoryFormData")
		}
	}, [])

	const resetOnboarding = useCallback(() => {
		localStorage.removeItem("onboarding_name")
		localStorage.removeItem("onboarding_memoryFormData")
		setNameState("")
		setMemoryFormDataState(null)
	}, [])

	const contextValue: OnboardingContextValue = {
		name,
		setName,
		memoryFormData,
		setMemoryFormData,
		resetOnboarding,
	}

	return (
		<OnboardingContext.Provider value={contextValue}>
			{children}
		</OnboardingContext.Provider>
	)
}
