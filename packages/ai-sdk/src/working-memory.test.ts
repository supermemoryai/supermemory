import { describe, expect, it, vi } from "vitest"
import { createWorkingMemory, WorkingMemory } from "./working-memory"

describe("WorkingMemory — V1 (LRU, TTL, dedup, invalidate)", () => {
	it("cache hit on second get within TTL", () => {
		const wm = new WorkingMemory({ ttlMs: 60_000, maxEntries: 100 })
		wm.set("preferences", [{ id: 1 }])
		expect(wm.get("preferences")).toEqual([{ id: 1 }])
		expect(wm.get("preferences")).toEqual([{ id: 1 }])
		expect(wm.stats().hits).toBe(2)
	})

	it("cache miss on unknown query", () => {
		const wm = new WorkingMemory({ ttlMs: 60_000 })
		expect(wm.get("unknown")).toBeUndefined()
		expect(wm.stats().misses).toBe(1)
	})

	it("TTL expiry triggers miss (fake timers)", async () => {
		vi.useFakeTimers()
		const wm = new WorkingMemory({ ttlMs: 50 })
		wm.set("q", [{ id: 1 }])
		expect(wm.get("q")).toEqual([{ id: 1 }])
		vi.advanceTimersByTime(80)
		expect(wm.get("q")).toBeUndefined()
		vi.useRealTimers()
	})

	it("promise dedup: 20 concurrent search share one fetch", async () => {
		const wm = new WorkingMemory<string>({ ttlMs: 60_000 })
		let calls = 0
		const fetchFn = async () => {
			calls++
			await new Promise((r) => setTimeout(r, 20))
			return ["result"]
		}
		const ps = Array.from({ length: 20 }, () =>
			wm.search("preferences", fetchFn),
		)
		const rs = await Promise.all(ps)
		expect(calls).toBe(1)
		expect(rs.every((r) => r[0] === "result")).toBe(true)
		// Subsequent get is a cache hit, no fetch
		expect(wm.get("preferences")).toEqual(["result"])
	})

	it("LRU eviction drops oldest", () => {
		const wm = new WorkingMemory({ ttlMs: 60_000, maxEntries: 3 })
		wm.set("1", [{ id: 1 }])
		wm.set("2", [{ id: 2 }])
		wm.set("3", [{ id: 3 }])
		wm.get("1") // touch 1 -> order 2,3,1
		wm.set("4", [{ id: 4 }]) // evict 2
		expect(wm.has("2")).toBe(false)
		expect(wm.has("1")).toBe(true)
		expect(wm.has("3")).toBe(true)
		expect(wm.has("4")).toBe(true)
	})

	it("invalidate single vs clear all", () => {
		const wm = new WorkingMemory({ ttlMs: 60_000 })
		wm.set("x", [{ id: 1 }])
		wm.set("y", [{ id: 2 }])
		wm.invalidate("x")
		expect(wm.has("x")).toBe(false)
		expect(wm.has("y")).toBe(true)
		wm.invalidate()
		expect(wm.has("y")).toBe(false)
		expect(wm.stats().size).toBe(0)
	})

	it("stats tracks hits/misses/size", () => {
		const wm = new WorkingMemory({ ttlMs: 60_000 })
		wm.set("a", [{ id: 1 }])
		wm.get("a") // hit
		wm.get("missing") // miss
		const s = wm.stats()
		expect(s.hits).toBe(1)
		expect(s.misses).toBe(1)
		expect(s.size).toBe(1)
	})

	it("cache disabled: without wrapper every call hits fetch", async () => {
		const wm = new WorkingMemory({ ttlMs: 60_000 })
		let calls = 0
		const fetchFn = async () => {
			calls++
			return [{ id: calls }]
		}
		// Without using wm.search, direct fetch always calls
		await fetchFn()
		await fetchFn()
		expect(calls).toBe(2)
		// With wm.search, second is cached
		calls = 0
		await wm.search("q", fetchFn)
		await wm.search("q", fetchFn)
		expect(calls).toBe(1)
	})
})

describe("createWorkingMemory — explicit decorator", () => {
	it("wraps searchMemories without mutating return shape", async () => {
		let calls = 0
		const fakeTool = {
			searchMemories: {
				description: "search",
				inputSchema: {} as any,
				execute: async (input: any) => {
					calls++
					return {
						success: true,
						results: [{ q: input.informationToGet }],
						count: 1,
					}
				},
			},
			addMemory: {
				description: "add",
				inputSchema: {} as any,
				execute: async () => ({ success: true, memory: {} }),
			},
		} as any

		const wrapped = createWorkingMemory(fakeTool, { ttlMs: 60_000 })

		const r1: any = await (wrapped.searchMemories as any).execute({
			informationToGet: "preferences",
			limit: 10,
		})
		expect(r1.success).toBe(true)
		expect(r1.results).toEqual([{ q: "preferences" }])
		expect(r1._source).toBeUndefined() // not mutating shape
		expect(calls).toBe(1)

		const r2: any = await (wrapped.searchMemories as any).execute({
			informationToGet: "preferences",
			limit: 10,
		})
		expect(calls).toBe(1) // cache hit, no second fetch
		expect(r2.results).toEqual([{ q: "preferences" }])

		// Original tool still hits every time (no silent mutation)
		const orig: any = await fakeTool.searchMemories.execute({
			informationToGet: "preferences",
			limit: 10,
		})
		expect(calls).toBe(2)
		expect(wrapped.workingMemory.stats().hits).toBe(1)
	})

	it("does not auto-populate on addMemory (V1 non-goal)", async () => {
		const fakeTool = {
			searchMemories: {
				execute: async () => ({ success: true, results: [], count: 0 }),
			},
			addMemory: {
				execute: async () => ({ success: true, memory: { id: "m1" } }),
			},
		} as any
		const wrapped = createWorkingMemory(fakeTool)
		await (wrapped.addMemory as any).execute({ memory: "hello" })
		expect(wrapped.workingMemory.stats().size).toBe(0)
	})
})
