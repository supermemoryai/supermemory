import { describe, expect, it } from "bun:test"
import { mergeOrganizationMetadata } from "./organization-metadata"

describe("mergeOrganizationMetadata", () => {
	it("merges metadata for the expected organization", () => {
		expect(
			mergeOrganizationMetadata(
				{
					id: "org-a",
					name: "Organization A",
					metadata: { plan: "pro", isOnboarded: false },
				},
				"org-a",
				{ isOnboarded: true },
			),
		).toEqual({
			id: "org-a",
			name: "Organization A",
			metadata: { plan: "pro", isOnboarded: true },
		})
	})

	it("leaves a different current organization untouched", () => {
		const current = {
			id: "org-b",
			metadata: { isOnboarded: true },
		}

		expect(
			mergeOrganizationMetadata(current, "org-a", {
				isOnboarded: false,
			}),
		).toBe(current)
	})

	it("leaves an empty organization state untouched", () => {
		expect(
			mergeOrganizationMetadata(null, "org-a", { isOnboarded: true }),
		).toBeNull()
	})
})
