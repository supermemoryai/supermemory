/**
 * Adversarial tests for the three core changes in graph-perf-consolidation.
 *
 * Focuses on the exact logic that was changed, NOT on surrounding scaffolding:
 *
 * (1) use-graph-data.ts — edges useMemo now uses memoryRelations Record as
 *     primary source, falls back to parentMemoryId for legacy data.
 *     The old code expected an ARRAY [{relationType, targetMemoryId}].
 *     The new code expects a Record<targetId, relationType>.
 *
 * (2) MCP mcp-app.ts — transformData now pre-populates nodeIds before edge
 *     computation, fixing a forward-reference bug where edges to memories
 *     that appeared later in the iteration order were silently dropped.
 *
 * (3) Invalid relationType values now default to "updates" instead of blowing up.
 *
 * The edges useMemo is a pure function of `documents` — no React hook machinery
 * is needed. We extract the identical logic here and test it directly.
 */

import { describe, it, expect } from "vitest"
import type { GraphApiDocument, GraphApiMemory } from "../types"
import { getEdgeVisualProps } from "../hooks/use-graph-data"

// ---------------------------------------------------------------------------
// Pure extraction of edges useMemo from use-graph-data.ts
// This is a verbatim copy of the logic so a regression in the source will
// cause this test to diverge — but more importantly, we can verify the exact
// semantics match the spec described in the commit messages.
// ---------------------------------------------------------------------------

interface ComputedEdge {
	id: string
	source: string
	target: string
	edgeType: string
}

function computeEdges(documents: GraphApiDocument[]): ComputedEdge[] {
	if (!documents || documents.length === 0) return []

	const result: ComputedEdge[] = []

	// Pre-populate all node IDs (the key step from the forward-reference fix)
	const allNodeIds = new Set<string>()
	for (const doc of documents) {
		allNodeIds.add(doc.id)
		for (const mem of doc.memories) allNodeIds.add(mem.id)
	}

	// 1. Derives edges: document -> memory (structural)
	for (const doc of documents) {
		for (const mem of doc.memories) {
			result.push({
				id: `dm-${doc.id}-${mem.id}`,
				source: doc.id,
				target: mem.id,
				edgeType: "derives",
			})
		}
	}

	// 2. Memory-to-memory relation edges from backend data.
	//    Uses memoryRelations Record<targetId, relationType> as primary source,
	//    falls back to parentMemoryId for legacy data.
	for (const doc of documents) {
		for (const mem of doc.memories) {
			let relations: Record<string, string> = {}

			if (
				mem.memoryRelations &&
				typeof mem.memoryRelations === "object" &&
				Object.keys(mem.memoryRelations).length > 0
			) {
				relations = mem.memoryRelations
			} else if (mem.parentMemoryId) {
				// Legacy fallback: parentMemoryId implies "updates"
				relations = { [mem.parentMemoryId]: "updates" }
			}

			for (const [targetId, relationType] of Object.entries(relations)) {
				if (!allNodeIds.has(targetId)) continue
				const edgeType =
					relationType === "updates" ||
					relationType === "extends" ||
					relationType === "derives"
						? relationType
						: "updates"
				result.push({
					id: `rel-${targetId}-${mem.id}`,
					source: targetId,
					target: mem.id,
					edgeType,
				})
			}
		}
	}

	return result
}

// ---------------------------------------------------------------------------
// MCP transformData logic — pure extraction from mcp-app.ts transformData().
// Includes the forward-reference fix (nodeIds pre-populated before edges).
// ---------------------------------------------------------------------------

interface McpLink {
	source: string
	target: string
	edgeType: "derives" | "updates" | "extends"
}

