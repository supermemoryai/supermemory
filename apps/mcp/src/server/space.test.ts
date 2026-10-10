import { describe, expect, it, vi } from "vitest"
import { optionalNamespaceSchema } from "./namespace"
import { resolveNamespace, spaceStateName } from "./space"

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
})
