import { describe, expect, it } from "vitest"
import { createRetrievalReceipt, toScoreBucket } from "./retrieval-receipt"

describe("retrieval receipts", () => {
	it("hashes private values instead of exposing raw query, project, ids, or content", async () => {
		const receipt = await createRetrievalReceipt({
			query: "private cardiology PDF notes",
			containerTag: "secret-client-project",
			clientInfo: { name: "claude-code", version: "1.2.3" },
			results: [
				{
					id: "mem_sensitive_1",
					similarity: 0.87,
					text: "Patient-specific private content",
				},
			],
			total: 3,
			latencyMs: 42,
			profile: { staticCount: 2, dynamicCount: 1 },
		})

		expect(receipt).toMatchObject({
			event: "memory.search.returned",
			provider: "supermemory",
			source: "mcp",
			activation: "mcp_recall",
			client: { name: "claude-code", version: "1.2.3" },
			result: {
				count: 1,
				total: 3,
				scoreBuckets: ["0.8-0.9"],
			},
			profile: { staticCount: 2, dynamicCount: 1 },
			latencyMs: 42,
			hashAlgorithm: "hmac-sha256-ephemeral-salt-prefix-16",
		})

		expect(receipt.queryHash).toHaveLength(16)
		expect(receipt.projectIdHash).toHaveLength(16)
		expect(receipt.result.idsHash).toEqual([
			expect.stringMatching(/^[a-f0-9]{16}$/),
		])
		expect(receipt.result.contentHashes).toEqual([
			expect.stringMatching(/^[a-f0-9]{16}$/),
		])
		expect(JSON.stringify(receipt)).not.toContain("private cardiology")
		expect(JSON.stringify(receipt)).not.toContain("secret-client-project")
		expect(JSON.stringify(receipt)).not.toContain("mem_sensitive_1")
		expect(JSON.stringify(receipt)).not.toContain("Patient-specific")
	})

	it("keeps hashes equal within a receipt but unlinkable across receipts", async () => {
		const args = {
			query: "repeated query",
			containerTag: "same-project",
			results: [
				{ id: "mem_dup", similarity: 0.5, text: "identical content" },
				{ id: "mem_dup", similarity: 0.5, text: "identical content" },
			],
			latencyMs: 10,
		}

		const first = await createRetrievalReceipt(args)
		const second = await createRetrievalReceipt(args)

		// Within one receipt the same value hashes consistently, so duplicates
		// remain detectable for debugging.
		expect(first.result.idsHash[0]).toBe(first.result.idsHash[1])
		expect(first.result.contentHashes[0]).toBe(first.result.contentHashes[1])

		// Across receipts the same private value produces different tokens, so it
		// cannot be correlated or dictionary-guessed without the ephemeral salt.
		expect(second.queryHash).not.toBe(first.queryHash)
		expect(second.projectIdHash).not.toBe(first.projectIdHash)
		expect(second.result.idsHash[0]).not.toBe(first.result.idsHash[0])
		expect(second.result.contentHashes[0]).not.toBe(
			first.result.contentHashes[0],
		)
	})

	it("keeps score buckets bounded at edges", () => {
		expect(toScoreBucket(1)).toBe("1.0")
		expect(toScoreBucket(0)).toBe("0.0-0.1")
		expect(toScoreBucket(-0.2)).toBe("0.0-0.1")
		expect(toScoreBucket(0.42)).toBe("0.4-0.5")
	})
})
