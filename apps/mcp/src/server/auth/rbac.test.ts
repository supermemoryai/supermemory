import { describe, expect, it } from "vitest"
import { type SessionInfo, sessionInfoSchema } from "../../shared/types"
import { effectiveNamespaceAccess } from "./rbac"

const baseSession: SessionInfo = {
	user: { id: "user_test" },
	accessType: "full",
	scope: { type: "full", permission: "write" },
}

describe("effectiveNamespaceAccess", () => {
	it("marks every visible namespace writable for full access", () => {
		expect(effectiveNamespaceAccess(["one", "two"], baseSession)).toEqual([
			{ namespace: "one", permission: "write" },
			{ namespace: "two", permission: "write" },
		])
	})

	it("preserves restricted member permissions", () => {
		const session: SessionInfo = {
			...baseSession,
			accessType: "restricted",
			namespaces: [
				{ namespace: "one", permission: "read" },
				{ namespace: "two", permission: "write" },
			],
		}

		expect(effectiveNamespaceAccess(["one", "two"], session)).toEqual([
			{ namespace: "one", permission: "read" },
			{ namespace: "two", permission: "write" },
		])
	})

	it("makes client-scoped read access authoritative for widget choices", () => {
		const session: SessionInfo = {
			...baseSession,
			scope: {
				type: "scoped",
				permission: "read",
				tags: ["one"],
			},
		}

		expect(effectiveNamespaceAccess(["one"], session)).toEqual([
			{ namespace: "one", permission: "read" },
		])
	})

	it("treats full-scope read-only grants as read on every namespace", () => {
		const session: SessionInfo = {
			...baseSession,
			scope: { type: "full", permission: "read" },
		}

		expect(effectiveNamespaceAccess(["one", "two"], session)).toEqual([
			{ namespace: "one", permission: "read" },
			{ namespace: "two", permission: "read" },
		])
	})

	it("reads restricted access from the legacy session field", () => {
		const session = sessionInfoSchema.parse({
			user: { id: "user_test" },
			accessType: "restricted",
			containerTags: [{ containerTag: "one", permission: "write" }],
		})

		expect(session.namespaces).toEqual([
			{ namespace: "one", permission: "write" },
		])
		expect(session).not.toHaveProperty("containerTags")
	})
})
