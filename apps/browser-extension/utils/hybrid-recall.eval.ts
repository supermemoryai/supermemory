/**
 * Offline A/B proof for hybrid recall.
 * Legacy = memory field only. Next = memory || chunk.
 *
 * Docs: docs/hybrid-recall-eval.md
 * Run:  bun run eval:hybrid-recall
 */
import {
	buildSearchMemoriesBody,
	formatSearchHitsForPrompt,
	type SearchHit,
} from "./search-request"

/** Old background.ts behavior: only `result.memory`. */
export function formatSearchHitsLegacy(
	results: SearchHit[] | null | undefined,
): string[] {
	if (!results?.length) return []
	return results.map((result, index) => `${index + 1}. ${result.memory} \n`)
}

export type HybridRecallFixture = {
	id: string
	description: string
	/** Gold substrings that must appear in the new prompt. */
	expectedTexts: string[]
	/** Substrings that exist only as `chunk` (legacy drops these). */
	chunkOnlyTexts: string[]
	results: SearchHit[]
}

/** Fixture API payloads that mix memory facts with document chunks. */
export const HYBRID_RECALL_FIXTURES: HybridRecallFixture[] = [
	{
		id: "mixed-memory-and-chunk",
		description: "Typical hybrid page: facts + one RAG chunk",
		expectedTexts: [
			"Prefers dark mode",
			"Uses Biome for formatting",
			"Deploy checklist: run migrations before restarting the API",
		],
		chunkOnlyTexts: [
			"Deploy checklist: run migrations before restarting the API",
		],
		results: [
			{ memory: "Prefers dark mode" },
			{ memory: "Uses Biome for formatting" },
			{
				chunk: "Deploy checklist: run migrations before restarting the API",
			},
		],
	},
	{
		id: "chunk-starvation-shape",
		description:
			"Memory-heavy hybrid response with one surviving document chunk",
		expectedTexts: [
			"User works at Acme",
			"Timezone is America/New_York",
			"Prefers TypeScript, strict mode",
			"Onboarding doc: VPN must be connected before staging deploy",
		],
		chunkOnlyTexts: [
			"Onboarding doc: VPN must be connected before staging deploy",
		],
		results: [
			{ memory: "User works at Acme" },
			{ memory: "Timezone is America/New_York" },
			{ memory: "Prefers TypeScript, strict mode" },
			{
				chunk: "Onboarding doc: VPN must be connected before staging deploy",
			},
		],
	},
	{
		id: "chunk-only-page",
		description: "Document-only hits with no extracted memories",
		expectedTexts: [
			"Incident runbook: page the on-call if error rate > 5%",
			"Rollback: redeploy previous image tag from the deploy board",
		],
		chunkOnlyTexts: [
			"Incident runbook: page the on-call if error rate > 5%",
			"Rollback: redeploy previous image tag from the deploy board",
		],
		results: [
			{ chunk: "Incident runbook: page the on-call if error rate > 5%" },
			{
				chunk: "Rollback: redeploy previous image tag from the deploy board",
			},
		],
	},
	{
		id: "empty-and-whitespace-noise",
		description: "Empty / whitespace hits must not invent prompt lines",
		expectedTexts: ["Keep this fact"],
		chunkOnlyTexts: [],
		results: [
			{ memory: "Keep this fact" },
			{ memory: "   " },
			{ chunk: "" },
			{},
		],
	},
]

export type FormatterMetrics = {
	undefinedLines: number
	usableLines: number
	recoveredExpected: number
	recoveredChunkOnly: number
	expectedTotal: number
	chunkOnlyTotal: number
}

export type FixtureEvalResult = {
	id: string
	description: string
	legacy: FormatterMetrics
	next: FormatterMetrics
	legacyLines: string[]
	nextLines: string[]
}

function countMatches(lines: string[], needles: string[]): number {
	return needles.filter((needle) => lines.some((line) => line.includes(needle)))
		.length
}

export function scoreFormatter(
	lines: string[],
	fixture: HybridRecallFixture,
): FormatterMetrics {
	const undefinedLines = lines.filter((line) =>
		/\bundefined\b/.test(line),
	).length
	const usableLines = lines.filter(
		(line) =>
			!/\bundefined\b/.test(line) &&
			line.replace(/^\d+\.\s*/, "").trim().length > 0,
	).length

	return {
		undefinedLines,
		usableLines,
		recoveredExpected: countMatches(lines, fixture.expectedTexts),
		recoveredChunkOnly: countMatches(lines, fixture.chunkOnlyTexts),
		expectedTotal: fixture.expectedTexts.length,
		chunkOnlyTotal: fixture.chunkOnlyTexts.length,
	}
}

export function evaluateHybridRecallFixtures(
	fixtures: HybridRecallFixture[] = HYBRID_RECALL_FIXTURES,
): FixtureEvalResult[] {
	return fixtures.map((fixture) => {
		const legacyLines = formatSearchHitsLegacy(fixture.results)
		const nextLines = formatSearchHitsForPrompt(fixture.results)
		return {
			id: fixture.id,
			description: fixture.description,
			legacy: scoreFormatter(legacyLines, fixture),
			next: scoreFormatter(nextLines, fixture),
			legacyLines,
			nextLines,
		}
	})
}

