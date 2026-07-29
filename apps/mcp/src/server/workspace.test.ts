import { describe, expect, it, vi } from "vitest"
import { resolveContainerTag, workspaceStateName } from "./workspace"

describe("workspace application state", () => {
	it("keys active state by organization and user without collisions", () => {
		expect(
			workspaceStateName({
				organizationId: "org:one",
				userId: "user:two",
			}),
		).not.toBe(
			workspaceStateName({
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
})
