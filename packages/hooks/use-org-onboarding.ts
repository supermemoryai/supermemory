"use client"

import { useCallback, useMemo } from "react"
import { useAuth } from "@lib/auth-context"
import { authClient } from "@lib/auth"

/**
 * DB-backed onboarding completion hook for the new app flow.
 * Uses consumer org `metadata.isOnboarded` instead of localStorage.
 *
 * TODO: remove this after the feature flag is removed
 * This hook is for the new app flow only (feature-flagged `nova-alpha-access`).
 * The old onboarding flow will continue to use `useOnboardingStorage` (localStorage).
 */
export function useOrgOnboarding() {
	const { org, updateOrgMetadata } = useAuth()

	const isOrgOnboarded = useMemo(() => {
		if (!org) return null
		return org.metadata?.isOnboarded === true
	}, [org])

	const markOrgOnboarded = useCallback(() => {
		if (!org?.id) {
			console.error("No organization context when marking as onboarded")
			return
		}

		// Optimistic update: update in-memory state immediately
		updateOrgMetadata({ isOnboarded: true })

		authClient.organization
			.update({
				organizationId: org.id,
				data: {
					metadata: {
						...org.metadata,
						isOnboarded: true,
					},
				},
			})
			.catch((error) => {
				console.error("Failed to mark organization as onboarded:", error)
				updateOrgMetadata({ isOnboarded: false })
			})
	}, [org, updateOrgMetadata])

	const resetOrgOnboarded = useCallback(() => {
		if (!org?.id) {
			console.error("No organization context when resetting onboarding")
			return
		}

		// Optimistic update: update in-memory state immediately
		updateOrgMetadata({ isOnboarded: false })

		authClient.organization
			.update({
				organizationId: org.id,
				data: {
					metadata: {
						...org.metadata,
						isOnboarded: false,
					},
				},
			})
			.catch((error) => {
				console.error("Failed to reset organization onboarding:", error)
				updateOrgMetadata({ isOnboarded: true })
			})
	}, [org, updateOrgMetadata])

	const shouldShowOnboarding = useCallback(() => {
		if (isOrgOnboarded === null) return null // Still loading (org not ready)
		return !isOrgOnboarded
	}, [isOrgOnboarded])

	return {
		isOrgOnboarded,
		markOrgOnboarded,
		resetOrgOnboarded,
		shouldShowOnboarding,
		isLoading: org === null,
	}
}
