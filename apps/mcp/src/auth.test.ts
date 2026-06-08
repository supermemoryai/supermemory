import { describe, expect, it } from "vitest"
import { isApiKey } from "./auth"

describe("isApiKey", () => {
	it("returns true for keys with the sm_ prefix and length > 3", () => {
		expect(isApiKey("sm_valid_key")).toBe(true)
		expect(isApiKey("sm_123")).toBe(true)
	})

	it("returns false for the bare prefix or missing prefix", () => {
		expect(isApiKey("sm_")).toBe(false)
		expect(isApiKey("")).toBe(false)
		expect(isApiKey("oauth_token")).toBe(false)
	})
})
