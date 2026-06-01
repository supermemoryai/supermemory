export type ReceiptMemoryResult = {
	id: string
	similarity: number
	text: string
}

export type RetrievalReceipt = {
	event: "memory.search.returned"
	provider: "supermemory"
	source: "mcp"
	activation: "mcp_recall"
	client?: {
		name: string
		version?: string
	}
	projectIdHash?: string
	queryHash: string
	result: {
		count: number
		total?: number
		idsHash: string[]
		scoreBuckets: string[]
		contentHashes: string[]
	}
	profile?: {
		staticCount: number
		dynamicCount: number
	}
	latencyMs: number
	hashAlgorithm: "sha256-prefix-16"
}

type CreateRetrievalReceiptArgs = {
	query: string
	containerTag?: string
	clientInfo?: { name: string; version?: string }
	results: ReceiptMemoryResult[]
	total?: number
	latencyMs: number
	profile?: {
		staticCount: number
		dynamicCount: number
	}
}

const HASH_PREFIX_LENGTH = 16

async function hashValue(value: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(value),
	)
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, HASH_PREFIX_LENGTH)
}

export function toScoreBucket(score: number): string {
	if (score >= 1) return "1.0"
	if (score <= 0) return "0.0-0.1"

	const lower = Math.floor(score * 10) / 10
	const upper = lower + 0.1
	return `${lower.toFixed(1)}-${upper.toFixed(1)}`
}

export async function createRetrievalReceipt({
	query,
	containerTag,
	clientInfo,
	results,
	total,
	latencyMs,
	profile,
}: CreateRetrievalReceiptArgs): Promise<RetrievalReceipt> {
	const [queryHash, projectIdHash, idsHash, contentHashes] = await Promise.all([
		hashValue(query),
		containerTag ? hashValue(containerTag) : Promise.resolve(undefined),
		Promise.all(results.map((result) => hashValue(result.id))),
		Promise.all(results.map((result) => hashValue(result.text))),
	])

	return {
		event: "memory.search.returned",
		provider: "supermemory",
		source: "mcp",
		activation: "mcp_recall",
		...(clientInfo ? { client: clientInfo } : {}),
		...(projectIdHash ? { projectIdHash } : {}),
		queryHash,
		result: {
			count: results.length,
			...(total === undefined ? {} : { total }),
			idsHash,
			scoreBuckets: results.map((result) => toScoreBucket(result.similarity)),
			contentHashes,
		},
		...(profile ? { profile } : {}),
		latencyMs,
		hashAlgorithm: "sha256-prefix-16",
	}
}