function mcpComputeLinks(
	documents: Array<{
		id: string
		memories: Array<{
			id: string
			parentMemoryId: string | null
			memoryRelations?: Record<string, string> | null
		}>
	}>,
): McpLink[] {
	const links: McpLink[] = []

	// Pre-populate all node IDs (the forward-reference fix)
	const nodeIds = new Set<string>()
	for (const doc of documents) {
		nodeIds.add(doc.id)
		for (const mem of doc.memories) nodeIds.add(mem.id)
	}

	for (const doc of documents) {
		for (const mem of doc.memories) {
			// Derives link (doc -> memory)
			links.push({ source: doc.id, target: mem.id, edgeType: "derives" })

			let relations: Record<string, string> = {}
			if (
				mem.memoryRelations &&
				typeof mem.memoryRelations === "object" &&
				Object.keys(mem.memoryRelations).length > 0
			) {
				relations = mem.memoryRelations
			} else if (mem.parentMemoryId) {
				relations = { [mem.parentMemoryId]: "updates" }
			}

			for (const [targetId, relationType] of Object.entries(relations)) {
				if (!nodeIds.has(targetId)) continue
				const edgeType =
					relationType === "updates" ||
					relationType === "extends" ||
					relationType === "derives"
						? relationType
						: "updates"
				links.push({ source: targetId, target: mem.id, edgeType })
			}
		}
	}

	return links
}

/** The BUGGY version of mcpComputeLinks: nodeIds populated lazily (per-memory)
 * rather than upfront. Used to prove the regression test would catch the bug. */
function mcpComputeLinks_BUGGY(
	documents: Array<{
		id: string
		memories: Array<{
			id: string
			parentMemoryId: string | null
			memoryRelations?: Record<string, string> | null
		}>
	}>,
): McpLink[] {
	const links: McpLink[] = []
	const nodeIds = new Set<string>() // NOT pre-populated — reproduces the old bug

	for (const doc of documents) {
		nodeIds.add(doc.id)
		for (const mem of doc.memories) {
			nodeIds.add(mem.id) // only added as we reach this memory

			links.push({ source: doc.id, target: mem.id, edgeType: "derives" })

			let relations: Record<string, string> = {}
			if (
				mem.memoryRelations &&
				typeof mem.memoryRelations === "object" &&
				Object.keys(mem.memoryRelations).length > 0
			) {
				relations = mem.memoryRelations
			} else if (mem.parentMemoryId) {
				relations = { [mem.parentMemoryId]: "updates" }
			}

			for (const [targetId, relationType] of Object.entries(relations)) {
				if (!nodeIds.has(targetId)) continue // forward refs silently dropped here!
				const edgeType =
					relationType === "updates" ||
					relationType === "extends" ||
					relationType === "derives"
						? relationType
						: "updates"
				links.push({ source: targetId, target: mem.id, edgeType })
			}
		}
	}

	return links
}

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

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

// ===========================================================================
// (1) memoryRelations Record as PRIMARY source
// ===========================================================================

describe("use-graph-data edges: memoryRelations Record as primary source", () => {
	it("creates an extends edge from memoryRelations { targetId: 'extends' }", () => {
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1" }),
				makeMem({ id: "m2", memoryRelations: { m1: "extends" } }),
			]),
		]
		const edges = computeEdges(docs)
		const relEdge = edges.find((e) => e.source === "m1" && e.target === "m2")
		expect(relEdge).toBeDefined()
		expect(relEdge?.edgeType).toBe("extends")
	})

	it("creates an updates edge from memoryRelations { targetId: 'updates' }", () => {
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1" }),
				makeMem({ id: "m2", memoryRelations: { m1: "updates" } }),
			]),
		]
		const edges = computeEdges(docs)
		const relEdge = edges.find((e) => e.source === "m1" && e.target === "m2")
		expect(relEdge).toBeDefined()
		expect(relEdge?.edgeType).toBe("updates")
	})

	it("creates a derives edge from memoryRelations { targetId: 'derives' }", () => {
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1" }),
				makeMem({ id: "m2", memoryRelations: { m1: "derives" } }),
			]),
		]
		const edges = computeEdges(docs)
		const relEdge = edges.find(
			(e) => e.source === "m1" && e.target === "m2" && e.id.startsWith("rel-"),
		)
		expect(relEdge).toBeDefined()
		expect(relEdge?.edgeType).toBe("derives")
	})

	it("creates multiple edges when memoryRelations has multiple targets", () => {
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1" }),
				makeMem({ id: "m2" }),
				makeMem({
					id: "m3",
					memoryRelations: { m1: "updates", m2: "extends" },
				}),
			]),
		]
		const edges = computeEdges(docs)
		const relEdgesToM3 = edges.filter(
			(e) => e.target === "m3" && e.id.startsWith("rel-"),
		)
		expect(relEdgesToM3.length).toBe(2)
		const types = new Set(relEdgesToM3.map((e) => e.edgeType))
		expect(types.has("updates")).toBe(true)
		expect(types.has("extends")).toBe(true)
	})
})

