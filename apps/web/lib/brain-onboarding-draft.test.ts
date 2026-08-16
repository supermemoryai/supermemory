import { describe, expect, test } from "bun:test"
import {
	clearOnboardingDraft,
	discardLegacyOnboardingDraft,
	getOnboardingDraftStorage,
	onboardingDraftKey,
	readOnboardingDraft,
	writeOnboardingDraft,
} from "./brain-onboarding-draft"

function createStorage() {
	const values = new Map<string, string>()
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key),
		values,
	}
}

describe("brain onboarding draft storage", () => {
	test("isolates drafts belonging to different users", () => {
		const storage = createStorage()
		const accountADraft = {
			about: { workspaceName: "Account A workspace" },
			team: { invites: [{ email: "private-a@example.com" }] },
		}

		writeOnboardingDraft(storage, "account-a", accountADraft)

		expect(readOnboardingDraft(storage, "account-a")).toEqual(accountADraft)
		expect(readOnboardingDraft(storage, "account-b")).toBeNull()
		expect(onboardingDraftKey("account-a")).not.toBe(
			onboardingDraftKey("account-b"),
		)
		expect(onboardingDraftKey("account/a")).toBe(
			"supermemory-brain-onboarding-v2:account%2Fa",
		)
	})

	test("clears only the current user's draft", () => {
		const storage = createStorage()
		writeOnboardingDraft(storage, "account-a", { mode: "team" })
		writeOnboardingDraft(storage, "account-b", { mode: "personal" })

		clearOnboardingDraft(storage, "account-a")

		expect(readOnboardingDraft(storage, "account-a")).toBeNull()
		expect(readOnboardingDraft(storage, "account-b")).toEqual({
			mode: "personal",
		})
	})

	test("discards unattributable legacy drafts without migrating them", () => {
		const storage = createStorage()
		storage.setItem(
			"supermemory-brain-onboarding-v1",
			JSON.stringify({ about: { name: "Previous account" } }),
		)

		discardLegacyOnboardingDraft(storage)

		expect(storage.getItem("supermemory-brain-onboarding-v1")).toBeNull()
		expect(readOnboardingDraft(storage, "current-account")).toBeNull()
	})

	test("ignores corrupt and non-object drafts", () => {
		const storage = createStorage()
		storage.setItem(onboardingDraftKey("account-a"), "not-json")
		storage.setItem(onboardingDraftKey("account-b"), "[]")

		expect(readOnboardingDraft(storage, "account-a")).toBeNull()
		expect(readOnboardingDraft(storage, "account-b")).toBeNull()
	})

	test("treats a blocked browser storage getter as unavailable", () => {
		const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			get: () => {
				throw new Error("blocked")
			},
		})

		try {
			expect(getOnboardingDraftStorage()).toBeNull()
		} finally {
			if (original) {
				Object.defineProperty(globalThis, "localStorage", original)
			} else {
				Reflect.deleteProperty(globalThis, "localStorage")
			}
		}
	})
})
