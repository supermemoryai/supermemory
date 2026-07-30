import { describe, expect, it, vi } from "vitest"
import { optionalContainerTagSchema } from "./container-tag"
import { resolveContainerTag, spaceStateName } from "./space"

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

		await expect(resolveContainerTag("explicit", getActive)).resolves.toBe(
			"explicit",
		)
		expect(getActive).not.toHaveBeenCalled()
	})

	it("falls back to durable active state and then the client default", async () => {
		await expect(
			resolveContainerTag(undefined, vi.fn().mockResolvedValue("active")),
		).resolves.toBe("active")
		await expect(
			resolveContainerTag(undefined, vi.fn().mockResolvedValue(undefined)),
		).resolves.toBeUndefined()
	})

	it("tells the model how to route explicit space requests", () => {
		expect(optionalContainerTagSchema.description).toContain(
			"If the user names a space",
		)
		expect(optionalContainerTagSchema.description).toContain("listSpaces")
		expect(optionalContainerTagSchema.description).toContain("active space")
	})
})
