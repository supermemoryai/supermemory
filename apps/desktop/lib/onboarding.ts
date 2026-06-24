"use client"

import type { DesktopToolId } from "@/lib/tools"

export type DesktopOnboardingStep = "welcome" | "tools" | "filesystem" | "done"

export type DesktopOnboardingStatus = {
	version: "v1"
	completed: boolean
	skipped: boolean
	completedAt?: string
	skippedAt?: string
	lastStep: DesktopOnboardingStep
	connectedTools: DesktopToolId[]
}

const STORAGE_KEY = "supermemory-desktop-onboarding-v1"

const DEFAULT_STATUS: DesktopOnboardingStatus = {
	version: "v1",
	completed: false,
	skipped: false,
	lastStep: "welcome",
	connectedTools: [],
}

function storageAvailable() {
	return (
		typeof window !== "undefined" && typeof window.localStorage !== "undefined"
	)
}

export function getDesktopOnboardingStatus(): DesktopOnboardingStatus {
	if (!storageAvailable()) return DEFAULT_STATUS

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)
		if (!raw) return DEFAULT_STATUS
		const parsed = JSON.parse(raw) as Partial<DesktopOnboardingStatus>
		if (parsed.version !== "v1") return DEFAULT_STATUS
		return {
			...DEFAULT_STATUS,
			...parsed,
			connectedTools: Array.isArray(parsed.connectedTools)
				? parsed.connectedTools
				: [],
		}
	} catch {
		return DEFAULT_STATUS
	}
}

export function saveDesktopOnboardingStatus(
	status: DesktopOnboardingStatus,
): void {
	if (!storageAvailable()) return

	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
	} catch {}
}

export function updateDesktopOnboardingStatus(
	patch: Partial<DesktopOnboardingStatus>,
): DesktopOnboardingStatus {
	const next: DesktopOnboardingStatus = {
		...getDesktopOnboardingStatus(),
		...patch,
		version: "v1",
	}
	saveDesktopOnboardingStatus(next)
	return next
}

export function shouldShowDesktopOnboarding() {
	const status = getDesktopOnboardingStatus()
	return !status.completed && !status.skipped
}

export function postAuthRedirectPath() {
	return shouldShowDesktopOnboarding() ? "/onboarding" : "/"
}

export function completeDesktopOnboarding(
	connectedTools: DesktopToolId[] = [],
) {
	return updateDesktopOnboardingStatus({
		completed: true,
		skipped: false,
		completedAt: new Date().toISOString(),
		lastStep: "done",
		connectedTools,
	})
}

export function skipDesktopOnboarding(lastStep: DesktopOnboardingStep) {
	return updateDesktopOnboardingStatus({
		completed: false,
		skipped: true,
		skippedAt: new Date().toISOString(),
		lastStep,
	})
}
