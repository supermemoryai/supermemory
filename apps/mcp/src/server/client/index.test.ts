import { afterEach, describe, expect, it, vi } from "vitest"
import { SupermemoryClient } from "."
import type { MemoryGovernanceHooks } from "."

describe("SupermemoryClient governance hooks", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	// This is the regression test that matters: a redacting hook only proves
	// the hook ran on the path it ran on. A blocking hook fails loudly the day
	// a refactor of search()/getProfile() stops invoking it — that's what makes
	// "governance is installed" a guarantee instead of a green light on nothing.
	it("returns the blocked result from a blocking onSearch hook, not the raw API response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						results: [
							{
								id: "mem_1",
								memory: "User's SSN is 123-45-6789",
								similarity: 0.95,
							},
						],
						total: 1,
						timing: 5,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			),
		)

		const governance: MemoryGovernanceHooks = {
			onSearch: async () => ({ results: [], total: 0, timing: 0 }),
		}
		const client = new SupermemoryClient(
			"oauth-token",
			"snowcone_grande",
			"https://api.example.com",
			governance,
		)

		const result = await client.search("what is the SSN?")

		expect(result).toEqual({ results: [], total: 0, timing: 0 })
	})

	it("returns the blocked result from a blocking onProfile hook, not the raw API response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						profile: {
							static: ["User's SSN is 123-45-6789"],
							dynamic: [],
						},
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			),
		)

		const governance: MemoryGovernanceHooks = {
			onProfile: async () => ({ profile: { static: [], dynamic: [] } }),
		}
		const client = new SupermemoryClient(
			"oauth-token",
			"snowcone_grande",
			"https://api.example.com",
			governance,
		)

		const result = await client.getProfile()

		expect(result).toEqual({ profile: { static: [], dynamic: [] } })
	})
})
