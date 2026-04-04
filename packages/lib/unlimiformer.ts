/**
 * Unlimiformer-style kNN retrieval (Bertsch et al., 2023).
 *
 * @see https://arxiv.org/abs/2305.01625 — cross-attention is approximated by retrieving
 * the top-k keys under dot-product scores. In this codebase, embeddings are treated as
 * key/query vectors; for L2-normalized vectors, dot product equals cosine similarity,
 * matching the ranking used elsewhere in `@repo/lib/similarity`.
 */

import { cosineSimilarity } from "./similarity"

/** True when every entry is a finite number (empty arrays allowed). */
const isFiniteEmbeddingVector = (v: number[]): boolean =>
	v.every((x) => typeof x === "number" && Number.isFinite(x))

export type AttentionTopK = {
	index: number
	score: number
}

/**
 * Dot-product attention score between one query vector and one key vector.
 * For normalized embeddings this matches cosine similarity.
 *
 * Returns `NaN` when `query` and `key` have different lengths (e.g. mixed embedding
 * models), or when either vector contains non-finite values (`NaN`, `±Infinity`), so
 * callers avoid throwing from `cosineSimilarity`.
 */
export const attentionScore = (query: number[], key: number[]): number => {
	if (query.length !== key.length) {
		return Number.NaN
	}
	if (!isFiniteEmbeddingVector(query) || !isFiniteEmbeddingVector(key)) {
		return Number.NaN
	}
	return cosineSimilarity(query, key)
}

/**
 * Attention scores for `query` against every row in `keys`, aligned by index.
 * Entries are `NaN` when a key length does not match the query, or when either vector
 * has non-finite components.
 */
export const attentionScores = (query: number[], keys: number[][]): number[] =>
	keys.map((key) => attentionScore(query, key))

/**
 * Retrieve the top-k keys by attention score (Unlimiformer's kNN over key index).
 * Results are sorted by descending score.
 */
export const topKAttentionKeys = (
	query: number[],
	keys: number[][],
	k: number,
): AttentionTopK[] => {
	if (k <= 0 || keys.length === 0) {
		return []
	}

	const scored: AttentionTopK[] = keys.flatMap((key, index) => {
		const score = attentionScore(query, key)
		if (!Number.isFinite(score)) {
			return []
		}
		return [{ index, score }]
	})

	if (scored.length === 0) {
		return []
	}

	const effectiveK = Math.min(k, scored.length)
	scored.sort((a, b) => b.score - a.score)
	return scored.slice(0, effectiveK)
}

/**
 * Per-head top-k retrieval: each query vector gets its own top-k over the same key set,
 * analogous to multi-head cross-attention with separate query projections.
 */
export const topKAttentionKeysMultiHead = (
	queries: number[][],
	keys: number[][],
	k: number,
): AttentionTopK[][] => queries.map((q) => topKAttentionKeys(q, keys, k))

export type RankedItem<T> = {
	item: T
	originalIndex: number
	score: number
}

/**
 * Rank arbitrary items that carry embeddings, returning the top-k by attention score.
 * Items with missing or empty embeddings, or embeddings whose length does not match
 * `queryEmbedding`, are skipped.
 */
export const rankItemsByAttentionTopK = <T>(
	queryEmbedding: number[],
	items: readonly T[],
	getEmbedding: (item: T) => number[] | null | undefined,
	k: number,
): RankedItem<T>[] => {
	if (k <= 0 || items.length === 0) {
		return []
	}

	if (!isFiniteEmbeddingVector(queryEmbedding)) {
		return []
	}

	const packed: Array<{ item: T; originalIndex: number; embedding: number[] }> =
		[]

	for (let i = 0; i < items.length; i++) {
		const item = items[i]
		if (item === undefined) continue
		const embedding = getEmbedding(item)
		if (
			embedding &&
			embedding.length > 0 &&
			embedding.length === queryEmbedding.length &&
			isFiniteEmbeddingVector(embedding)
		) {
			packed.push({ item, originalIndex: i, embedding })
		}
	}

	if (packed.length === 0) {
		return []
	}

	const keys = packed.map((p) => p.embedding)
	const top = topKAttentionKeys(queryEmbedding, keys, k)

	return top.flatMap(({ index: keyIndex, score }) => {
		const row = packed[keyIndex]
		if (!row) {
			return []
		}
		return [
			{
				item: row.item,
				originalIndex: row.originalIndex,
				score,
			},
		]
	})
}
