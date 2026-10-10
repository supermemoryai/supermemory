/**
 * Benchmark for computeClusterAssignments (src/hooks/use-graph-data.ts).
 *
 * computeClusterAssignments runs inside a useMemo keyed on the full
 * `documents` array, so it re-executes on the whole dataset every time the
 * memory graph loads or its data changes, on the browser main thread.
 *
 * Its BFS drains the frontier with `queue.shift()`, which is O(n) per call.
 * For a graph shaped like a wide star -- one "hub" memory that many other
 * memories `derives`/`updates` from (e.g. a canonical/root memory
 * referenced by a long history of later updates) -- the BFS frontier grows
 * to ~n before draining, making the whole traversal O(n^2).
 *
 * This script measures wall-clock time across a range of dataset sizes for
 * both the live implementation and a frozen pre-fix snapshot
 * (previousImplementation, below). Scaling behavior (does cost grow
 * linearly or quadratically with n?) is the signal we actually care about,
 * and it is far more robust to GC/JIT noise than a single head-to-head
 * timing at one size -- an earlier attempt at this benchmark using vitest's
 * `bench` reported the *current, unmodified* implementation as "1.2x faster
 * than itself" purely from GC noise on 40k-node allocations, which is why
 * this script uses best-of-N sampling at multiple sizes instead.
 *
 * IMPORTANT: this repo's dev tooling runs on Bun, whose JavaScriptCore
 * engine optimizes Array.shift() far better than V8 (what Chrome/Edge/most
 * browsers -- i.e. this component's actual users -- run). Run under Bun,
 * this benchmark will show close to NO difference between old and new. That
 * does not mean the fix is a no-op -- see the companion script
 * bench-cluster-assignments-v8.mjs, which is engine-independent (plain
 * Node, zero dependencies) and shows the real, growing gap.
 *
 * Usage:
 *   bun run scripts/bench-cluster-assignments.ts       (correctness + Bun numbers)
 *   node scripts/bench-cluster-assignments-v8.mjs       (V8/real-world numbers)
 */
import { computeClusterAssignments } from "../src/hooks/use-graph-data"
import type { GraphApiDocument, GraphApiMemory } from "../src/types"

function makeMemory(
	id: string,
	relations?: Record<string, "updates" | "extends" | "derives">,
): GraphApiMemory {
	return {
		id,
		memory: "test",
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
		memoryRelations: relations ?? null,
	}
}

function makeDocument(
	id: string,
	memories: GraphApiMemory[],
): GraphApiDocument {
	return {
		id,
		title: id,
		summary: null,
		documentType: "text",
		createdAt: "2024-01-01",
		updatedAt: "2024-01-01",
		memories,
	}
}

/**
 * One hub memory + n-1 memories that `derives` from it, spread one-per-
 * document. Exercises the cross-document relation-merge path at
 * use-graph-data.ts:140-147 and produces a single large connected component
 * with a wide BFS frontier -- the shape that triggers the O(n^2) behavior.
 */
function buildStarDataset(n: number): GraphApiDocument[] {
	const memories: GraphApiMemory[] = [makeMemory("mem-hub")]
	for (let i = 1; i < n; i++) {
		memories.push(makeMemory(`mem-${i}`, { "mem-hub": "derives" }))
	}
	return memories.map((mem, i) => makeDocument(`doc-${i}`, [mem]))
}

// --- frozen pre-optimization snapshot (benchmark comparison only) ---
// Verbatim copy of computeClusterAssignments and its private helpers as
// they existed before the perf/cluster-bfs-queue fix. Kept here only so
// this benchmark keeps comparing old vs. new after the production code is
// optimized.

function hashStringSnapshot(value: string): number {
	let hash = 0
	for (let i = 0; i < value.length; i++) {
		hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0
	}
	return hash >>> 0
}

const CLUSTER_COLORS_SNAPSHOT = [
	"#58C7E8",
	"#E7BC52",
	"#74D680",
	"#D47B75",
	"#A789E8",
	"#62C5A8",
	"#74ABD8",
	"#C78AC8",
	"#D18A58",
	"#8BCB6F",
]

function getClusterColorSnapshot(key: string): string {
	return CLUSTER_COLORS_SNAPSHOT[
		hashStringSnapshot(key) % CLUSTER_COLORS_SNAPSHOT.length
	] as string
}

function ensureAdjacencySnapshot(map: Map<string, Set<string>>, id: string) {
	if (!map.has(id)) map.set(id, new Set())
}

function connectSnapshot(map: Map<string, Set<string>>, a: string, b: string) {
	ensureAdjacencySnapshot(map, a)
	ensureAdjacencySnapshot(map, b)
	map.get(a)?.add(b)
	map.get(b)?.add(a)
}

function getMemoryRelationTargetsSnapshot(
	mem: GraphApiMemory,
): Record<string, string> {
	if (
		mem.memoryRelations &&
		typeof mem.memoryRelations === "object" &&
		Object.keys(mem.memoryRelations).length > 0
	) {
		return mem.memoryRelations
	}
	if (mem.parentMemoryId) return { [mem.parentMemoryId]: "updates" }
	return {}
}

