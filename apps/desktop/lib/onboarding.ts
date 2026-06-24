"use client"

import type { DesktopToolId } from "@/lib/tools"

export type DesktopOnboardingStep = "welcome" | "tools" | "filesystem" | "done"

export type DesktopOnboardingOwner = {
	userId?: string | null
	email?: string | null
}

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

function storageKey(owner?: DesktopOnboardingOwner | null) {
	const accountId = owner?.userId || owner?.email
	if (!accountId) return STORAGE_KEY
	return `${STORAGE_KEY}:${encodeURIComponent(accountId)}`
}

export function getDesktopOnboardingStatus(
	owner?: DesktopOnboardingOwner | null,
): DesktopOnboardingStatus {
	if (!storageAvailable()) return DEFAULT_STATUS

	try {
		const raw = window.localStorage.getItem(storageKey(owner))
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
	owner?: DesktopOnboardingOwner | null,
): void {
	if (!storageAvailable()) return

	try {
		window.localStorage.setItem(storageKey(owner), JSON.stringify(status))
	} catch {}
}

export function updateDesktopOnboardingStatus(
	patch: Partial<DesktopOnboardingStatus>,
	owner?: DesktopOnboardingOwner | null,
): DesktopOnboardingStatus {
	const next: DesktopOnboardingStatus = {
		...getDesktopOnboardingStatus(owner),
		...patch,
		version: "v1",
	}
	saveDesktopOnboardingStatus(next, owner)
	return next
}

export function shouldShowDesktopOnboarding(
	owner?: DesktopOnboardingOwner | null,
) {
	void owner
	return true
}

export function postAuthRedirectPath(owner?: DesktopOnboardingOwner | null) {
	void owner
	return "/onboarding"
}

export function completeDesktopOnboarding(
	connectedTools: DesktopToolId[] = [],
	owner?: DesktopOnboardingOwner | null,
) {
	return updateDesktopOnboardingStatus(
		{
			completed: true,
			skipped: false,
			completedAt: new Date().toISOString(),
			lastStep: "done",
			connectedTools,
		},
		owner,
	)
}

export function skipDesktopOnboarding(
	lastStep: DesktopOnboardingStep,
	owner?: DesktopOnboardingOwner | null,
) {
	return updateDesktopOnboardingStatus(
		{
			completed: false,
			skipped: true,
			skippedAt: new Date().toISOString(),
			lastStep,
		},
		owner,
	)
}
