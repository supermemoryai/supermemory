import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSupermemoryHooks } from "./hooks"
import type { HookEndArgs } from "./types"

const TEST_ARGS: HookEndArgs = {
	agent: { name: "test-agent" },
	context: {
		input: {
			messages: [{ role: "user", content: "Remember this" }],
		},
	},
	output: "I will remember that.",
}

const createDeferredFetch = () => {
	let resolveFetch: ((response: Response) => void) | undefined
	const fetchPromise = new Promise<Response>((resolve) => {
		resolveFetch = resolve
	})
	const fetchMock = vi.fn(() => fetchPromise)

	return {
		fetchMock,
		resolve: (response: Response) => resolveFetch?.(response),
	}
}

describe("VoltAgent onEnd", () => {
	let originalFetch: typeof globalThis.fetch

	beforeEach(() => {
		originalFetch = globalThis.fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.restoreAllMocks()
	})

	it("waits for conversation persistence to finish", async () => {
		const deferredFetch = createDeferredFetch()
		globalThis.fetch = deferredFetch.fetchMock as unknown as typeof fetch
		const hooks = createSupermemoryHooks("test-user", {
			apiKey: "test-api-key",
			baseUrl: "https://example.test",
			customId: "test-conversation",
		})
		let settled = false

		const onEndPromise = Promise.resolve(hooks.onEnd?.(TEST_ARGS)).finally(
			() => {
				settled = true
			},
		)

		expect(deferredFetch.fetchMock).toHaveBeenCalledOnce()
		await Promise.resolve()
		expect(settled).toBe(false)

		deferredFetch.resolve(
			new Response(
				JSON.stringify({
					id: "memory-1",
					conversationId: "test-conversation",
					status: "queued",
				}),
				{ status: 200 },
			),
		)
		await onEndPromise

		expect(settled).toBe(true)
	})

	it("waits for a failed save, logs it, and resolves without throwing", async () => {
		const deferredFetch = createDeferredFetch()
		globalThis.fetch = deferredFetch.fetchMock as unknown as typeof fetch
		vi.spyOn(console, "log").mockImplementation(() => {})
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
		const hooks = createSupermemoryHooks("test-user", {
			apiKey: "test-api-key",
			baseUrl: "https://example.test",
			customId: "test-conversation",
			verbose: true,
		})
		let settled = false

		const onEndPromise = Promise.resolve(hooks.onEnd?.(TEST_ARGS)).finally(
			() => {
				settled = true
			},
		)

		expect(deferredFetch.fetchMock).toHaveBeenCalledOnce()
		await Promise.resolve()
		expect(settled).toBe(false)

		deferredFetch.resolve(
			new Response("Server error", {
				status: 500,
				statusText: "Internal Server Error",
			}),
		)
		await expect(onEndPromise).resolves.toBeUndefined()

		expect(errorSpy).toHaveBeenCalledWith(
			"[supermemory] Error saving conversation",
			expect.stringContaining(
				"Failed to add conversation: 500 Internal Server Error. Server error",
			),
		)
	})
})
