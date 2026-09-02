import { beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
	searchMemories: vi.fn(),
	getProfile: vi.fn(),
}))

vi.mock("supermemory", () => ({
	default: class {
		search = { memories: sdk.searchMemories }
		profile = sdk.getProfile
	},
}))

import { SupermemoryClient } from "."

describe("SupermemoryClient search scope", () => {
	beforeEach(() => {
		sdk.searchMemories.mockReset().mockResolvedValue({
			results: [],
			total: 0,
			timing: 1,
		})
		sdk.getProfile.mockReset()
	})

	it("omits containerTag when no search scope is selected", async () => {
		const client = new SupermemoryClient("token")

		await client.search("remember me")

		expect(sdk.searchMemories).toHaveBeenCalledOnce()
		expect(sdk.searchMemories.mock.calls[0]?.[0]).not.toHaveProperty(
			"containerTag",
		)
	})

	it("includes containerTag when a search scope is selected", async () => {
		const client = new SupermemoryClient("token", "readable-space")

		await client.search("remember me")

		expect(sdk.searchMemories.mock.calls[0]?.[0]).toMatchObject({
			containerTag: "readable-space",
		})
	})

	it("does not request a profile without a concrete search scope", async () => {
		const client = new SupermemoryClient("token")

		await expect(client.getProfile("remember me")).resolves.toEqual({
			profile: { static: [], dynamic: [] },
		})
		expect(sdk.getProfile).not.toHaveBeenCalled()
	})
})
