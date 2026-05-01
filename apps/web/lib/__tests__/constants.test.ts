import { describe, it, expect, beforeEach, vi } from "vitest"
import { PENDING_CONNECT_URL_KEY, consumePendingConnectUrl } from "../constants"

// Minimal sessionStorage mock for Node environment
function createMockSessionStorage() {
	const store = new Map<string, string>()
	return {
		getItem: vi.fn((key: string) => store.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => store.set(key, value)),
		removeItem: vi.fn((key: string) => store.delete(key)),
		clear: vi.fn(() => store.clear()),
		get length() {
			return store.size
		},
		key: vi.fn((_index: number) => null),
		_store: store,
	}
}

describe("consumePendingConnectUrl", () => {
	let mockStorage: ReturnType<typeof createMockSessionStorage>

	beforeEach(() => {
		mockStorage = createMockSessionStorage()
		// @ts-expect-error -- assigning mock sessionStorage in Node
		globalThis.sessionStorage = mockStorage
	})

	it("returns null when no pending URL is stored", () => {
		expect(consumePendingConnectUrl()).toBeNull()
	})

	it("returns the relative path + query when a full URL is stored", () => {
		mockStorage._store.set(
			PENDING_CONNECT_URL_KEY,
			"https://app.supermemory.ai/auth/connect?callback=http%3A%2F%2Flocalhost%3A3000%2Fcallback&client=opencode",
		)

		const result = consumePendingConnectUrl()
		expect(result).toBe(
			"/auth/connect?callback=http%3A%2F%2Flocalhost%3A3000%2Fcallback&client=opencode",
		)
	})

	it("includes the hash fragment if present", () => {
		mockStorage._store.set(
			PENDING_CONNECT_URL_KEY,
			"https://app.supermemory.ai/auth/connect?client=cursor#section",
		)

		const result = consumePendingConnectUrl()
		expect(result).toBe("/auth/connect?client=cursor#section")
	})

	it("removes the stored key after consumption", () => {
		mockStorage._store.set(
			PENDING_CONNECT_URL_KEY,
			"https://app.supermemory.ai/auth/connect?callback=http%3A%2F%2Flocalhost%3A3000%2Fcallback",
		)

		consumePendingConnectUrl()
		expect(mockStorage.removeItem).toHaveBeenCalledWith(PENDING_CONNECT_URL_KEY)
		expect(mockStorage._store.has(PENDING_CONNECT_URL_KEY)).toBe(false)
	})

	it("returns null and logs a warning when sessionStorage throws", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
		// @ts-expect-error -- assigning broken sessionStorage
		globalThis.sessionStorage = {
			getItem: () => {
				throw new Error("SecurityError")
			},
			setItem: () => {},
			removeItem: () => {},
		}

		const result = consumePendingConnectUrl()
		expect(result).toBeNull()
		expect(warnSpy).toHaveBeenCalledWith(
			"Failed to access sessionStorage for pending connect URL",
			expect.any(Error),
		)
		warnSpy.mockRestore()
	})

	it("returns null when the stored value is not a valid URL", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
		mockStorage._store.set(PENDING_CONNECT_URL_KEY, "not-a-url")

		const result = consumePendingConnectUrl()
		// `new URL("not-a-url")` throws, so it should be caught
		expect(result).toBeNull()
		expect(warnSpy).toHaveBeenCalled()
		warnSpy.mockRestore()
	})

	it("returns only pathname when URL has no query or hash", () => {
		mockStorage._store.set(
			PENDING_CONNECT_URL_KEY,
			"https://app.supermemory.ai/auth/connect",
		)

		const result = consumePendingConnectUrl()
		expect(result).toBe("/auth/connect")
	})
})
