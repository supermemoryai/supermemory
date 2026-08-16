import { describe, expect, it } from "bun:test"
import {
	createAuthSessionScope,
	isOAuthConsentPath,
	readScopedAuthValue,
	scopedAuthValueForResponse,
} from "./scoped-auth-state"

const accountAScope = createAuthSessionScope({
	isPending: false,
	sessionId: "session-a",
	userId: "user-a",
})
const accountBScope = createAuthSessionScope({
	isPending: false,
	sessionId: "session-b",
	userId: "user-b",
})

if (!accountAScope || !accountBScope) {
	throw new Error("Test scopes must be defined")
}

describe("scoped auth state", () => {
	it("hides the previous account's data immediately", () => {
		const accountAOrganizations = {
			scope: accountAScope,
			data: [{ id: "private-account-a-org" }],
		}

		expect(readScopedAuthValue(accountBScope, accountAOrganizations)).toEqual({
			ready: false,
		})
		expect(readScopedAuthValue(null, accountAOrganizations)).toEqual({
			ready: false,
		})
	})

	it("accepts only responses for the current session scope", () => {
		expect(
			scopedAuthValueForResponse(accountBScope, accountAScope, [
				"late-account-a-org",
			]),
		).toBeNull()

		const accountBOrganizations = scopedAuthValueForResponse(
			accountBScope,
			accountBScope,
			["account-b-org"],
		)
		expect(readScopedAuthValue(accountBScope, accountBOrganizations)).toEqual({
			ready: true,
			data: ["account-b-org"],
		})
	})

	it("requires a settled authenticated session", () => {
		expect(
			createAuthSessionScope({
				isPending: true,
				sessionId: "stale-session",
				userId: "stale-user",
			}),
		).toBeNull()
		expect(
			createAuthSessionScope({
				isPending: false,
				sessionId: null,
				userId: null,
			}),
		).toBeNull()
	})

	it("refetches when the same user starts a new session", () => {
		const first = createAuthSessionScope({
			isPending: false,
			sessionId: "first-session",
			userId: "same-user",
		})
		const second = createAuthSessionScope({
			isPending: false,
			sessionId: "second-session",
			userId: "same-user",
		})

		expect(first).not.toBe(second)
	})

	it("serializes identifiers without delimiter collisions", () => {
		const first = createAuthSessionScope({
			isPending: false,
			sessionId: "session|user",
			userId: "scope",
		})
		const second = createAuthSessionScope({
			isPending: false,
			sessionId: "session",
			userId: "user|scope",
		})

		expect(first).not.toBe(second)
	})

	it("recognizes canonical and trailing-slash OAuth consent routes", () => {
		expect(isOAuthConsentPath("/oauth/consent")).toBe(true)
		expect(isOAuthConsentPath("/oauth/consent/")).toBe(true)
		expect(isOAuthConsentPath("/brain")).toBe(false)
	})
})