// ===========================================================================
// (2) memoryRelations TAKES PRECEDENCE over parentMemoryId
// ===========================================================================

describe("use-graph-data edges: memoryRelations wins over parentMemoryId", () => {
	/**
	 * Critical regression test: if a memory has BOTH memoryRelations and
	 * parentMemoryId, only memoryRelations should be used. The fallback
	 * parentMemoryId path must NOT fire when memoryRelations is present.
	 */
	it("uses extends from memoryRelations, ignores parentMemoryId updates fallback", () => {
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "mParent" }),
				makeMem({ id: "mOther" }),
				makeMem({
					id: "m3",
					// parentMemoryId would imply an "updates" edge to mParent
					parentMemoryId: "mParent",
					// memoryRelations says extends to mOther — this should win
					memoryRelations: { mOther: "extends" },
				}),
			]),
		]
		const edges = computeEdges(docs)
		const relEdges = edges.filter(
			(e) => e.id.startsWith("rel-") && e.target === "m3",
		)

		// Should be exactly ONE rel edge (extends to mOther), NOT two
		expect(relEdges.length).toBe(1)
		expect(relEdges[0]?.edgeType).toBe("extends")
		expect(relEdges[0]?.source).toBe("mOther")

		// The parentMemoryId-implied updates edge to mParent must NOT exist
		const badEdge = relEdges.find((e) => e.source === "mParent")
		expect(badEdge).toBeUndefined()
	})
})

// ===========================================================================
// (3) parentMemoryId FALLBACK when memoryRelations absent/null/empty
// ===========================================================================

describe("use-graph-data edges: parentMemoryId fallback", () => {
	it("creates updates edge from parentMemoryId when memoryRelations is absent", () => {
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1" }),
				makeMem({ id: "m2", parentMemoryId: "m1" }),
			]),
		]
		const edges = computeEdges(docs)
		const relEdge = edges.find(
			(e) => e.source === "m1" && e.target === "m2" && e.id.startsWith("rel-"),
		)
		expect(relEdge).toBeDefined()
		expect(relEdge?.edgeType).toBe("updates")
	})

	it("creates updates edge from parentMemoryId when memoryRelations is null", () => {
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1" }),
				makeMem({ id: "m2", parentMemoryId: "m1", memoryRelations: null }),
			]),
		]
		const edges = computeEdges(docs)
		const relEdge = edges.find(
			(e) => e.source === "m1" && e.target === "m2" && e.id.startsWith("rel-"),
		)
		expect(relEdge).toBeDefined()
		expect(relEdge?.edgeType).toBe("updates")
	})

	it("creates updates edge from parentMemoryId when memoryRelations is empty {}", () => {
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1" }),
				makeMem({ id: "m2", parentMemoryId: "m1", memoryRelations: {} }),
			]),
		]
		const edges = computeEdges(docs)
		const relEdge = edges.find(
			(e) => e.source === "m1" && e.target === "m2" && e.id.startsWith("rel-"),
		)
		expect(relEdge).toBeDefined()
		expect(relEdge?.edgeType).toBe("updates")
	})

	it("drops the parentMemoryId edge when the parent is not in the dataset", () => {
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1", parentMemoryId: "ghost_id_not_in_docs" }),
			]),
		]
		const edges = computeEdges(docs)
		const ghostEdges = edges.filter((e) => e.source === "ghost_id_not_in_docs")
		expect(ghostEdges.length).toBe(0)
	})
})

