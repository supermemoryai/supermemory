import { describe, expect, it } from "vitest"
import type { SessionInfo } from "../../shared/types"
import {
	assertWriteAccess,
	ContainerTagAccessError,
	effectiveContainerTagAccess,
} from "./rbac"

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
})

describe("assertWriteAccess", () => {
	it("does not throw when the session has write access to the tag", () => {
		expect(() => assertWriteAccess("one", baseSession)).not.toThrow()
	})

	it("throws ContainerTagAccessError for a restricted read-only tag", () => {
		const session: SessionInfo = {
			...baseSession,
			accessType: "restricted",
			containerTags: [{ containerTag: "one", permission: "read" }],
		}

		expect(() => assertWriteAccess("one", session)).toThrow(
			ContainerTagAccessError,
		)
	})

	it("throws for a tag outside a scoped session's assigned tags", () => {
		const session: SessionInfo = {
			...baseSession,
			scope: { type: "scoped", permission: "write", tags: ["allowed"] },
		}

		expect(() => assertWriteAccess("other", session)).toThrow(
			ContainerTagAccessError,
		)
	})

	it("throws for a read-only scoped session even on its own tag", () => {
		const session: SessionInfo = {
			...baseSession,
			scope: { type: "scoped", permission: "read", tags: ["one"] },
		}

		expect(() => assertWriteAccess("one", session)).toThrow(
			ContainerTagAccessError,
		)
	})

	it("does not throw for a restricted member with explicit write access", () => {
		const session: SessionInfo = {
			...baseSession,
			accessType: "restricted",
			containerTags: [{ containerTag: "one", permission: "write" }],
		}

		expect(() => assertWriteAccess("one", session)).not.toThrow()
	})
})
