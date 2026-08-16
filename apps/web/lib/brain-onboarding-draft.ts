const LEGACY_ONBOARDING_DRAFT_KEY = "supermemory-brain-onboarding-v1"
const ONBOARDING_DRAFT_KEY_PREFIX = "supermemory-brain-onboarding-v2"

export type OnboardingDraftStorage = Pick<
	Storage,
	"getItem" | "setItem" | "removeItem"
>

export function getOnboardingDraftStorage(): OnboardingDraftStorage | null {
	try {
		return globalThis.localStorage ?? null
	} catch {
		return null
	}
}

export function onboardingDraftKey(userId: string): string {
	return `${ONBOARDING_DRAFT_KEY_PREFIX}:${encodeURIComponent(userId)}`
}

export function readOnboardingDraft<T extends object>(
	storage: OnboardingDraftStorage,
	userId: string,
): T | null {
	try {
		const raw = storage.getItem(onboardingDraftKey(userId))
		if (!raw) return null
		const parsed: unknown = JSON.parse(raw)
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return null
		}
		return parsed as T
	} catch {
		return null
	}
}

export function writeOnboardingDraft(
	storage: OnboardingDraftStorage,
	userId: string,
	draft: object,
): void {
	try {
		storage.setItem(onboardingDraftKey(userId), JSON.stringify(draft))
	} catch {}
}

export function clearOnboardingDraft(
	storage: OnboardingDraftStorage,
	userId: string,
): void {
	try {
		storage.removeItem(onboardingDraftKey(userId))
	} catch {}
}

// Legacy drafts cannot be attributed to an account safely. Discard them
// instead of risking that the next signed-in user sees another user's data.
export function discardLegacyOnboardingDraft(
	storage: OnboardingDraftStorage,
): void {
	try {
		storage.removeItem(LEGACY_ONBOARDING_DRAFT_KEY)
	} catch {}
}
