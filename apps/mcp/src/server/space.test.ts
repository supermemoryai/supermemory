import { describe, expect, it } from "vitest"
import type { SessionInfo } from "../shared/types"
import { DEFAULT_NAMESPACE } from "./client"
import {
	accessibleDefaultNamespace,
	allowedNamespaces,
	usableActiveNamespace,
} from "./space"

const full: SessionInfo = {
	user: { id: "user_test" },
	accessType: "full",
	scope: { type: "full", permission: "write" },
}

const scoped = (
	tags: string[],
	permission: "read" | "write" = "write",
): SessionInfo => ({ ...full, scope: { type: "scoped", permission, tags } })

const restricted = (
	namespaces: NonNullable<SessionInfo["namespaces"]>,
): SessionInfo => ({ ...full, accessType: "restricted", namespaces })

describe("allowedNamespaces", () => {
	it("has no allowlist for full access", () => {
		expect(allowedNamespaces(full)).toBeNull()
	})

	it("uses the tags a scoped connection was granted", () => {
		expect(allowedNamespaces(scoped(["work", "docs"]))).toEqual([
			"work",
			"docs",
		])
	})

	it("uses the single tag of an older scoped grant", () => {
		const session: SessionInfo = {
			...full,
			scope: { type: "scoped", permission: "write", tag: "work" },
		}
		expect(allowedNamespaces(session)).toEqual(["work"])
	})

	it("uses the spaces a restricted member can reach", () => {
		const session = restricted([
			{ namespace: "one", permission: "read" },
			{ namespace: "two", permission: "write" },
		])
		expect(allowedNamespaces(session)).toEqual(["one", "two"])
	})

	it("intersects a scoped grant with a restricted member's spaces", () => {
		const session: SessionInfo = {
			...restricted([
				{ namespace: "one", permission: "write" },
				{ namespace: "two", permission: "write" },
			]),
			scope: { type: "scoped", permission: "write", tags: ["two", "three"] },
		}
		expect(allowedNamespaces(session)).toEqual(["two"])
	})
})

describe("usableActiveNamespace", () => {
	it("returns nothing when no space is stored", () => {
		expect(usableActiveNamespace(undefined, null)).toBeUndefined()
		expect(usableActiveNamespace(undefined, ["work"])).toBeUndefined()
	})

	it("keeps the stored space when there is no allowlist", () => {
		expect(usableActiveNamespace("personal", null)).toBe("personal")
	})

	it("keeps the stored space when it is allowed", () => {
		expect(usableActiveNamespace("work", ["work", "docs"])).toBe("work")
	})

	it("drops a stored space outside the allowlist", () => {
		expect(usableActiveNamespace("personal", ["work"])).toBeUndefined()
	})

	it("drops every stored space when the allowlist is empty", () => {
		expect(usableActiveNamespace("work", [])).toBeUndefined()
	})
})

describe("accessibleDefaultNamespace", () => {
	it("uses the default space with full access", () => {
		expect(accessibleDefaultNamespace(full)).toBe(DEFAULT_NAMESPACE)
	})

	it("uses the first granted space for a scoped connection", () => {
		expect(accessibleDefaultNamespace(scoped(["work", "docs"]))).toBe("work")
	})

	it("prefers a space the member can write to", () => {
		const session = restricted([
			{ namespace: "one", permission: "read" },
			{ namespace: "two", permission: "write" },
		])
		expect(accessibleDefaultNamespace(session)).toBe("two")
	})

	it("keeps the default space when it is allowed and writable", () => {
		expect(
			accessibleDefaultNamespace(scoped(["work", DEFAULT_NAMESPACE])),
		).toBe(DEFAULT_NAMESPACE)
	})
})
