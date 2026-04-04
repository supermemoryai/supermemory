import { describe, expect, test } from "bun:test"
import {
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
})

describe("attentionScores", () => {
	test("matches per-key attentionScore", () => {
		const q = unit(1, 1, 0)
		const keys = [unit(1, 0, 0), unit(0, 1, 0)]
		const scores = attentionScores(q, keys)
		expect(scores).toHaveLength(2)
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
})
