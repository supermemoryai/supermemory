import { describe, expect, it } from "vitest"
import { hashContent, planChunkReuse, stableChunkText } from "./stable-chunking"

/** Deterministic PRNG so the corpus is identical on every run. */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0
	return () => {
		state = (state + 0x6d2b79f5) >>> 0
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const WORDS = (
	"amber beacon cedar delta ember frost grove harbor inlet juniper ridge " +
	"meadow north ocean prairie quartz river stone timber under vale wheat " +
	"yield zephyr ledger motif novel orbit pixel quota relay surge token unity " +
	"vivid wander xenon yearn anchor bloom crest dune eddy field glide heath " +
	"ivory jolt knoll lumen marsh notch opal plume quill rocky solar tango umber"
).split(" ")

function pickWord(rng: () => number): string {
	return WORDS[Math.floor(rng() * WORDS.length)] ?? "word"
}

function makeSentence(rng: () => number): string {
	const count = 8 + Math.floor(rng() * 9)
	const words: string[] = []
	for (let i = 0; i < count; i++) {
		words.push(pickWord(rng))
	}
	const first = words[0] ?? "word"
	const sentence = `${first.charAt(0).toUpperCase()}${first.slice(1)} ${words.slice(1).join(" ")}`
	const ender = rng()
	return sentence + (ender < 0.85 ? "." : ender < 0.95 ? "?" : "!")
}

function makeParagraph(rng: () => number, sentences: number): string {
	const parts: string[] = []
	for (let i = 0; i < sentences; i++) {
		parts.push(makeSentence(rng))
	}
	return parts.join(" ")
}

const MID_FILE_MARKER =
	"The quick brown fox marker sentence for mid-file edit testing purposes."

function buildDocument(): string {
	const rng = mulberry32(1649)
	const sections: string[] = [`# Reference manual\n\n${makeParagraph(rng, 4)}`]
	for (let s = 0; s < 30; s++) {
		const paragraphs: string[] = []
		for (let p = 0; p < 5; p++) {
			paragraphs.push(makeParagraph(rng, 4))
		}
		if (s === 14) {
			// Known sentence in the middle of the document for edit tests.
			paragraphs[2] = `${makeSentence(rng)} ${MID_FILE_MARKER} ${makeSentence(rng)}`
		}
		if (s === 20) {
			paragraphs.push(
				"```ts\nconst alpha = 1\nconst beta = alpha + 2\nconsole.log(beta)\n```",
			)
		}
		sections.push(
			`## Section ${s + 1} operations\n\n${paragraphs.join("\n\n")}`,
		)
	}
	return `${sections.join("\n\n")}\n`
}

/** Positional fixed-size chunking: the behavior reported in the issue. */
function naiveFixedChunks(text: string, size = 500): string[] {
	const chunks: string[] = []
	for (let at = 0; at < text.length; at += size) {
		chunks.push(text.slice(at, at + size))
	}
	return chunks
}

describe("stableChunkText", () => {
	it("is deterministic", () => {
		const doc = buildDocument()
		expect(stableChunkText(doc)).toEqual(stableChunkText(doc))
	})

	it("assigns sequential positions and content hashes", () => {
		const chunks = stableChunkText(buildDocument())
		expect(chunks.length).toBeGreaterThan(20)
		chunks.forEach((chunk, index) => {
			expect(chunk.position).toBe(index)
			expect(chunk.hash).toBe(hashContent(chunk.content))
		})
	})

	it("handles edge cases without throwing", () => {
		expect(stableChunkText("")).toEqual([])
		expect(stableChunkText("   \n\n  ")).toEqual([])
		expect(stableChunkText("Single sentence here.")).toHaveLength(1)
	})

	it("keeps fenced code lines intact", () => {
		const chunks = stableChunkText(buildDocument())
		for (const line of ["const alpha = 1", "const beta = alpha + 2"]) {
			expect(chunks.some((chunk) => chunk.content.includes(line))).toBe(true)
		}
	})

	it("cuts prose on sentence boundaries", () => {
		const prose = `${makeParagraph(mulberry32(7), 40)}\n\n${makeParagraph(mulberry32(8), 40)}`
		for (const chunk of stableChunkText(prose)) {
			expect(chunk.content).toMatch(/[.!?…]["'”’)\]]?$/)
		}
	})
})

describe("issue #1649: mid-file edits", () => {
	it("only invalidates local chunks for a mid-file sentence replacement", () => {
		const doc = buildDocument()
		const before = stableChunkText(doc)
		const edited = doc.replace(
			MID_FILE_MARKER,
			"A completely rewritten sentence about zebra migration patterns across the southern valley region.",
		)
		const after = stableChunkText(edited)
		const plan = planChunkReuse(before, after)

		expect(plan.reusedCount).toBeGreaterThanOrEqual(before.length - 4)
		expect(plan.embedCount).toBeLessThanOrEqual(6)
		expect(plan.reusedCount / before.length).toBeGreaterThan(0.9)
	})

	it("only invalidates local chunks for a mid-file paragraph insertion", () => {
		const doc = buildDocument()
		const before = stableChunkText(doc)
		const insertion = `\n\n${makeParagraph(mulberry32(99), 4)}\n\n`
		const edited = doc.replace(
			MID_FILE_MARKER,
			`${MID_FILE_MARKER}${insertion}`,
		)
		const after = stableChunkText(edited)
		const plan = planChunkReuse(before, after)

		// New content must embed, but every untouched old chunk is reused.
		expect(plan.reusedCount).toBeGreaterThanOrEqual(before.length - 4)
		expect(plan.embedCount).toBeLessThanOrEqual(8)
	})

	it("reproduces the bug with naive fixed-size chunking", () => {
		const doc = buildDocument()
		const edited = doc.replace(
			MID_FILE_MARKER,
			"A completely rewritten sentence about zebra migration patterns across the southern valley region.",
		)
		const before = naiveFixedChunks(doc)
		const after = naiveFixedChunks(edited)
		const plan = planChunkReuse(before, after)

		// The downstream boundary shift defeats hash reuse for most chunks.
		expect(plan.reusedCount).toBeLessThan(before.length * 0.5)
		expect(plan.embedCount).toBeGreaterThan(before.length * 0.5)
	})

	it("reuses everything on append-only edits", () => {
		const doc = buildDocument()
		const before = stableChunkText(doc)
		const appended = `${doc}\n\n## Section 31 appendix\n\n${makeParagraph(mulberry32(100), 6)}\n`
		const after = stableChunkText(appended)
		const plan = planChunkReuse(before, after)

		expect(plan.reusedCount).toBe(before.length)
		expect(plan.embedCount).toBeLessThanOrEqual(5)
	})

	it("embeds nothing new when a section is deleted", () => {
		const doc = buildDocument()
		const before = stableChunkText(doc)
		const sectionStart = doc.indexOf("## Section 15 operations")
		const sectionEnd = doc.indexOf("## Section 16 operations")
		const edited = doc.slice(0, sectionStart) + doc.slice(sectionEnd)
		const after = stableChunkText(edited)
		const plan = planChunkReuse(before, after)

		expect(plan.embedCount).toBe(0)
		expect(plan.reusedCount).toBe(after.length)
	})
})

describe("planChunkReuse", () => {
	it("matches by content hash, not position", () => {
		const plan = planChunkReuse(["a", "b", "c"], ["x", "b", "c", "a"])
		expect(plan.embedIndices).toEqual([0])
		expect(plan.reusedCount).toBe(3)
	})

	it("pairs duplicates FIFO so each embedding is reused once", () => {
		const plan = planChunkReuse(["a", "b", "a"], ["a", "a", "b"])
		expect(plan.embedCount).toBe(0)
		expect(plan.reusedCount).toBe(3)
		const reusedOld = plan.reused.map((entry) => entry.oldIndex).sort()
		expect(reusedOld).toEqual([0, 1, 2])
	})

	it("accepts chunk objects with precomputed hashes", () => {
		const oldChunks = stableChunkText(buildDocument())
		const plan = planChunkReuse(oldChunks, oldChunks)
		expect(plan.embedCount).toBe(0)
		expect(plan.reusedCount).toBe(oldChunks.length)
	})
})

describe("hashContent", () => {
	it("is stable, 16 hex chars, and sensitive to changes", () => {
		expect(hashContent("hello")).toBe(hashContent("hello"))
		expect(hashContent("hello")).toMatch(/^[0-9a-f]{16}$/)
		expect(hashContent("hello")).not.toBe(hashContent("hello!"))
	})
})