function previousImplementation(documents: GraphApiDocument[]) {
	const adjacency = new Map<string, Set<string>>()
	const docByMemory = new Map<string, string>()
	const orderByMemory = new Map<string, number>()
	const allMemoryIds = new Set<string>()
	let order = 0

	for (const doc of documents) {
		let firstMemoryId: string | null = null
		for (const mem of doc.memories) {
			allMemoryIds.add(mem.id)
			docByMemory.set(mem.id, doc.id)
			orderByMemory.set(mem.id, order++)
			ensureAdjacencySnapshot(adjacency, mem.id)

			if (!firstMemoryId) {
				firstMemoryId = mem.id
			} else {
				connectSnapshot(adjacency, firstMemoryId, mem.id)
			}
		}
	}

	for (const doc of documents) {
		for (const mem of doc.memories) {
			for (const targetId of Object.keys(
				getMemoryRelationTargetsSnapshot(mem),
			)) {
				if (!allMemoryIds.has(targetId)) continue
				connectSnapshot(adjacency, mem.id, targetId)
			}
		}
	}

	const assignments = new Map()
	const visited = new Set<string>()
	const memoryIdsByOrder = [...allMemoryIds].sort(
		(a, b) => (orderByMemory.get(a) ?? 0) - (orderByMemory.get(b) ?? 0),
	)

	for (const startId of memoryIdsByOrder) {
		if (visited.has(startId)) continue

		const component: string[] = []
		const queue = [startId]
		visited.add(startId)

		while (queue.length > 0) {
			const id = queue.shift() as string
			component.push(id)
			for (const nextId of adjacency.get(id) ?? []) {
				if (visited.has(nextId)) continue
				visited.add(nextId)
				queue.push(nextId)
			}
		}

		component.sort(
			(a, b) => (orderByMemory.get(a) ?? 0) - (orderByMemory.get(b) ?? 0),
		)
		const firstId = component[0] ?? startId
		const docIds = new Set(component.map((id) => docByMemory.get(id)))
		const firstDocId = docByMemory.get(firstId) ?? "unknown"
		const key =
			docIds.size <= 1
				? `doc:${firstDocId}`
				: `relation:${firstDocId}:${firstId}`
		const assignment = {
			key,
			color: getClusterColorSnapshot(key),
			size: component.length,
		}

		for (const id of component) assignments.set(id, assignment)
	}

	return assignments
}

// --- timing harness ---

function bestOf(fn: () => void, runs: number): number {
	let best = Number.POSITIVE_INFINITY
	for (let i = 0; i < runs; i++) {
		const start = performance.now()
		fn()
		const elapsed = performance.now() - start
		if (elapsed < best) best = elapsed
	}
	return best
}

const RUNS_PER_SIZE = 5
const SIZES = [5_000, 10_000, 20_000, 40_000, 80_000, 100_000]

if ((process.versions as { bun?: string }).bun) {
	console.log(
		"WARNING: running under Bun -- its JavaScriptCore engine optimizes\n" +
			"Array.shift() well, so the numbers below will look flat regardless\n" +
			"of the fix. Run `node scripts/bench-cluster-assignments-v8.mjs` for\n" +
			"the engine-independent, real-world (V8) comparison.\n",
	)
}

console.log(
	"Correctness check: previous vs. current produce identical assignments",
)
{
	const dataset = buildStarDataset(2_000)
	const prev = previousImplementation(dataset)
	const curr = computeClusterAssignments(dataset)
	let mismatch = false
	if (prev.size !== curr.size) mismatch = true
	for (const [id, assignment] of prev) {
		const currAssignment = curr.get(id)
		if (
			!currAssignment ||
			currAssignment.key !== assignment.key ||
			currAssignment.color !== assignment.color ||
			currAssignment.size !== assignment.size
		) {
			mismatch = true
			break
		}
	}
	console.log(
		mismatch
			? "  MISMATCH -- do not trust these numbers"
			: "  OK, outputs are identical",
	)
	if (mismatch) process.exit(1)
}

console.log("\nn\tprevious (ms)\tcurrent (ms)\tspeedup")
for (const n of SIZES) {
	const dataset = buildStarDataset(n)
	// Alternate which implementation runs first across the repeated samples
	// to cancel out any ordering/heap-warmup bias between the two.
	let prevBest = Number.POSITIVE_INFINITY
	let currBest = Number.POSITIVE_INFINITY
	for (let i = 0; i < RUNS_PER_SIZE; i++) {
		let pTime: number
		let cTime: number
		if (i % 2 === 0) {
			pTime = bestOf(() => previousImplementation(dataset), 1)
			cTime = bestOf(() => computeClusterAssignments(dataset), 1)
		} else {
			cTime = bestOf(() => computeClusterAssignments(dataset), 1)
			pTime = bestOf(() => previousImplementation(dataset), 1)
		}
		if (pTime < prevBest) prevBest = pTime
		if (cTime < currBest) currBest = cTime
	}
	console.log(
		`${n}\t${prevBest.toFixed(2)}\t\t${currBest.toFixed(2)}\t\t${(prevBest / currBest).toFixed(2)}x`,
	)
}