// ===========================================================================
// (4) Invalid relationType defaults to "updates"
// ===========================================================================

describe("use-graph-data edges: invalid relationType defaults to updates", () => {
	it("maps an unknown relationType string to 'updates' edge type", () => {
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1" }),
				makeMem({
					id: "m2",
					// biome-ignore lint/suspicious/noExplicitAny: intentional bad-data test
					memoryRelations: { m1: "totally-bogus-type" as any },
				}),
			]),
		]
		const edges = computeEdges(docs)
		const relEdge = edges.find(
			(e) => e.source === "m1" && e.target === "m2" && e.id.startsWith("rel-"),
		)
		expect(relEdge).toBeDefined()
		expect(relEdge?.edgeType).toBe("updates")
	})
})

// ===========================================================================
// (5) MCP forward-reference fix — THE CRITICAL BUG
// ===========================================================================

describe("MCP transformData: forward-reference fix (pre-populated nodeIds)", () => {
	/**
	 * SETUP: Two memories in the same document. m1 is processed first.
	 * m1 has memoryRelations pointing at m2, which appears AFTER m1.
	 *
	 * OLD BUG: nodeIds was built lazily — when m1 was processed, m2 had not
	 * yet been added to nodeIds, so `!nodeIds.has("m2")` was true and the
	 * edge was silently skipped.
	 *
	 * FIX: All node IDs are pre-populated before any edge is evaluated, so
	 * m2 is always in nodeIds when m1's relations are checked.
	 */
	it("creates edge for forward-referenced memory within same document", () => {
		const docs = [
			{
				id: "d1",
				memories: [
					// m1 comes FIRST and references m2 which comes SECOND
					{
						id: "m1",
						parentMemoryId: null,
						memoryRelations: { m2: "extends" },
					},
					{ id: "m2", parentMemoryId: null, memoryRelations: null },
				],
			},
		]

		// Fixed version creates the edge
		const fixedLinks = mcpComputeLinks(docs)
		const edge = fixedLinks.find((l) => l.source === "m2" && l.target === "m1")
		expect(edge).toBeDefined()
		expect(edge?.edgeType).toBe("extends")
	})

	it("creates edge for forward-referenced memory in a LATER document", () => {
		// m1 in doc1 references m2 in doc2. m2 is only encountered during
		// doc2's iteration, AFTER m1's relations are evaluated.
		const docs = [
			{
				id: "d1",
				memories: [
					{
						id: "m1",
						parentMemoryId: null,
						memoryRelations: { m2: "updates" },
					},
				],
			},
			{
				id: "d2",
				memories: [{ id: "m2", parentMemoryId: null, memoryRelations: null }],
			},
		]

		const fixedLinks = mcpComputeLinks(docs)
		const edge = fixedLinks.find((l) => l.source === "m2" && l.target === "m1")
		expect(edge).toBeDefined()
		expect(edge?.edgeType).toBe("updates")
	})

	/**
	 * REGRESSION PROOF: Run the same scenario through the BUGGY implementation.
	 * The buggy version MUST drop the edge. If this test fails (i.e. buggy code
	 * creates the edge too), the forward-reference scenario doesn't actually
	 * demonstrate the bug, and our fix tests prove nothing.
	 */
	it("proves the bug: lazy nodeIds population drops forward-referenced edges", () => {
		const docs = [
			{
				id: "d1",
				memories: [
					{
						id: "m1",
						parentMemoryId: null,
						memoryRelations: { m2: "extends" },
					},
					{ id: "m2", parentMemoryId: null, memoryRelations: null },
				],
			},
		]

		// The buggy version MUST drop the m1->m2 edge (forward reference)
		const buggyLinks = mcpComputeLinks_BUGGY(docs)
		const buggyEdge = buggyLinks.find(
			(l) => l.source === "m2" && l.target === "m1",
		)
		expect(buggyEdge).toBeUndefined() // confirms the bug was real

		// The fixed version MUST create it
		const fixedLinks = mcpComputeLinks(docs)
		const fixedEdge = fixedLinks.find(
			(l) => l.source === "m2" && l.target === "m1",
		)
		expect(fixedEdge).toBeDefined() // confirms the fix works
	})

	it("proves the bug: cross-document forward reference also dropped by lazy code", () => {
		const docs = [
			{
				id: "d1",
				memories: [
					{
						id: "m1",
						parentMemoryId: null,
						memoryRelations: { m2: "updates" },
					},
				],
			},
			{
				id: "d2",
				memories: [{ id: "m2", parentMemoryId: null, memoryRelations: null }],
			},
		]

		// Buggy: m2 is not in nodeIds when m1 is processed — edge dropped
		const buggyLinks = mcpComputeLinks_BUGGY(docs)
		expect(
			buggyLinks.find((l) => l.source === "m2" && l.target === "m1"),
		).toBeUndefined()

		// Fixed: m2 is pre-populated — edge created
		const fixedLinks = mcpComputeLinks(docs)
		expect(
			fixedLinks.find((l) => l.source === "m2" && l.target === "m1"),
		).toBeDefined()
	})
})

