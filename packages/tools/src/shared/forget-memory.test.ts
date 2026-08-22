import { afterEach, describe, expect, it, vi } from "vitest"
import { forgetMemoryRequest } from "./forget-memory"

const originalFetch = globalThis.fetch

afterEach(() => {
	globalThis.fetch = originalFetch
	vi.restoreAllMocks()
})

describe("forgetMemoryRequest signal composition", () => {
	it("aborts via the caller's signal even though the 30s timeout is also armed", async () => {
		// Simulate a server that never answers, honoring the signal like real
		// fetch: rejection on abort proves the composed signal is wired
		// through to the request.
		const fetchMock = vi.fn().mockImplementation(
			(_url: unknown, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					const signal = init?.signal as AbortSignal | undefined
					signal?.addEventListener("abort", () => {
						reject(new Error("aborted"))
					})
				}),
		)
		globalThis.fetch = fetchMock as unknown as typeof fetch

		const controller = new AbortController()
		const promise = forgetMemoryRequest(
			"sm_key",
			{ containerTag: "c" },
			"https://api.example.com",
			{
				signal: controller.signal,
			},
		)

		controller.abort()
		await expect(promise).rejects.toThrow()
		expect(fetchMock.mock.calls.length).toBe(1)
	})

	it("applies the 30s deadline when no caller signal is provided", async () => {
		const fetchMock = vi.fn().mockImplementation((_url, init) => {
			const signal = (init as RequestInit).signal as AbortSignal
			// The timeout must be armed even without a caller signal.
			expect(signal).toBeTruthy()
			return Promise.resolve(new Response(null, { status: 200 }))
		})
		globalThis.fetch = fetchMock as unknown as typeof fetch

		await expect(
			forgetMemoryRequest(
				"sm_key",
				{ containerTag: "c" },
				"https://api.example.com",
			),
		).resolves.toBeUndefined()
	})
})
