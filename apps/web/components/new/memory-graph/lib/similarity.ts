// Utility functions for calculating semantic similarity between documents and memories

/**
 * Calculate cosine similarity between two normalized vectors (unit vectors)
 * Since all embeddings in this system are normalized using normalizeEmbeddingFast,
 * cosine similarity equals dot product for unit vectors.
 */
export const cosineSimilarity = (
	vectorA: number[],
	vectorB: number[],
): number => {
	if (vectorA.length !== vectorB.length) {
		throw new Error("Vectors must have the same length")
	}

	let dotProduct = 0

	for (let i = 0; i < vectorA.length; i++) {
		const vectorAi = vectorA[i]
		const vectorBi = vectorB[i]
		if (
			typeof vectorAi !== "number" ||
			typeof vectorBi !== "number" ||
			isNaN(vectorAi) ||
			isNaN(vectorBi)
		) {
			throw new Error("Vectors must contain only numbers")
		}
		dotProduct += vectorAi * vectorBi
	}

	return dotProduct
}

/**
 * Calculate semantic similarity between two documents
 * Returns a value between 0 and 1, where 1 is most similar
 */
export const calculateSemanticSimilarity = (
	document1Embedding: number[] | null,
	document2Embedding: number[] | null,
): number => {
	// If we have both embeddings, use cosine similarity
	if (
		document1Embedding &&
		document2Embedding &&
		document1Embedding.length > 0 &&
		document2Embedding.length > 0
	) {
		const similarity = cosineSimilarity(document1Embedding, document2Embedding)
		// Convert from [-1, 1] to [0, 1] range
		return similarity >= 0 ? similarity : 0
	}

	return 0
}

/**
 * Calculate semantic similarity between a document and memory entry
 * Returns a value between 0 and 1, where 1 is most similar
 */
export const calculateDocumentMemorySimilarity = (
	documentEmbedding: number[] | null,
	memoryEmbedding: number[] | null,
	relevanceScore?: number | null,
): number => {
	// If we have both embeddings, use cosine similarity
	if (
		documentEmbedding &&
		memoryEmbedding &&
		documentEmbedding.length > 0 &&
		memoryEmbedding.length > 0
	) {
		const similarity = cosineSimilarity(documentEmbedding, memoryEmbedding)
		// Convert from [-1, 1] to [0, 1] range
		return similarity >= 0 ? similarity : 0
	}

	// Fall back to relevance score from database (0-100 scale)
	if (relevanceScore !== null && relevanceScore !== undefined) {
		return Math.max(0, Math.min(1, relevanceScore / 100))
	}

	// Default similarity for connections without embeddings or relevance scores
	return 0.5
}

/**
 * Get visual properties for connection based on similarity
 */
export const getConnectionVisualProps = (similarity: number) => {
	// Ensure similarity is between 0 and 1
	const normalizedSimilarity = Math.max(0, Math.min(1, similarity))

	return {
		opacity: Math.max(0, normalizedSimilarity), // 0 to 1 range
		thickness: Math.max(1, normalizedSimilarity * 4), // 1 to 4 pixels
		glow: normalizedSimilarity * 0.6, // Glow intensity
		pulseDuration: 2000 + (1 - normalizedSimilarity) * 3000, // Faster pulse for higher similarity
	}
}

/**
 * Generate magical color based on similarity and connection type
 */
export const getMagicalConnectionColor = (
	similarity: number,
	hue = 220,
): string => {
	const normalizedSimilarity = Math.max(0, Math.min(1, similarity))
	const saturation = 60 + normalizedSimilarity * 40 // 60% to 100%
	const lightness = 40 + normalizedSimilarity * 30 // 40% to 70%

	return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
