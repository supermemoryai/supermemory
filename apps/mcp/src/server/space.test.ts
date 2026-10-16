import { describe, expect, it, vi } from "vitest"
import { optionalNamespaceSchema } from "./namespace"
import {
	accessibleDefaultNamespace,
	resolveNamespace,
	spaceStateName,
} from "./space"

describe("space application state", () => {
	it("keys active state by organization and user without collisions", () => {
		expect(
			spaceStateName({
				organizationId: "org:one",
				userId: "user:two",
			}),
		).not.toBe(
			spaceStateName({
				organizationId: "org",
				userId: "one:user:two",
			}),
		)
	})

	it("uses an explicit tool argument without reading active state", async () => {
		const getActive = vi.fn().mockResolvedValue("active")

		await expect(resolveNamespace("explicit", getActive)).resolves.toBe(
			"explicit",
		)
		expect(getActive).not.toHaveBeenCalled()
	})

	it("falls back to durable active state and then the client default", async () => {
		await expect(
			resolveNamespace(undefined, vi.fn().mockResolvedValue("active")),
		).resolves.toBe("active")
		await expect(
			resolveNamespace(undefined, vi.fn().mockResolvedValue(undefined)),
		).resolves.toBeUndefined()
	})

	it("tells the model how to route explicit space requests", () => {
		expect(optionalNamespaceSchema.description).toContain(
			"If the user names a space",
		)
		expect(optionalNamespaceSchema.description).toContain("list_spaces")
		expect(optionalNamespaceSchema.description).toContain("active space")
	})

	it("keeps the default space unless the caller is limited to other spaces", () => {
		const user = { id: "user" }
		expect(accessibleDefaultNamespace({ user })).toBe("sm_project_default")
		expect(
			accessibleDefaultNamespace({
				user,
				scope: { type: "scoped", tags: ["work", "sm_project_default"] },
			}),
		).toBe("sm_project_default")
		expect(
			accessibleDefaultNamespace({
				user,
				scope: { type: "scoped", tag: "work", tags: ["work", "notes"] },
			}),
		).toBe("work")
		expect(
			accessibleDefaultNamespace({
				user,
				accessType: "restricted",
				namespaces: [{ namespace: "team", permission: "read" }],
			}),
		).toBe("team")
		expect(
			accessibleDefaultNamespace({
				user,
				accessType: "restricted",
				namespaces: [
					{ namespace: "team", permission: "read" },
					{ namespace: "notes", permission: "write" },
				],
				scope: { type: "scoped", tags: ["notes"] },
			}),
		).toBe("notes")
		expect(
			accessibleDefaultNamespace({
				user,
				accessType: "restricted",
				namespaces: [],
			}),
		).toBe("sm_project_default")
	})
})
