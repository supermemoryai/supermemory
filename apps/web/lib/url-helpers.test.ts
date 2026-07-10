import { afterEach, describe, expect, it } from "bun:test"
import { getBackendUrl } from "./url-helpers"

const originalBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

afterEach(() => {
	if (originalBackendUrl === undefined) {
		delete process.env.NEXT_PUBLIC_BACKEND_URL
	} else {
		process.env.NEXT_PUBLIC_BACKEND_URL = originalBackendUrl
	}
})

describe("getBackendUrl", () => {
	it("falls back to the hosted API when no backend URL is configured", () => {
		delete process.env.NEXT_PUBLIC_BACKEND_URL

		expect(getBackendUrl()).toBe("https://api.supermemory.ai")
	})

	it("uses the configured backend URL", () => {
		process.env.NEXT_PUBLIC_BACKEND_URL = "http://localhost:8787"

		expect(getBackendUrl()).toBe("http://localhost:8787")
	})

	it("removes trailing slashes", () => {
		process.env.NEXT_PUBLIC_BACKEND_URL = "http://localhost:8787///"

		expect(getBackendUrl()).toBe("http://localhost:8787")
	})
})
