/**
 * Stable, content-defined chunking for living documents.
 *
 * Motivation (supermemoryai/supermemory#1649): fixed-position chunking turns a
 * one-paragraph mid-file edit into a full-document re-embed, because every
 * downstream chunk boundary shifts and per-chunk content-hash reuse never hits.
 * This module chunks so that an edit only invalidates the chunk(s) it touches:
 *
 * - Structural resync points: markdown headings and fenced code blocks are
 *   never merged across, so an edit in one section cannot shift boundaries in
 *   another section.
 * - Content-defined cuts: within a section, boundaries fall on sentence (or
 *   code-line) units whose cut decision depends on the unit's own content hash
 *   (FastCDC-style anchoring), so boundaries re-synchronize a few units after
 *   an edit instead of shifting to the end of the document.
 *
 * Pair with {@link planChunkReuse} on the document upsert path: compare the
 * new chunk list against the stored chunks by content hash (not by position)
 * and embed only {@link ReusePlan.embedIndices}.
 *
 * Zero dependencies and pure TypeScript so it runs in Node, Bun, and
 * Cloudflare Workers (no `node:crypto`, no async hashing).
 */

export interface StableChunkOptions {
	/**
	 * Cut after a unit whose hash satisfies `hash % anchorModulo === 0`.
	 * Lower values produce smaller, more numerous chunks. Defaults to 8
	 * (averages ~8 sentences per chunk).
	 */
	anchorModulo?: number
	/** Minimum sentences (or code lines) per chunk. Defaults to 2. */
	minSentences?: number
	/** Maximum sentences (or code lines) per chunk. Defaults to 16. */
	maxSentences?: number
	/** Hard cap on chunk characters; oversized sentences are word-split. Defaults to 4000. */
	maxChars?: number
	/**
	 * Trailing sentences of the previous chunk repeated for context.
	 * Matches the documented 2-sentence overlap. Overlap is restricted to the
	 * same section so sections stay independent. Defaults to 2.
	 */
	overlapSentences?: number
}

export interface StableChunk {
	/** Final chunk text, prefixed with its section heading when present. */
	content: string
	/** 64-bit FNV-1a hex digest of `content`; the reuse/identity key. */
	hash: string
	/** Markdown heading this chunk belongs to, or null for lead-in content. */
	heading: string | null
	/** Sequential position within the document. */
	position: number
}

const DEFAULT_ANCHOR_MODULO = 8
const DEFAULT_MIN_SENTENCES = 2
const DEFAULT_MAX_SENTENCES = 16
const DEFAULT_MAX_CHARS = 4000
const DEFAULT_OVERLAP_SENTENCES = 2

/** 64-bit FNV-1a via two 32-bit lanes. Non-cryptographic; for change detection only. */
export function hashContent(text: string): string {
	let h1 = 0x811c9dc5
	let h2 = 0x811c9dc5 ^ 0x9e3779b9
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i)
		h1 = Math.imul(h1 ^ code, 0x01000193)
		h2 = Math.imul(h2 ^ code, 0x01000193)
	}
	return (
		(h1 >>> 0).toString(16).padStart(8, "0") +
		(h2 >>> 0).toString(16).padStart(8, "0")
	)
}

function fnv1a32(text: string): number {
	let h = 0x811c9dc5
	for (let i = 0; i < text.length; i++) {
		h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
	}
	return h >>> 0
}

interface Section {
	heading: string | null
	body: string
	code: boolean
}

function isFenceStart(line: string): boolean {
	const trimmed = line.trimStart()
	return trimmed.startsWith("```") || trimmed.startsWith("~~~")
}

function isHeading(line: string): boolean {
	return /^#{1,6}(?:\s|$)/.test(line.trimStart())
}

/**
 * Split markdown into independent sections. Headings open a new section and
 * fenced code blocks become their own sections so an edit inside one region
 * can never shift chunk boundaries in another.
 */
function splitSections(markdown: string): Section[] {
	const sections: Section[] = []
	const lines = markdown.replace(/\r\n?/g, "\n").split("\n")
	let heading: string | null = null
	let prose: string[] = []
	let fence: string[] | null = null

	const flushProse = () => {
		const body = prose.join("\n").trim()
		prose = []
		if (body.length > 0) {
			sections.push({ heading, body, code: false })
		}
	}

	for (const line of lines) {
		if (fence !== null) {
			fence.push(line)
			if (isFenceStart(line)) {
				sections.push({ heading, body: fence.join("\n"), code: true })
				fence = null
			}
			continue
		}
		if (isFenceStart(line)) {
			flushProse()
			fence = [line]
			continue
		}
		if (isHeading(line)) {
			flushProse()
			heading = line.trim()
			continue
		}
		prose.push(line)
	}
	if (fence !== null) {
		// Unclosed fence: keep the lines rather than dropping content.
		sections.push({ heading, body: fence.join("\n"), code: true })
	}
	flushProse()
	return sections
}

