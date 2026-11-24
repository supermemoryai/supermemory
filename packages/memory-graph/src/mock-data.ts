import type { GraphApiDocument, GraphApiMemory } from "./types.js"

export interface MockGraphOptions {
	documentCount?: number
	memoriesPerDoc?: number | [number, number]
	seed?: number
}

/**
 * Simple seeded PRNG (Mulberry32).
 * Returns a function that produces values in [0, 1).
 */
function createSeededRandom(seed: number): () => number {
	let s = seed | 0
	return () => {
		s = (s + 0x6d2b79f5) | 0
		let t = Math.imul(s ^ (s >>> 15), 1 | s)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const DOCUMENT_TYPES = [
	"webpage",
	"pdf",
	"md",
	"doc",
	"csv",
	"json",
	"notion",
	"text",
	"google_doc",
	"google_sheet",
	"google_slide",
	"tweet",
	"youtube",
	"image",
	"note",
	"google_drive",
	"video",
	"mcp",
	"word",
] as const

const TITLE_PREFIXES = [
	"Project Planning",
	"API Documentation",
	"Meeting Minutes",
	"Architecture Design",
	"Sprint Retrospective",
	"User Research",
	"Product Roadmap",
	"Technical Spec",
	"Onboarding Guide",
	"Release Notes",
	"Performance Report",
	"Security Audit",
	"Database Schema",
	"Deployment Guide",
	"Team Standup",
	"Bug Triage",
	"Feature Request",
	"Code Review",
	"Integration Test",
	"Data Pipeline",
]

const TITLE_SUFFIXES = [
	"Notes",
	"Q3",
	"Q4",
	"v2",
	"v3",
	"Final",
	"Draft",
	"2024",
	"2025",
	"Summary",
	"Overview",
	"Detailed",
	"Analysis",
	"Report",
	"Update",
]

const MEMORY_TEMPLATES = [
	"The user prefers {preference} when working with {topic}",
	"Key decision: {topic} will be implemented using {approach}",
	"Important constraint: {topic} must handle {requirement}",
	"The {component} module depends on {dependency} for {purpose}",
	"Performance target: {metric} should be under {threshold}",
	"The team agreed to {action} before {deadline}",
	"User feedback indicates {observation} about {feature}",
	"Best practice: always {action} when {condition}",
	"Known issue: {component} has {issue} under {condition}",
	"Migration plan: move from {oldThing} to {newThing} by {deadline}",
]

const TEMPLATE_FILLS: Record<string, string[]> = {
	preference: [
		"TypeScript",
		"dark mode",
		"keyboard shortcuts",
		"minimal UI",
		"detailed logs",
		"async patterns",
	],
	topic: [
		"authentication",
		"caching",
		"data sync",
		"graph rendering",
		"search indexing",
		"memory management",
	],
	approach: [
		"event sourcing",
		"CQRS",
		"microservices",
		"edge functions",
		"WebSocket streams",
		"batch processing",
	],
	requirement: [
		"10k concurrent users",
		"sub-100ms latency",
		"offline mode",
		"real-time updates",
		"GDPR compliance",
	],
	component: [
		"auth",
		"graph",
		"search",
		"storage",
		"notification",
		"analytics",
	],
	dependency: [
		"Redis",
		"PostgreSQL",
		"S3",
		"Cloudflare Workers",
		"D3-force",
		"WebGL",
	],
	purpose: [
		"caching",
		"persistence",
		"rendering",
		"indexing",
		"scheduling",
		"routing",
	],
	metric: [
		"p99 latency",
		"time to interactive",
		"memory usage",
		"CPU utilization",
		"bundle size",
	],
	threshold: ["200ms", "500ms", "50MB", "3 seconds", "100KB", "1GB"],
	action: [
		"run benchmarks",
		"update dependencies",
		"write migration scripts",
		"review PRs",
		"deploy to staging",
	],
	deadline: ["end of sprint", "next release", "Q4", "Friday", "the demo"],
	observation: [
		"confusion",
		"delight",
		"frustration",
		"efficiency gains",
		"unexpected usage patterns",
	],
	feature: [
		"the graph view",
		"search filters",
		"memory chains",
		"document upload",
		"sharing",
	],
	condition: [
		"high load",
		"cold start",
		"large datasets",
		"slow networks",
		"concurrent edits",
	],
	issue: [
		"memory leaks",
		"race conditions",
		"stale data",
		"layout thrashing",
		"connection drops",
	],
	oldThing: [
		"REST API",
		"MongoDB",
		"class components",
		"Webpack",
		"manual testing",
	],
	newThing: ["GraphQL", "PostgreSQL", "hooks", "Vite", "automated CI"],
}

const SUMMARY_TEMPLATES = [
	"Documentation covering {topic} implementation details and best practices for the team.",
	"Notes from the recent discussion about {topic} and the decisions made regarding {approach}.",
	"Technical overview of the {component} system, including architecture and key design choices.",
	"Analysis of {metric} performance data, with recommendations for optimization.",
	"Guide for setting up and configuring {component} in development and production environments.",
	"Collection of user feedback and research findings related to {feature}.",
]

function fillTemplate(template: string, random: () => number): string {
	return template.replace(/{(\w+)}/g, (_match, key: string) => {
		const options = TEMPLATE_FILLS[key]
		if (!options || options.length === 0) return key
		return options[Math.floor(random() * options.length)]
	})
}

function generateTitle(random: () => number): string {
	const prefix = TITLE_PREFIXES[Math.floor(random() * TITLE_PREFIXES.length)]
	if (random() > 0.5) {
		const suffix = TITLE_SUFFIXES[Math.floor(random() * TITLE_SUFFIXES.length)]
		return `${prefix} ${suffix}`
	}
	return prefix
}

function generateSummary(random: () => number): string | null {
	if (random() < 0.15) return null
	const template =
		SUMMARY_TEMPLATES[Math.floor(random() * SUMMARY_TEMPLATES.length)]
	return fillTemplate(template, random)
}

function generateMemoryContent(random: () => number): string {
	const template =
		MEMORY_TEMPLATES[Math.floor(random() * MEMORY_TEMPLATES.length)]
	return fillTemplate(template, random)
}

function generateISODate(
	random: () => number,
	baseMs: number,
	rangeMs: number,
): string {
	const ms = baseMs + Math.floor(random() * rangeMs)
	return new Date(ms).toISOString()
}

export function generateMockGraphData(options: MockGraphOptions = {}): {
	documents: GraphApiDocument[]
} {
	const {
		documentCount = 100,
		memoriesPerDoc = [2, 6] as [number, number],
		seed = 42,
	} = options

	const random = createSeededRandom(seed)

	// Time range: roughly Jan 2024 to Jun 2025
	const baseTime = new Date("2024-01-01T00:00:00Z").getTime()
	const timeRange = 1000 * 60 * 60 * 24 * 540 // ~540 days

	const spaceIds = [
		"space-default",
		"space-work",
		"space-personal",
		"space-research",
	]

	const documents: GraphApiDocument[] = []

	for (let d = 0; d < documentCount; d++) {
		const docId = `doc-${String(d).padStart(4, "0")}`
		const docCreatedAt = generateISODate(random, baseTime, timeRange)
		const docUpdatedAt = generateISODate(
			random,
			new Date(docCreatedAt).getTime(),
			1000 * 60 * 60 * 24 * 30, // up to 30 days after creation
		)

		// Determine memory count
		let memCount: number
		if (typeof memoriesPerDoc === "number") {
			memCount = memoriesPerDoc
		} else {
			const [min, max] = memoriesPerDoc
			memCount = min + Math.floor(random() * (max - min + 1))
		}

		const spaceId = spaceIds[Math.floor(random() * spaceIds.length)]
		const memories: GraphApiMemory[] = []

		// Decide if this document has a version chain (30% chance)
		const hasVersionChain = random() < 0.3 && memCount >= 3
		let chainRootId: string | null = null
		let chainPrevId: string | null = null
		let chainVersion = 1

		for (let m = 0; m < memCount; m++) {
			const memId = `mem-${docId}-${String(m).padStart(3, "0")}`
			const memCreatedAt = generateISODate(
				random,
				new Date(docCreatedAt).getTime(),
				1000 * 60 * 60 * 24 * 14,
			)
			const memUpdatedAt = generateISODate(
				random,
				new Date(memCreatedAt).getTime(),
				1000 * 60 * 60 * 24 * 7,
			)

			let parentMemoryId: string | null = null
			let rootMemoryId: string | null = null
			let version = 1
			let isLatest = true
			let isForgotten = false
			let memoryRelations: Record<string, "updates" | "extends" | "derives"> =
				{}

			// Build version chain for first few memories if applicable
			if (hasVersionChain && m < 3) {
				if (m === 0) {
					// Root of the chain
					chainRootId = memId
					chainPrevId = memId
					chainVersion = 1
					version = 1
					isLatest = false
					isForgotten = random() < 0.3
				} else {
					parentMemoryId = chainPrevId
					rootMemoryId = chainRootId
					chainVersion++
					version = chainVersion
					chainPrevId = memId
					isLatest = m === 2 // last in the 3-memory chain
					isForgotten = !isLatest && random() < 0.2
					// Add "updates" relation to parent
					if (parentMemoryId) {
						memoryRelations = { [parentMemoryId]: "updates" }
					}
				}
			} else {
				// Standalone memory
				isForgotten = random() < 0.1
				isLatest = true
				version = 1
				// Randomly add extends/derives relations to earlier memories in this doc
				if (m > 0 && random() < 0.2) {
					const targetIdx = Math.floor(random() * m)
					const targetMem = memories[targetIdx]
					if (targetMem) {
						const relType = random() < 0.5 ? "extends" : "derives"
						memoryRelations = {
							[targetMem.id]: relType,
						}
					}
				}
			}

			// Determine forgetAfter (for some non-forgotten memories, set a future expiry)
			let forgetAfter: string | null = null
			let forgetReason: string | null = null
			if (isForgotten) {
				forgetReason = random() < 0.5 ? "superseded" : "user-requested"
			} else if (random() < 0.1) {
				// Expiring memory
				const expiryMs =
					Date.now() + Math.floor(random() * 1000 * 60 * 60 * 24 * 30)
				forgetAfter = new Date(expiryMs).toISOString()
			}

			memories.push({
				id: memId,
				memory: generateMemoryContent(random),
				isStatic: random() < 0.15,
				spaceId,
				isLatest,
				isForgotten,
				forgetAfter,
				forgetReason,
				version,
				parentMemoryId,
				rootMemoryId,
				createdAt: memCreatedAt,
				updatedAt: memUpdatedAt,
				memoryRelations:
					Object.keys(memoryRelations).length > 0 ? memoryRelations : undefined,
			})
		}

		documents.push({
			id: docId,
			title: generateTitle(random),
			summary: generateSummary(random),
			documentType:
				DOCUMENT_TYPES[Math.floor(random() * DOCUMENT_TYPES.length)],
			createdAt: docCreatedAt,
			updatedAt: docUpdatedAt,
			memories,
		})
	}

	return { documents }
}
