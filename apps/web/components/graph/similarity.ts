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
			Number.isNaN(vectorAi) ||
			Number.isNaN(vectorBi)
		) {
			throw new Error("Vectors must contain only numbers")
		}
		dotProduct += vectorAi * vectorBi
	}

	return dotProduct
}

export const calculateSemanticSimilarity = (
	document1Embedding: number[] | null,
	document2Embedding: number[] | null,
): number => {
	if (
		document1Embedding &&
		document2Embedding &&
		document1Embedding.length > 0 &&
		document2Embedding.length > 0
	) {
		const similarity = cosineSimilarity(document1Embedding, document2Embedding)
		return similarity >= 0 ? similarity : 0
	}

	return 0
}

export const getConnectionVisualProps = (similarity: number) => {
	const normalizedSimilarity = Math.max(0, Math.min(1, similarity))

	return {
		opacity: Math.max(0, normalizedSimilarity),
		thickness: Math.max(1, normalizedSimilarity * 4),
		glow: normalizedSimilarity * 0.6,
		pulseDuration: 2000 + (1 - normalizedSimilarity) * 3000,
	}
}

export const getMagicalConnectionColor = (
	similarity: number,
	hue = 220,
): string => {
	const normalizedSimilarity = Math.max(0, Math.min(1, similarity))
	const saturation = 60 + normalizedSimilarity * 40
	const lightness = 40 + normalizedSimilarity * 30

	return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