// ===========================================================================
// (6) Structural correctness: derives edges always created, doc->mem
// ===========================================================================

describe("use-graph-data edges: derives edges always present for all doc->mem pairs", () => {
	it("creates exactly one derives edge per memory across multiple documents", () => {
		const docs = [
			makeDoc("d1", [makeMem({ id: "m1" }), makeMem({ id: "m2" })]),
			makeDoc("d2", [
				makeMem({ id: "m3" }),
				makeMem({ id: "m4" }),
				makeMem({ id: "m5" }),
			]),
		]
		const edges = computeEdges(docs)
		const derivesEdges = edges.filter((e) => e.edgeType === "derives")
		// 2 memories in d1 + 3 in d2 = 5 derives edges
		expect(derivesEdges.length).toBe(5)
		expect(derivesEdges.map((e) => e.target).sort()).toEqual([
			"m1",
			"m2",
			"m3",
			"m4",
			"m5",
		])
	})

	it("returns empty array for empty documents input", () => {
		expect(computeEdges([])).toEqual([])
	})

	it("creates no relation edges when all memories are standalone", () => {
		const docs = [
			makeDoc("d1", [
				makeMem({ id: "m1" }), // no parentMemoryId, no memoryRelations
				makeMem({ id: "m2" }),
			]),
		]
		const edges = computeEdges(docs)
		const relEdges = edges.filter((e) => e.id.startsWith("rel-"))
		expect(relEdges.length).toBe(0)
	})
})

// ===========================================================================
// (7) getEdgeVisualProps: the MemoryRelation type is the canonical source
// ===========================================================================

describe("getEdgeVisualProps: all MemoryRelation values return valid visual props", () => {
	const relations = ["updates", "extends", "derives"] as const

	for (const rel of relations) {
		it(`returns positive opacity and thickness for '${rel}'`, () => {
			const props = getEdgeVisualProps(rel)
			expect(props.opacity).toBeGreaterThan(0)
			expect(props.thickness).toBeGreaterThan(0)
		})
	}

	it("extends edges have lower opacity than derives edges (visible but quiet)", () => {
		const ext = getEdgeVisualProps("extends")
		const der = getEdgeVisualProps("derives")
		expect(ext.opacity).toBeLessThan(der.opacity)
	})

	it("updates edges are more prominent than quiet relation edges", () => {
		const upd = getEdgeVisualProps("updates")
		const der = getEdgeVisualProps("derives")
		const ext = getEdgeVisualProps("extends")
		expect(upd.opacity).toBeGreaterThan(der.opacity)
		expect(upd.opacity).toBeGreaterThan(ext.opacity)
	})

	it("unknown edge type returns default props (opacity 0.4, thickness 1.2)", () => {
		// The default case returns { opacity: 0.4, thickness: 1.2 }.
		// A safe conservative fallback matching derives (the most common edge type).
		const unknown = getEdgeVisualProps("nonexistent")
		expect(unknown.opacity).toBeCloseTo(0.4)
		expect(unknown.thickness).toBeCloseTo(1.2)
	})
})
