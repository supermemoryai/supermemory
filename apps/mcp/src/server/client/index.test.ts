import { afterEach, describe, expect, it, vi } from "vitest"
import { SupermemoryClient } from "./index"

const API_URL = "https://api.example.com"

describe("SupermemoryClient.getDocuments", () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	function stubFetch() {
		const fetchMock = vi.fn().mockResolvedValue(
			Response.json({
				documents: [],
				pagination: {
					currentPage: 1,
					limit: 200,
					totalItems: 0,
					totalPages: 0,
				},
			}),
		)
		vi.stubGlobal("fetch", fetchMock)
		return fetchMock
	}

	it("cancels through a caller-provided signal", async () => {
		const fetchMock = stubFetch()
		const controller = new AbortController()

		await new SupermemoryClient("sm_test_key", "user_1", API_URL).getDocuments(
			["user_1"],
			1,
			200,
			{ signal: controller.signal },
		)

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		controller.abort()
		expect(init.signal?.aborted).toBe(true)
	})

	it("keeps the timeout when a caller-provided signal is present", async () => {
		const timeoutController = new AbortController()
		const timeoutSpy = vi
			.spyOn(AbortSignal, "timeout")
			.mockReturnValue(timeoutController.signal)
		const fetchMock = stubFetch()

		await new SupermemoryClient("sm_test_key", "user_1", API_URL).getDocuments(
			["user_1"],
			1,
			200,
			{ signal: new AbortController().signal },
		)

		expect(timeoutSpy).toHaveBeenCalledWith(30_000)

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		// Firing only the timeout leg aborts the request: a caller signal adds
		// cancellation, it does not remove the 30s bound.
		timeoutController.abort()
		expect(init.signal?.aborted).toBe(true)
	})
})
