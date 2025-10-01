"use client"

import { useCallback, useEffect, useState } from "react"

const ONBOARDING_STORAGE_KEY = "supermemory_onboarding_completed"

export function useOnboardingStorage() {
	const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<
		boolean | null
	>(null)

	useEffect(() => {
		const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY)
		setIsOnboardingCompleted(completed === "true")
	}, [])

	const markOnboardingCompleted = useCallback(() => {
		localStorage.setItem(ONBOARDING_STORAGE_KEY, "true")
		setIsOnboardingCompleted(true)
	}, [])

	const shouldShowOnboarding = useCallback(() => {
		if (isOnboardingCompleted === null) return null // Still loading
		return !isOnboardingCompleted
	}, [isOnboardingCompleted])

	return {
		isOnboardingCompleted,
		markOnboardingCompleted,
		shouldShowOnboarding,
		isLoading: isOnboardingCompleted === null,
	}
}
