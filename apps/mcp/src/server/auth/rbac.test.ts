import { describe, expect, it } from "vitest"
import type { SessionInfo } from "../../shared/types"
import { effectiveContainerTagAccess } from "./rbac"

const baseSession: SessionInfo = {
	user: { id: "user_test" },
	accessType: "full",
	scope: { type: "full", permission: "write" },
}

describe("effectiveContainerTagAccess", () => {
	it("marks every visible tag writable for full access", () => {
		expect(effectiveContainerTagAccess(["one", "two"], baseSession)).toEqual([
			{ containerTag: "one", permission: "write" },
			{ containerTag: "two", permission: "write" },
		])
	})

	it("preserves restricted member permissions", () => {
		const session: SessionInfo = {
			...baseSession,
			accessType: "restricted",
			containerTags: [
				{ containerTag: "one", permission: "read" },
				{ containerTag: "two", permission: "write" },
			],
		}

		expect(effectiveContainerTagAccess(["one", "two"], session)).toEqual([
			{ containerTag: "one", permission: "read" },
			{ containerTag: "two", permission: "write" },
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

		expect(effectiveContainerTagAccess(["one"], session)).toEqual([
			{ containerTag: "one", permission: "read" },
		])
	})

	it("grants a scoped write key write on its listed tags only", () => {
		const session: SessionInfo = {
			...baseSession,
			scope: {
				type: "scoped",
				permission: "write",
				tags: ["one"],
			},
		}

		expect(effectiveContainerTagAccess(["one", "two"], session)).toEqual([
			{ containerTag: "one", permission: "write" },
			{ containerTag: "two", permission: "read" },
		])
	})

	it("denies everything for a scoped session with an empty tag set", () => {
		const emptyTagsSession: SessionInfo = {
			...baseSession,
			scope: { type: "scoped", permission: "write", tags: [] },
		}
		const missingTagSession: SessionInfo = {
			...baseSession,
			scope: { type: "scoped", permission: "write" },
		}

		expect(effectiveContainerTagAccess(["one", "two"], emptyTagsSession)).toEqual(
			[],
		)
		expect(effectiveContainerTagAccess(["one", "two"], missingTagSession)).toEqual(
			[],
		)
	})
})
