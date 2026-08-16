import { describe, expect, it } from "bun:test"
import { createRecallRequestFreshnessGuard } from "./recall-request-freshness"

function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (reason: unknown) => void
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise
		reject = rejectPromise
	})
	return { promise, reject, resolve }
}

describe("recall request freshness", () => {
	it("lets fast B commit and discards slow A", async () => {
		const guard = createRecallRequestFreshnessGuard<{ id: string }>()
		const input = { id: "composer" }
		let state = { input, query: "prompt A", url: "/chat" }
		const commits: string[] = []
		const slowA = deferred<string>()
		const fastB = deferred<string>()

		const requestA = guard.begin(state)
		const settleA = slowA.promise.then((value) => {
			if (guard.isCurrent(requestA, state)) commits.push(value)
		})

		state = { ...state, query: "prompt B" }
		guard.invalidate()
		const requestB = guard.begin(state)
		const settleB = fastB.promise.then((value) => {
			if (guard.isCurrent(requestB, state)) commits.push(value)
		})

		fastB.resolve("memory B")
		await settleB
		slowA.resolve("memory A")
		await settleA

		expect(commits).toEqual(["memory B"])
	})

	it("keeps a T3 edit-gap from auto-sending stale memory", async () => {
		const guard = createRecallRequestFreshnessGuard<{
			dataset: { supermemories?: string }
		}>()
		const input: { dataset: { supermemories?: string } } = { dataset: {} }
		let state = { input, query: "prompt A", url: "/chat" }
		const result = deferred<string>()
		const request = guard.begin(state)
		const settle = result.promise.then((value) => {
			if (guard.isCurrent(request, state)) {
				input.dataset.supermemories = value
			}
		})

		state = { ...state, query: "prompt B" }
		guard.invalidate()
		result.resolve("stale memory A")
		await settle
		const promptSent = `${state.query}${input.dataset.supermemories || ""}`

		expect(promptSent).toBe("prompt B")
	})

	it("keeps an edit invalidated even when the user restores the same text", async () => {
		const guard = createRecallRequestFreshnessGuard<{ dataset: string }>()
		const input = { dataset: "" }
		let state = { input, query: "prompt A", url: "/chat" }
		const result = deferred<string>()
		const request = guard.begin(state)
		const settle = result.promise.then((value) => {
			if (guard.isCurrent(request, state)) input.dataset = value
		})

		state = { ...state, query: "temporary edit" }
		guard.invalidate()
		state = { ...state, query: "prompt A" }
		result.resolve("stale memory A")
		await settle

		expect(input.dataset).toBe("")
	})

	it("rejects stale errors, route changes, and replaced composers", async () => {
		const guard = createRecallRequestFreshnessGuard<{ id: string }>()
		const oldInput = { id: "old" }
		let state = { input: oldInput, query: "prompt", url: "/chat/one" }
		const failure = deferred<never>()
		const errors: unknown[] = []
		const request = guard.begin(state)
		const settle = failure.promise.catch((error) => {
			if (guard.isCurrent(request, state)) errors.push(error)
		})

		state = {
			input: { id: "new" },
			query: "prompt",
			url: "/chat/two",
		}
		guard.invalidate()
		failure.reject(new Error("stale failure"))
		await settle

		expect(errors).toEqual([])
	})
})
