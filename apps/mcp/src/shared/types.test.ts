import { describe, expect, it } from "vitest"
import { sessionInfoSchema } from "./types"

describe("sessionInfoSchema", () => {
	it("accepts a session with accessType", () => {
		const parsed = sessionInfoSchema.safeParse({
			user: { id: "user_test" },
			accessType: "full",
		})
		expect(parsed.success).toBe(true)
	})

	it("rejects sessions without accessType (fail closed)", () => {
		const parsed = sessionInfoSchema.safeParse({
			user: { id: "user_test" },
		})
		expect(parsed.success).toBe(false)
	})
})
