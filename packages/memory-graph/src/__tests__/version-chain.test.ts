import { describe, it, expect } from "vitest"
import { VersionChainIndex } from "../canvas/version-chain"
import type { GraphApiDocument, GraphApiMemory } from "../types"

function makeMem(
	overrides: Partial<GraphApiMemory> & { id: string },
): GraphApiMemory {
	return {
		memory: `Memory ${overrides.id}`,
		isStatic: false,
		spaceId: "default",
		isLatest: true,
		isForgotten: false,
		forgetAfter: null,
		forgetReason: null,
		version: 1,
		parentMemoryId: null,
		rootMemoryId: null,
		createdAt: "2024-01-01",
		updatedAt: "2024-01-01",
		...overrides,
	}
}

function makeDoc(id: string, memories: GraphApiMemory[]): GraphApiDocument {
	return {
		id,
		title: `Doc ${id}`,
		summary: null,
		documentType: "text",
		createdAt: "2024-01-01",
		updatedAt: "2024-01-01",
		memories,
	}
}

describe("VersionChainIndex", () => {
	it("getChain returns null for standalone memory (no parent, no children)", () => {
		const idx = new VersionChainIndex()
		const doc = makeDoc("d1", [makeMem({ id: "m1", version: 1 })])
		idx.rebuild([doc])
		// Single memory with no parent and no children — not a chain
		expect(idx.getChain("m1")).toBeNull()
	})

	it("getChain from latest node returns full chain in version order", () => {
		const idx = new VersionChainIndex()
		const doc = makeDoc("d1", [
			makeMem({ id: "m1", version: 1 }),
			makeMem({
				id: "m2",
				parentMemoryId: "m1",
				rootMemoryId: "m1",
				version: 2,
			}),
			makeMem({
				id: "m3",
				parentMemoryId: "m2",
				rootMemoryId: "m1",
				version: 3,
			}),
		])
		idx.rebuild([doc])

		// Query from the latest (version 3) — walks back m3->m2->m1, reverses to [m1,m2,m3]
		const chain = idx.getChain("m3")
		expect(chain).not.toBeNull()
		expect(chain!.length).toBe(3)
		expect(chain!.map((e) => e.id)).toEqual(["m1", "m2", "m3"])
		expect(chain?.map((e) => e.version)).toEqual([1, 2, 3])
	})

	it("infers display versions when backend repeats v1 across an update chain", () => {
		const idx = new VersionChainIndex()
		const doc = makeDoc("d1", [
			makeMem({ id: "m1", version: 1, isLatest: false }),
			makeMem({
				id: "m2",
				parentMemoryId: "m1",
				rootMemoryId: "m1",
				version: 1,
				memoryRelations: { m1: "updates" },
			}),
		])
		idx.rebuild([doc])

		const chain = idx.getChain("m2")
		expect(chain).not.toBeNull()
		expect(chain?.map((e) => e.id)).toEqual(["m1", "m2"])
		expect(chain?.map((e) => e.version)).toEqual([1, 2])
	})

	it("getChain from middle element returns full chain (backward + forward)", () => {
		const idx = new VersionChainIndex()
		const doc = makeDoc("d1", [
			makeMem({ id: "m1", version: 1 }),
			makeMem({
				id: "m2",
				parentMemoryId: "m1",
				rootMemoryId: "m1",
				version: 2,
			}),
			makeMem({
				id: "m3",
				parentMemoryId: "m2",
				rootMemoryId: "m1",
				version: 3,
			}),
		])
		idx.rebuild([doc])

		// Query from m2 (version 2) — walks back to m1, forward to m3
		const chain = idx.getChain("m2")
		expect(chain).not.toBeNull()
		expect(chain!.length).toBe(3)
		expect(chain!.map((e) => e.id)).toEqual(["m1", "m2", "m3"])
	})

	it("caches chain results for all entries in the chain", () => {
		const idx = new VersionChainIndex()
		const doc = makeDoc("d1", [
			makeMem({ id: "m1", version: 1 }),
			makeMem({
				id: "m2",
				parentMemoryId: "m1",
				rootMemoryId: "m1",
				version: 2,
			}),
		])
		idx.rebuild([doc])

		const chain1 = idx.getChain("m2")
		// After querying m2, m1 should also be cached (same chain object)
		const chain2 = idx.getChain("m1")
		// m1 is version 1, but it was cached as part of m2's chain
		expect(chain2).toBe(chain1) // same reference
	})

	it("getChain from v1 root with children returns full chain", () => {
		const idx = new VersionChainIndex()
		const doc = makeDoc("d1", [
			makeMem({ id: "m1", version: 1 }),
			makeMem({
				id: "m2",
				parentMemoryId: "m1",
				rootMemoryId: "m1",
				version: 2,
			}),
			makeMem({
				id: "m3",
				parentMemoryId: "m2",
				rootMemoryId: "m1",
				version: 3,
			}),
		])
		idx.rebuild([doc])

		// Query from v1 root — walks forward to m2, m3
		const chain = idx.getChain("m1")
		expect(chain).not.toBeNull()
		expect(chain!.length).toBe(3)
		expect(chain!.map((e) => e.id)).toEqual(["m1", "m2", "m3"])
	})

	it("getChain returns null for unknown ID", () => {
		const idx = new VersionChainIndex()
		idx.rebuild([makeDoc("d1", [makeMem({ id: "m1", version: 1 })])])
		expect(idx.getChain("nonexistent")).toBeNull()
	})

	it("handles empty documents array", () => {
		const idx = new VersionChainIndex()
		expect(() => idx.rebuild([])).not.toThrow()
		expect(idx.getChain("anything")).toBeNull()
	})

	it("rebuild clears previous chains (new array reference)", () => {
		const idx = new VersionChainIndex()
		const doc1 = makeDoc("d1", [
			makeMem({ id: "m1", version: 1 }),
			makeMem({
				id: "m2",
				parentMemoryId: "m1",
				rootMemoryId: "m1",
				version: 2,
			}),
		])
		idx.rebuild([doc1])
		expect(idx.getChain("m2")).not.toBeNull()

		// Rebuild with different data (new array reference)
		const doc2 = makeDoc("d2", [makeMem({ id: "m3", version: 1 })])
		idx.rebuild([doc2])
		expect(idx.getChain("m2")).toBeNull()
		expect(idx.getChain("m1")).toBeNull()
	})

	it("rebuild skips if same array reference", () => {
		const idx = new VersionChainIndex()
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1", version: 1 }),
				makeMem({
					id: "m2",
					parentMemoryId: "m1",
					rootMemoryId: "m1",
					version: 2,
				}),
			]),
		]
		idx.rebuild(docs)
		const chain1 = idx.getChain("m2")

		// Same reference — rebuild is a no-op
		idx.rebuild(docs)
		const chain2 = idx.getChain("m2")
		expect(chain2).toBe(chain1)
	})

	it("handles multiple independent chains across documents", () => {
		const idx = new VersionChainIndex()
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1", version: 1 }),
				makeMem({
					id: "m2",
					parentMemoryId: "m1",
					rootMemoryId: "m1",
					version: 2,
				}),
			]),
			makeDoc("d2", [
				makeMem({ id: "m3", version: 1 }),
				makeMem({
					id: "m4",
					parentMemoryId: "m3",
					rootMemoryId: "m3",
					version: 2,
				}),
			]),
		]
		idx.rebuild(docs)

		const chain1 = idx.getChain("m2")
		const chain2 = idx.getChain("m4")
		expect(chain1).not.toBeNull()
		expect(chain2).not.toBeNull()
		expect(chain1!.map((e) => e.id)).toEqual(["m1", "m2"])
		expect(chain2!.map((e) => e.id)).toEqual(["m3", "m4"])
	})

	it("handles circular parent references without infinite loop", () => {
		const idx = new VersionChainIndex()
		const doc = makeDoc("d1", [
			makeMem({ id: "m1", version: 1, parentMemoryId: "m2" }),
			makeMem({ id: "m2", version: 2, parentMemoryId: "m1" }),
		])
		idx.rebuild([doc])

		// Cycle: m1->m2->m1. The visited set prevents infinite loops.
		const chain = idx.getChain("m1")
		expect(chain).not.toBeNull()
		expect(chain!.length).toBe(2)
	})

	it("branching children: follows first child by document order", () => {
		const idx = new VersionChainIndex()
		const doc = makeDoc("d1", [
			makeMem({ id: "m1", version: 1 }),
			makeMem({
				id: "m2a",
				parentMemoryId: "m1",
				rootMemoryId: "m1",
				version: 2,
			}),
			makeMem({
				id: "m2b",
				parentMemoryId: "m1",
				rootMemoryId: "m1",
				version: 2,
			}),
		])
		idx.rebuild([doc])

		// m1 has two children; forward walk picks the first (m2a)
		const chain = idx.getChain("m1")
		expect(chain).not.toBeNull()
		expect(chain!.length).toBe(2)
		expect(chain!.map((e) => e.id)).toEqual(["m1", "m2a"])
	})

	it("chain entries have correct fields", () => {
		const idx = new VersionChainIndex()
		const doc = makeDoc("d1", [
			makeMem({ id: "m1", version: 1, isForgotten: true, isLatest: false }),
			makeMem({
				id: "m2",
				parentMemoryId: "m1",
				rootMemoryId: "m1",
				version: 2,
				isLatest: true,
			}),
		])
		idx.rebuild([doc])

		const chain = idx.getChain("m2")
		expect(chain).not.toBeNull()
		expect(chain![0]).toEqual({
			id: "m1",
			version: 1,
			memory: "Memory m1",
			isForgotten: true,
			isLatest: false,
		})
		expect(chain![1]).toEqual({
			id: "m2",
			version: 2,
			memory: "Memory m2",
			isForgotten: false,
			isLatest: true,
		})
	})

	// --- Additional edge cases ---

	it("getChain returns null for orphaned non-root memory (v2+, no parent in index, no children)", () => {
		const idx = new VersionChainIndex()
		// m2 claims version 2 and has a parentMemoryId, but that parent is not in any document.
		// The backward walk reaches a dead end after m2 itself (parent not in memoryMap).
		// all.length === 1 → returns null, same as a standalone v1.
		const doc = makeDoc("d1", [
			makeMem({
				id: "m2",
				version: 2,
				parentMemoryId: "m_ghost",
				rootMemoryId: "m_ghost",
			}),
		])
		idx.rebuild([doc])
		expect(idx.getChain("m2")).toBeNull()
	})

	it("cross-document chain: parent in doc1, child in doc2 resolves correctly", () => {
		// rebuild() walks all documents in one pass, so parentMemoryId references
		// are resolved across document boundaries. This mirrors production usage where
		// chainIndex.current.rebuild(limitedDocuments) receives all documents at once.
		const idx = new VersionChainIndex()
		const docs = [
			makeDoc("d1", [makeMem({ id: "m1", version: 1 })]),
			makeDoc("d2", [
				makeMem({
					id: "m2",
					parentMemoryId: "m1",
					rootMemoryId: "m1",
					version: 2,
				}),
			]),
		]
		idx.rebuild(docs)

		// Querying from child (in d2) should walk back to parent (in d1)
		const chainFromChild = idx.getChain("m2")
		expect(chainFromChild).not.toBeNull()
		expect(chainFromChild!.map((e) => e.id)).toEqual(["m1", "m2"])

		// Querying from parent (in d1) should walk forward to child (in d2)
		const chainFromParent = idx.getChain("m1")
		expect(chainFromParent).not.toBeNull()
		expect(chainFromParent!.map((e) => e.id)).toEqual(["m1", "m2"])
	})

	it("circular reference: both IDs present in result (order is undefined for malformed cycles)", () => {
		// The existing circular test asserts length=2 but not membership.
		// Circular data (m1.parent=m2, m2.parent=m1) is malformed and will never
		// appear in production — the visited set merely guarantees termination.
		// Order is intentionally unspecified because the backward-walk start node
		// determines which ID appears first, which has no semantic meaning for corrupt data.
		const idx = new VersionChainIndex()
		const doc = makeDoc("d1", [
			makeMem({ id: "m1", version: 1, parentMemoryId: "m2" }),
			makeMem({ id: "m2", version: 2, parentMemoryId: "m1" }),
		])
		idx.rebuild([doc])

		const chain = idx.getChain("m1")
		expect(chain).not.toBeNull()
		expect(chain!.length).toBe(2)
		// Both nodes must appear — order is implementation-defined for cycles
		const ids = chain!.map((e) => e.id)
		expect(ids).toContain("m1")
		expect(ids).toContain("m2")
	})

	it("getChain from middle node with cold cache exercises real backward+forward traversal", () => {
		// This test deliberately queries the MIDDLE node first (cache is empty at that point)
		// to confirm the combined backward+forward traversal is the live code path being
		// exercised — not merely the cache fast-path from a prior call to another node.
		const idx = new VersionChainIndex()
		const doc = makeDoc("d1", [
			makeMem({ id: "m1", version: 1 }),
			makeMem({
				id: "m2",
				parentMemoryId: "m1",
				rootMemoryId: "m1",
				version: 2,
			}),
			makeMem({
				id: "m3",
				parentMemoryId: "m2",
				rootMemoryId: "m1",
				version: 3,
			}),
		])
		idx.rebuild([doc])

		// Cold cache: getChain("m2") must walk backward to m1 AND forward to m3.
		const chain = idx.getChain("m2")
		expect(chain).not.toBeNull()
		expect(chain!.length).toBe(3)
		expect(chain!.map((e) => e.id)).toEqual(["m1", "m2", "m3"])

		// After the traversal, neighboring nodes must return the same cached reference —
		// confirming that the cache-population loop ran for all three entries.
		expect(idx.getChain("m1")).toBe(chain)
		expect(idx.getChain("m3")).toBe(chain)
	})
})
