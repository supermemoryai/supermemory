import { describe, expect, test } from "bun:test"
import {
	createDeferredPrefillOwner,
	createSearchInputAdapter,
	SEARCH_QUERY_DEBOUNCE_MS,
} from "../src/deferred-prefill"

function createDeferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (reason?: unknown) => void
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise
		reject = rejectPromise
	})

	return { promise, reject, resolve }
}

function createManualScheduler() {
	const tasks: Array<{
		active: boolean
		callback: () => void
		delayMs: number
	}> = []

	return {
		schedule(callback: () => void, delayMs: number) {
			const task = { active: true, callback, delayMs }
			tasks.push(task)
			return () => {
				task.active = false
			}
		},
		flush() {
			for (const task of tasks) {
				if (task.active) {
					task.active = false
					task.callback()
				}
			}
		},
		get activeCount() {
			return tasks.filter((task) => task.active).length
		},
		get delays() {
			return tasks.map((task) => task.delayMs)
		},
	}
}

describe("createDeferredPrefillOwner", () => {
	test("applies an untouched prefill", async () => {
		let value = ""
		const deferred = createDeferred<string>()
		const owner = createDeferredPrefillOwner((nextValue) => {
			value = nextValue
		})
		const request = owner.start(() => deferred.promise)

		deferred.resolve("selected text")
		await request.completion

		expect(value).toBe("selected text")
	})

	test("does not overwrite text entered while the prefill is pending", async () => {
		let value = ""
		const deferred = createDeferred<string>()
		const owner = createDeferredPrefillOwner((nextValue) => {
			value = nextValue
		})
		const request = owner.start(() => deferred.promise)

		owner.updateFromUser("typed text")
		deferred.resolve("selected text")
		await request.completion

		expect(value).toBe("typed text")
	})

	test("does not restore a prefill after typed text is cleared", async () => {
		let value = ""
		const deferred = createDeferred<string>()
		const owner = createDeferredPrefillOwner((nextValue) => {
			value = nextValue
		})
		const request = owner.start(() => deferred.promise)

		owner.updateFromUser("typed text")
		owner.updateFromUser("")
		deferred.resolve("selected text")
		await request.completion

		expect(value).toBe("")
	})

	test("keeps the current value when the prefill rejects", async () => {
		let value = "current text"
		const deferred = createDeferred<string>()
		const owner = createDeferredPrefillOwner((nextValue) => {
			value = nextValue
		})
		const request = owner.start(() => deferred.promise)

		deferred.reject(new Error("selection unavailable"))
		await request.completion

		expect(value).toBe("current text")
	})

	test("does not apply a prefill after its consumer unmounts", async () => {
		let value = ""
		const deferred = createDeferred<string>()
		const owner = createDeferredPrefillOwner((nextValue) => {
			value = nextValue
		})
		const request = owner.start(() => deferred.promise)

		request.cancel()
		deferred.resolve("selected text")
		await request.completion

		expect(value).toBe("")
	})

	test("cancels only the current request", async () => {
		let value = ""
		const firstDeferred = createDeferred<string>()
		const secondDeferred = createDeferred<string>()
		const owner = createDeferredPrefillOwner((nextValue) => {
			value = nextValue
		})
		const firstRequest = owner.start(() => firstDeferred.promise)

		firstRequest.cancel()
		const secondRequest = owner.start(() => secondDeferred.promise)
		firstDeferred.resolve("stale selected text")
		secondDeferred.resolve("selected text")
		await Promise.all([firstRequest.completion, secondRequest.completion])

		expect(value).toBe("selected text")
	})
})

describe("createSearchInputAdapter", () => {
	test("claims input ownership before a deferred prefill can resolve", async () => {
		let searchText = ""
		let searchQuery = ""
		const scheduler = createManualScheduler()
		const selectedText = createDeferred<string>()
		const adapter = createSearchInputAdapter(
			(value) => {
				searchText = value
			},
			(value) => {
				searchQuery = value
			},
			scheduler.schedule,
		)
		const request = adapter.startPrefill(() => selectedText.promise)
		const listProps = adapter.getListProps(searchText)

		expect(listProps.throttle).toBe(false)
		listProps.onSearchTextChange("typed text")
		expect(searchText).toBe("typed text")
		expect(searchQuery).toBe("")

		selectedText.resolve("selected text")
		await request.completion
		expect(searchText).toBe("typed text")

		scheduler.flush()
		expect(searchQuery).toBe("typed text")
		expect(scheduler.delays).toEqual([SEARCH_QUERY_DEBOUNCE_MS])
	})

	test("coalesces rapid input into one search query", () => {
		const searchQueries: string[] = []
		const scheduler = createManualScheduler()
		const adapter = createSearchInputAdapter(
			() => {},
			(value) => searchQueries.push(value),
			scheduler.schedule,
		)
		const { onSearchTextChange } = adapter.getListProps("")

		onSearchTextChange("t")
		onSearchTextChange("ty")
		onSearchTextChange("typed")
		expect(scheduler.activeCount).toBe(1)

		scheduler.flush()
		expect(searchQueries).toEqual(["typed"])
	})

	test("cancels a pending search query on unmount", () => {
		const searchQueries: string[] = []
		const scheduler = createManualScheduler()
		const adapter = createSearchInputAdapter(
			() => {},
			(value) => searchQueries.push(value),
			scheduler.schedule,
		)

		adapter.getListProps("").onSearchTextChange("typed text")
		adapter.cancelPendingQuery()
		scheduler.flush()

		expect(searchQueries).toEqual([])
	})
})
