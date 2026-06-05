import type { Memory } from "./client"

const RECEIPT_HASH_LENGTH = 16

export type MemorySearchReturnedReceipt = {
	event: "memory.search.returned"
	memory: {
		provider: "supermemory"
	}
	client: {
		name: string
		version?: string
	}
	project: {
		id_hash: string
	}
	query: {
		hash: string
	}
	result: {
		count: number
		ids_hash: string
		score_bucket: number[]
		content_hash: string[]
	}
	snapshot: {
		id_hash: string
	}
	latency_ms: number
	timestamp: string
}

const toHex = (bytes: Uint8Array): string =>
	Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("")

export async function privacyHash(input: string, salt = ""): Promise<string> {
	const encoder = new TextEncoder()
	const hash = await crypto.subtle.digest(
		"SHA-256",
		encoder.encode(`${salt}:${input}`),
	)
	return toHex(new Uint8Array(hash)).slice(0, RECEIPT_HASH_LENGTH)
}

export function scoreToBucket(score: number): number {
	if (!Number.isFinite(score)) {
		return 0
	}
	const bucket = Math.floor(Math.max(0, Math.min(1, score)) * 10) / 10
	return Number(bucket.toFixed(1))
}

export async function buildMemorySearchReceipt(args: {
	query: string
	projectId?: string
	clientName?: string
	clientVersion?: string
	snapshotId?: string
	latencyMs: number
	results: Memory[]
	hashSalt?: string
}): Promise<MemorySearchReturnedReceipt> {
	const {
		query,
		projectId,
		clientName,
		clientVersion,
		snapshotId,
		latencyMs,
		results,
		hashSalt,
	} = args

	const idMaterial = results.map((result) => result.id).join("|")
	const contentHashes = await Promise.all(
		results.map((result) => {
			const content = "memory" in result ? result.memory : result.chunk
			return privacyHash(content || "", hashSalt)
		}),
	)

	return {
		event: "memory.search.returned",
		memory: { provider: "supermemory" },
		client: {
			name: clientName || "unknown",
			version: clientVersion,
		},
		project: {
			id_hash: await privacyHash(projectId || "default", hashSalt),
		},
		query: {
			hash: await privacyHash(query, hashSalt),
		},
		result: {
			count: results.length,
			ids_hash: await privacyHash(idMaterial, hashSalt),
			score_bucket: results.map((result) => scoreToBucket(result.similarity)),
			content_hash: contentHashes,
		},
		snapshot: {
			id_hash: await privacyHash(snapshotId || "unknown", hashSalt),
		},
		latency_ms: latencyMs,
		timestamp: new Date().toISOString(),
	}
}

export function formatReceiptLogLine(
	receipt: MemorySearchReturnedReceipt,
): string {
	return `[SUPERMEMORY_RECEIPT] ${JSON.stringify(receipt)}`
}
