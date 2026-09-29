// Companion to bench-cluster-assignments.ts, for the V8 engine specifically
// (Node, and what Chrome/Edge/most browsers actually run -- i.e. where this
// component executes for real users).
//
// scripts/bench-cluster-assignments.ts imports the live computeClusterAssignments
// and is the benchmark to trust for correctness (it runs the real, current
// source). But run under Bun -- this repo's own dev/test runtime -- it shows
// close to NO difference between the old and new implementation. That is
// not a flaw in the fix: Bun's JavaScriptCore engine optimizes Array.shift()
// far better than V8 does, so the O(n^2) behavior this fix removes barely
// shows up there. Do not conclude from the .ts benchmark alone that this
// optimization is a no-op -- run this file too, with plain `node`.
//
// This script is a standalone, verbatim copy of both implementations (not
// an import), specifically so it can run under plain `node` without hitting
// Node's strict ESM extension-resolution rules on the rest of the source
// tree, and without adding a new dev dependency (e.g. tsx) just to make
// that import work. If computeClusterAssignments changes again, this file's
// copies should be refreshed to match.
//
// Usage (plain Node, not bun):
//   node scripts/bench-cluster-assignments-v8.mjs

function hashString(value) {
	let hash = 0
	for (let i = 0; i < value.length; i++) {
		hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0
	}
	return hash >>> 0
}