export type EvalSummary = {
	requestUsesHybrid: boolean
	fixtureCount: number
	legacyUndefinedLines: number
	nextUndefinedLines: number
	legacyChunkRecovery: number
	nextChunkRecovery: number
	chunkOnlyTotal: number
	legacyExpectedRecovery: number
	nextExpectedRecovery: number
	expectedTotal: number
	results: FixtureEvalResult[]
}

export function summarizeHybridRecallEval(
	results: FixtureEvalResult[] = evaluateHybridRecallFixtures(),
): EvalSummary {
	const body = buildSearchMemoriesBody("eval query")
	const sum = (pick: (row: FixtureEvalResult) => number) =>
		results.reduce((total, row) => total + pick(row), 0)

	return {
		requestUsesHybrid: body.searchMode === "hybrid",
		fixtureCount: results.length,
		legacyUndefinedLines: sum((row) => row.legacy.undefinedLines),
		nextUndefinedLines: sum((row) => row.next.undefinedLines),
		legacyChunkRecovery: sum((row) => row.legacy.recoveredChunkOnly),
		nextChunkRecovery: sum((row) => row.next.recoveredChunkOnly),
		chunkOnlyTotal: sum((row) => row.next.chunkOnlyTotal),
		legacyExpectedRecovery: sum((row) => row.legacy.recoveredExpected),
		nextExpectedRecovery: sum((row) => row.next.recoveredExpected),
		expectedTotal: sum((row) => row.next.expectedTotal),
		results,
	}
}

/** Returns failure messages; empty array means PASS. */
export function assertHybridRecallPass(summary: EvalSummary): string[] {
	const failures: string[] = []

	if (!summary.requestUsesHybrid) {
		failures.push("search body must set searchMode: hybrid")
	}
	if (summary.nextUndefinedLines !== 0) {
		failures.push(
			`new formatter still emits undefined lines (${summary.nextUndefinedLines})`,
		)
	}
	if (summary.legacyUndefinedLines === 0) {
		failures.push(
			"legacy formatter produced no undefined lines — fixture no longer proves the gap",
		)
	}
	if (summary.nextChunkRecovery !== summary.chunkOnlyTotal) {
		failures.push(
			`chunk recovery ${summary.nextChunkRecovery}/${summary.chunkOnlyTotal}`,
		)
	}
	if (summary.legacyChunkRecovery !== 0) {
		failures.push(
			`legacy unexpectedly recovered chunk-only text (${summary.legacyChunkRecovery})`,
		)
	}
	if (summary.nextExpectedRecovery !== summary.expectedTotal) {
		failures.push(
			`expected-text recovery ${summary.nextExpectedRecovery}/${summary.expectedTotal}`,
		)
	}
	if (summary.nextExpectedRecovery <= summary.legacyExpectedRecovery) {
		failures.push(
			`new recovery (${summary.nextExpectedRecovery}) did not beat legacy (${summary.legacyExpectedRecovery})`,
		)
	}

	return failures
}

export function renderHybridRecallReport(summary: EvalSummary): string {
	const lines: string[] = [
		"Hybrid recall evaluation",
		"========================",
		`fixtures: ${summary.fixtureCount}`,
		`request searchMode hybrid: ${summary.requestUsesHybrid}`,
		"",
		"Aggregate",
		"---------",
		`undefined lines   legacy=${summary.legacyUndefinedLines}  next=${summary.nextUndefinedLines}`,
		`chunk-only recall legacy=${summary.legacyChunkRecovery}/${summary.chunkOnlyTotal}  next=${summary.nextChunkRecovery}/${summary.chunkOnlyTotal}`,
		`expected recall   legacy=${summary.legacyExpectedRecovery}/${summary.expectedTotal}  next=${summary.nextExpectedRecovery}/${summary.expectedTotal}`,
		"",
	]

	for (const row of summary.results) {
		lines.push(`## ${row.id}`)
		lines.push(row.description)
		lines.push(
			`legacy: undef=${row.legacy.undefinedLines} usable=${row.legacy.usableLines} chunks=${row.legacy.recoveredChunkOnly}/${row.legacy.chunkOnlyTotal}`,
		)
		lines.push(
			`next:   undef=${row.next.undefinedLines} usable=${row.next.usableLines} chunks=${row.next.recoveredChunkOnly}/${row.next.chunkOnlyTotal}`,
		)
		lines.push("legacy prompt:")
		for (const line of row.legacyLines) lines.push(`  ${JSON.stringify(line)}`)
		lines.push("next prompt:")
		for (const line of row.nextLines) lines.push(`  ${JSON.stringify(line)}`)
		lines.push("")
	}

	const failures = assertHybridRecallPass(summary)
	if (failures.length === 0) {
		lines.push(
			"PASS: new path recovers all fixture context; legacy gap confirmed.",
		)
	} else {
		lines.push("FAIL:")
		for (const failure of failures) lines.push(`  - ${failure}`)
	}

	return lines.join("\n")
}

if (import.meta.main) {
	const summary = summarizeHybridRecallEval()
	console.log(renderHybridRecallReport(summary))
	if (assertHybridRecallPass(summary).length > 0) process.exit(1)
}
