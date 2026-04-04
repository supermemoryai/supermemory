import { describe, expect, test } from "bun:test"
import {
	attentionScore,
	attentionScores,
	rankItemsByAttentionTopK,
	topKAttentionKeys,
	topKAttentionKeysMultiHead,
} from "./unlimiformer"

const unit = (a: number, b: number, c: number) => {
	const v = [a, b, c]
	const norm = Math.hypot(a, b, c)
	return v.map((x) => x / norm)
}

describe("topKAttentionKeys", () => {
	test("returns empty when k is zero or keys empty", () => {
		const q = unit(1, 0, 0)
		expect(topKAttentionKeys(q, [], 3)).toEqual([])
		expect(topKAttentionKeys(q, [unit(1, 0, 0)], 0)).toEqual([])
	})

	test("orders by dot product / cosine on unit vectors", () => {
		const q = unit(1, 0, 0)
		const k0 = unit(1, 0, 0)
		const k1 = unit(0, 1, 0)
		const k2 = unit(-1, 0, 0)
		const keys = [k1, k2, k0]

		const top = topKAttentionKeys(q, keys, 2)
		expect(top.map((t) => t.index)).toEqual([2, 0])
		expect(top[0]?.score).toBeGreaterThan(
			top[1]?.score ?? Number.NEGATIVE_INFINITY,
		)
	})

	test("caps k at number of keys", () => {
		const q = unit(1, 0, 0)
		const keys = [unit(1, 0, 0), unit(0, 1, 0)]
		const top = topKAttentionKeys(q, keys, 10)
		expect(top).toHaveLength(2)
	})

	test("skips keys whose dimension does not match the query (no throw)", () => {
		const q = unit(1, 0, 0)
		const keys = [unit(1, 0, 0), [1, 0], unit(0, 1, 0)]
		const top = topKAttentionKeys(q, keys, 5)
		expect(top.map((t) => t.index)).toEqual([0, 2])
	})

	test("returns empty when no key matches query dimension", () => {
		const q = unit(1, 0, 0)
		expect(
			topKAttentionKeys(
				q,
				[
					[1, 0],
					[0, 1],
				],
				3,
			),
		).toEqual([])
	})

	test("skips keys with NaN components without throwing", () => {
		const q = unit(1, 0, 0)
		const keys = [unit(1, 0, 0), [1, Number.NaN, 0], unit(0, 1, 0)]
		const top = topKAttentionKeys(q, keys, 5)
		expect(top.map((t) => t.index)).toEqual([0, 2])
	})
})

describe("attentionScore", () => {
	test("returns NaN instead of throwing when a vector contains NaN", () => {
		const k = unit(1, 0, 0)
		expect(attentionScore([1, Number.NaN, 0], k)).toBeNaN()
		expect(attentionScore(k, [1, Number.NaN, 0])).toBeNaN()
	})

	test("returns NaN for non-number or non-finite components", () => {
		const k = unit(1, 0, 0)
		const stringSlot = [1, "x", 0] as unknown as number[]
		expect(attentionScore(stringSlot, k)).toBeNaN()
		expect(attentionScore([Number.POSITIVE_INFINITY, 0, 0], k)).toBeNaN()
	})
})

describe("attentionScores", () => {
	test("matches per-key attentionScore", () => {
		const q = unit(1, 1, 0)
		const keys = [unit(1, 0, 0), unit(0, 1, 0)]
		const scores = attentionScores(q, keys)
		expect(scores).toHaveLength(2)
	})

	test("uses NaN when key dimension mismatches query", () => {
		const q = unit(1, 0, 0)
		const scores = attentionScores(q, [unit(1, 0, 0), [1, 0]])
		expect(scores).toHaveLength(2)
		expect(Number.isFinite(scores[0] ?? Number.NaN)).toBe(true)
		expect(scores[1]).toBeNaN()
	})
})

describe("topKAttentionKeysMultiHead", () => {
	test("runs independent top-k per query", () => {
		const keys = [unit(1, 0, 0), unit(0, 1, 0), unit(0, 0, 1)]
		const q0 = unit(1, 0, 0)
		const q1 = unit(0, 1, 0)
		const out = topKAttentionKeysMultiHead([q0, q1], keys, 1)
		expect(out[0]?.[0]?.index).toBe(0)
		expect(out[1]?.[0]?.index).toBe(1)
	})
})

describe("rankItemsByAttentionTopK", () => {
	test("maps back to original indices and skips bad embeddings", () => {
		const items = [
			{ id: "a", e: unit(1, 0, 0) },
			{ id: "b", e: null as number[] | null },
			{ id: "c", e: unit(0, 1, 0) },
		]
		const q = unit(0, 1, 0)
		const ranked = rankItemsByAttentionTopK(q, items, (x) => x.e, 2)
		expect(ranked[0]?.item.id).toBe("c")
		expect(ranked[0]?.originalIndex).toBe(2)
	})

	test("skips items whose embedding length does not match the query", () => {
		const items = [
			{ id: "wide", e: [0.1, 0.2, 0.3, 0.4] },
			{ id: "ok", e: unit(0, 1, 0) },
		]
		const q = unit(0, 1, 0)
		const ranked = rankItemsByAttentionTopK(q, items, (x) => x.e, 2)
		expect(ranked).toHaveLength(1)
		expect(ranked[0]?.item.id).toBe("ok")
	})

	test("returns empty when query embedding is non-finite", () => {
		const items = [{ id: "a", e: unit(1, 0, 0) }]
		expect(
			rankItemsByAttentionTopK([Number.NaN, 0, 0], items, (x) => x.e, 2),
		).toEqual([])
	})

	test("skips items with non-finite embeddings", () => {
		const items = [
			{ id: "bad", e: [1, Number.NaN, 0] },
			{ id: "ok", e: unit(0, 1, 0) },
		]
		const q = unit(0, 1, 0)
		const ranked = rankItemsByAttentionTopK(q, items, (x) => x.e, 2)
		expect(ranked).toHaveLength(1)
		expect(ranked[0]?.item.id).toBe("ok")
	})
})