function isDigit(char: string | undefined): boolean {
	return char !== undefined && char >= "0" && char <= "9"
}

const CLOSERS = new Set(['"', "'", "”", "’", ")", "]"])

/**
 * Split a paragraph into sentences. Tuned for determinism and stability (same
 * input always yields the same splits; an edit only affects nearby splits),
 * not linguistic perfection.
 */
function splitSentences(paragraph: string): string[] {
	const clean = paragraph.replace(/\s+/g, " ").trim()
	if (clean.length === 0) {
		return []
	}
	const sentences: string[] = []
	let start = 0
	let i = 0
	while (i < clean.length) {
		const char = clean[i]
		if (char !== "." && char !== "!" && char !== "?" && char !== "…") {
			i++
			continue
		}
		const prev = i > 0 ? clean[i - 1] : undefined
		const next = i + 1 < clean.length ? clean[i + 1] : undefined
		// Skip decimals ("3.14") and ellipsis runs ("...").
		if (char === "." && isDigit(prev) && isDigit(next)) {
			i++
			continue
		}
		if (char === "." && next === ".") {
			i++
			continue
		}
		// Consume closing quotes/brackets, then require whitespace or end.
		let end = i + 1
		while (end < clean.length && CLOSERS.has(clean[end] ?? "")) {
			end++
		}
		if (end < clean.length && clean[end] !== " ") {
			i++
			continue
		}
		const sentence = clean.slice(start, end).trim()
		if (sentence.length > 0) {
			sentences.push(sentence)
		}
		let nextStart = end
		while (nextStart < clean.length && clean[nextStart] === " ") {
			nextStart++
		}
		start = nextStart
		i = nextStart
	}
	const tail = clean.slice(start).trim()
	if (tail.length > 0) {
		sentences.push(tail)
	}
	return sentences
}

/** Word-split an oversized unit so no chunk exceeds `maxChars`. */
function splitLongText(text: string, maxChars: number): string[] {
	if (text.length <= maxChars) {
		return [text]
	}
	const pieces: string[] = []
	let current = ""
	for (const word of text.split(/\s+/)) {
		if (word.length === 0) {
			continue
		}
		if (word.length > maxChars) {
			if (current.length > 0) {
				pieces.push(current)
				current = ""
			}
			for (let at = 0; at < word.length; at += maxChars) {
				pieces.push(word.slice(at, at + maxChars))
			}
			continue
		}
		const candidate = current.length === 0 ? word : `${current} ${word}`
		if (candidate.length > maxChars) {
			pieces.push(current)
			current = word
		} else {
			current = candidate
		}
	}
	if (current.length > 0) {
		pieces.push(current)
	}
	return pieces.length > 0 ? pieces : [text]
}

interface Unit {
	text: string
	spaceBefore: string
}

function unitsForSection(section: Section, maxChars: number): Unit[] {
	const units: Unit[] = []
	const push = (text: string, spaceBefore: string) => {
		for (const piece of splitLongText(text, maxChars)) {
			units.push({
				text: piece,
				spaceBefore: units.length === 0 ? "" : spaceBefore,
			})
		}
	}
	if (section.code) {
		for (const line of section.body.split("\n")) {
			const text = line.trimEnd()
			if (text.trim().length === 0) {
				continue
			}
			push(text, "\n")
		}
		return units
	}
	const paragraphs = section.body
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => paragraph.length > 0)
	for (const paragraph of paragraphs) {
		let firstInParagraph = true
		for (const sentence of splitSentences(paragraph)) {
			push(sentence, firstInParagraph ? "\n\n" : " ")
			firstInParagraph = false
		}
	}
	return units
}

function renderChunk(
	heading: string | null,
	overlap: Unit[],
	units: Unit[],
): string {
	let content = heading !== null ? `${heading}\n\n` : ""
	const all = [...overlap, ...units]
	all.forEach((unit, index) => {
		content += `${index === 0 ? "" : unit.spaceBefore}${unit.text}`
	})
	return content
}