const CLUSTER_COLORS = [
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

function getClusterColor(key) {
	return CLUSTER_COLORS[hashString(key) % CLUSTER_COLORS.length]
}

function ensureAdjacency(map, id) {
	if (!map.has(id)) map.set(id, new Set())
}

function connect(map, a, b) {
	ensureAdjacency(map, a)
	ensureAdjacency(map, b)
	map.get(a)?.add(b)
	map.get(b)?.add(a)
}

function getMemoryRelationTargets(mem) {
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

// Verbatim (pre-fix): BFS frontier drained with Array.shift() -- O(remaining
// length) per call.
function previousImplementation(documents) {
	const adjacency = new Map()
	const docByMemory = new Map()
	const orderByMemory = new Map()
	const allMemoryIds = new Set()
	let order = 0

	for (const doc of documents) {
		let firstMemoryId = null
		for (const mem of doc.memories) {
			allMemoryIds.add(mem.id)
			docByMemory.set(mem.id, doc.id)
			orderByMemory.set(mem.id, order++)
			ensureAdjacency(adjacency, mem.id)
			if (!firstMemoryId) firstMemoryId = mem.id
			else connect(adjacency, firstMemoryId, mem.id)
		}
	}

	for (const doc of documents) {
		for (const mem of doc.memories) {
			for (const targetId of Object.keys(getMemoryRelationTargets(mem))) {
				if (!allMemoryIds.has(targetId)) continue
				connect(adjacency, mem.id, targetId)
			}
		}
	}

	const assignments = new Map()
	const visited = new Set()
	const memoryIdsByOrder = [...allMemoryIds].sort(
		(a, b) => (orderByMemory.get(a) ?? 0) - (orderByMemory.get(b) ?? 0),
	)

	for (const startId of memoryIdsByOrder) {
		if (visited.has(startId)) continue
		const component = []
		const queue = [startId]
		visited.add(startId)

		while (queue.length > 0) {
			const id = queue.shift()
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
			color: getClusterColor(key),
			size: component.length,
		}
		for (const id of component) assignments.set(id, assignment)
	}

	return assignments
}

// Optimized (current): index-pointer dequeue -- O(1) per call. Identical
// otherwise -- this is the actual diff applied to use-graph-data.ts.
function optimizedImplementation(documents) {
	const adjacency = new Map()
	const docByMemory = new Map()
	const orderByMemory = new Map()
	const allMemoryIds = new Set()
	let order = 0

	for (const doc of documents) {
		let firstMemoryId = null
		for (const mem of doc.memories) {
			allMemoryIds.add(mem.id)
			docByMemory.set(mem.id, doc.id)
			orderByMemory.set(mem.id, order++)
			ensureAdjacency(adjacency, mem.id)
			if (!firstMemoryId) firstMemoryId = mem.id
			else connect(adjacency, firstMemoryId, mem.id)
		}
	}

	for (const doc of documents) {
		for (const mem of doc.memories) {
			for (const targetId of Object.keys(getMemoryRelationTargets(mem))) {
				if (!allMemoryIds.has(targetId)) continue
				connect(adjacency, mem.id, targetId)
			}
		}
	}

	const assignments = new Map()
	const visited = new Set()
	const memoryIdsByOrder = [...allMemoryIds].sort(
		(a, b) => (orderByMemory.get(a) ?? 0) - (orderByMemory.get(b) ?? 0),
	)

	for (const startId of memoryIdsByOrder) {
		if (visited.has(startId)) continue
		const component = []
		const queue = [startId]
		let head = 0
		visited.add(startId)

		while (head < queue.length) {
			const id = queue[head++]
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
			color: getClusterColor(key),
			size: component.length,
		}
		for (const id of component) assignments.set(id, assignment)
	}

	return assignments
}

function makeMemory(id, relations) {
	return { id, memoryRelations: relations ?? null, parentMemoryId: null }
}

/**
 * One hub memory + n-1 memories that `derives` from it, one per document --
 * a single connected component with a wide BFS frontier, matching the
 * cross-document relation-merge path in use-graph-data.ts.
 */
function buildStarDataset(n) {
	const memories = [makeMemory("mem-hub")]
	for (let i = 1; i < n; i++) {
		memories.push(makeMemory(`mem-${i}`, { "mem-hub": "derives" }))
	}
	return memories.map((mem, i) => ({ id: `doc-${i}`, memories: [mem] }))
}

function timeOnce(fn) {
	const start = performance.now()
	fn()
	return performance.now() - start
}

console.log(`Engine: ${process.release?.name ?? "unknown"} ${process.version}`)
if (process.versions?.bun) {
	console.log(
		"WARNING: running under Bun. This is the wrong engine to judge this fix by -- run with plain `node` instead.",
	)
}

console.log(
	"\nCorrectness check: previous vs. optimized produce identical assignments",
)
{
	const dataset = buildStarDataset(2_000)
	const prev = previousImplementation(dataset)
	const curr = optimizedImplementation(dataset)
	let mismatch = prev.size !== curr.size
	if (!mismatch) {
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
	}
	console.log(
		mismatch
			? "  MISMATCH -- do not trust these numbers"
			: "  OK, outputs are identical",
	)
	if (mismatch) process.exit(1)
}

const RUNS_PER_SIZE = 5
const SIZES = [5_000, 10_000, 20_000, 40_000, 80_000, 100_000]

console.log("\nn\tprevious (ms)\toptimized (ms)\tspeedup")
for (const n of SIZES) {
	const dataset = buildStarDataset(n)
	let prevBest = Number.POSITIVE_INFINITY
	let currBest = Number.POSITIVE_INFINITY
	for (let i = 0; i < RUNS_PER_SIZE; i++) {
		let pTime
		let cTime
		// Alternate which implementation runs first each sample, to cancel
		// out any heap-warmup/ordering bias between the two.
		if (i % 2 === 0) {
			pTime = timeOnce(() => previousImplementation(dataset))
			cTime = timeOnce(() => optimizedImplementation(dataset))
		} else {
			cTime = timeOnce(() => optimizedImplementation(dataset))
			pTime = timeOnce(() => previousImplementation(dataset))
		}
		if (pTime < prevBest) prevBest = pTime
		if (cTime < currBest) currBest = cTime
	}
	console.log(
		`${n}\t${prevBest.toFixed(2)}\t\t${currBest.toFixed(2)}\t\t${(prevBest / currBest).toFixed(2)}x`,
	)
}
