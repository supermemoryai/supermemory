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
	hashAlgorithm: "hmac-sha256-ephemeral-salt-prefix-16"
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
const SALT_BYTES = 32

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	)
}

/**
 * Builds a one-time keyed hasher for a single receipt.
 *
 * Plain deterministic SHA-256 is not privacy-safe for the values we hash here:
 * queries, container tags, memory IDs, and (especially short) memory content
 * are low-entropy, so a raw digest can be dictionary-guessed offline, and the
 * same value would always produce the same digest and stay linkable across
 * every receipt forever.
 *
 * Instead we key an HMAC with a cryptographically random salt that is generated
 * per receipt and never emitted. Without the salt an attacker cannot precompute
 * or brute-force the inputs, and because the salt is fresh for every receipt the
 * same private value produces a different token each time, so receipts cannot be
 * correlated against each other. Equality is preserved only within a single
 * receipt (e.g. duplicate content in one result set), which is what debugging
 * needs.
 */
async function createSaltedHasher(): Promise<
	(value: string) => Promise<string>
> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
	const key = await crypto.subtle.importKey(
		"raw",
		salt,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	)

	return async (value: string): Promise<string> => {
		const signature = await crypto.subtle.sign(
			"HMAC",
			key,
			new TextEncoder().encode(value),
		)
		return bytesToHex(new Uint8Array(signature)).slice(0, HASH_PREFIX_LENGTH)
	}
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
	const hash = await createSaltedHasher()

	const [queryHash, projectIdHash, idsHash, contentHashes] = await Promise.all([
		hash(query),
		containerTag ? hash(containerTag) : Promise.resolve(undefined),
		Promise.all(results.map((result) => hash(result.id))),
		Promise.all(results.map((result) => hash(result.text))),
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
		hashAlgorithm: "hmac-sha256-ephemeral-salt-prefix-16",
	}
}
