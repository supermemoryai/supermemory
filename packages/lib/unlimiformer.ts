/**
 * Unlimiformer-style kNN retrieval (Bertsch et al., 2023).
 *
 * @see https://arxiv.org/abs/2305.01625 — cross-attention is approximated by retrieving
 * the top-k keys under dot-product scores. In this codebase, embeddings are treated as
 * key/query vectors; for L2-normalized vectors, dot product equals cosine similarity,
 * matching the ranking used elsewhere in `@repo/lib/similarity`.
 */

import { cosineSimilarity } from "./similarity"

export type AttentionTopK = {
	index: number
	score: number
}

/**
 * Dot-product attention score between one query vector and one key vector.
 * For normalized embeddings this matches cosine similarity.
 */
export const attentionScore = (query: number[], key: number[]): number =>
	cosineSimilarity(query, key)

/**
 * Attention scores for `query` against every row in `keys` (same dimension as query).
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

	const effectiveK = Math.min(k, keys.length)
	const scored: AttentionTopK[] = keys.map((key, index) => ({
		index,
		score: attentionScore(query, key),
	}))

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
 * Items with missing or empty embeddings are skipped.
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

	const packed: Array<{ item: T; originalIndex: number; embedding: number[] }> =
		[]

	for (let i = 0; i < items.length; i++) {
		const item = items[i]
		if (item === undefined) continue
		const embedding = getEmbedding(item)
		if (embedding && embedding.length > 0) {
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