/**
 * Chunk markdown into stable, content-defined pieces.
 *
 * Boundaries always fall on sentence (prose) or line (code) edges and never
 * cross a heading or fenced code block, so a mid-file edit only changes the
 * chunk(s) covering the edit. Re-chunking an edited document yields
 * byte-identical content for every untouched region, letting
 * {@link planChunkReuse} skip re-embedding them.
 */
export function stableChunkText(
	markdown: string,
	options: StableChunkOptions = {},
): StableChunk[] {
	const anchorModulo = Math.max(
		1,
		options.anchorModulo ?? DEFAULT_ANCHOR_MODULO,
	)
	const minSentences = Math.max(
		1,
		options.minSentences ?? DEFAULT_MIN_SENTENCES,
	)
	const maxSentences = Math.max(
		minSentences,
		options.maxSentences ?? DEFAULT_MAX_SENTENCES,
	)
	const maxChars = Math.max(256, options.maxChars ?? DEFAULT_MAX_CHARS)
	const overlapSentences = Math.max(
		0,
		options.overlapSentences ?? DEFAULT_OVERLAP_SENTENCES,
	)

	const chunks: StableChunk[] = []
	for (const section of splitSections(markdown)) {
		const units = unitsForSection(section, maxChars)
		if (units.length === 0) {
			continue
		}
		const runs: Unit[][] = []
		let run: Unit[] = []
		let runChars = 0
		let unitIndex = 0
		for (const unit of units) {
			const isLast = unitIndex === units.length - 1
			unitIndex++
			run.push(unit)
			runChars += unit.text.length
			const anchor = fnv1a32(unit.text) % anchorModulo === 0
			if (
				!isLast &&
				run.length >= minSentences &&
				(run.length >= maxSentences || runChars >= maxChars || anchor)
			) {
				runs.push(run)
				run = []
				runChars = 0
			}
		}
		if (run.length > 0) {
			runs.push(run)
		}
		let previousRun: Unit[] = []
		for (const currentRun of runs) {
			const overlap =
				previousRun.length === 0 ? [] : previousRun.slice(-overlapSentences)
			const content = renderChunk(section.heading, overlap, currentRun)
			chunks.push({
				content,
				hash: hashContent(content),
				heading: section.heading,
				position: chunks.length,
			})
			previousRun = currentRun
		}
	}
	return chunks
}

export type ChunkLike =
	| string
	| { content: string; hash?: string }
	| { hash: string }

function chunkHash(chunk: ChunkLike): string {
	if (typeof chunk === "string") {
		return hashContent(chunk)
	}
	if ("hash" in chunk && typeof chunk.hash === "string") {
		return chunk.hash
	}
	return hashContent((chunk as { content: string }).content)
}

export interface ChunkReuse {
	newIndex: number
	oldIndex: number
}

export interface ReusePlan {
	/** New chunks whose content already exists; carry over the old embedding. */
	reused: ChunkReuse[]
	/** Indices into the NEW chunk list that actually need embedding. */
	embedIndices: number[]
	reusedCount: number
	embedCount: number
}

/**
 * Anchor-based resync between an old and a new chunk list.
 *
 * Matches by content hash instead of position, so a mid-file insertion or
 * deletion no longer invalidates every downstream chunk: unchanged chunks hit
 * regardless of where they moved. Duplicate contents are paired FIFO so each
 * stored embedding is reused at most once. Runs in O(old + new).
 */
export function planChunkReuse(
	oldChunks: ChunkLike[],
	newChunks: ChunkLike[],
): ReusePlan {
	const available = new Map<string, number[]>()
	oldChunks.forEach((chunk, oldIndex) => {
		const hash = chunkHash(chunk)
		const queue = available.get(hash)
		if (queue !== undefined) {
			queue.push(oldIndex)
		} else {
			available.set(hash, [oldIndex])
		}
	})
	const reused: ChunkReuse[] = []
	const embedIndices: number[] = []
	newChunks.forEach((chunk, newIndex) => {
		const queue = available.get(chunkHash(chunk))
		const oldIndex = queue?.shift()
		if (oldIndex === undefined) {
			embedIndices.push(newIndex)
		} else {
			reused.push({ newIndex, oldIndex })
		}
	})
	return {
		reused,
		embedIndices,
		reusedCount: reused.length,
		embedCount: embedIndices.length,
	}
}
