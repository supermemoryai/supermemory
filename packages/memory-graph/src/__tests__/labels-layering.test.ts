/**
 * Tests for configurable labels and hover popover layering.
 *
 * Follows the same pattern as node-hover-popover.test.tsx: source-code
 * assertions plus pure-logic tests on the exported defaults and merge
 * behaviour, since hook-bearing components can't be mounted in this
 * workspace's vitest environment.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { DEFAULT_HOVER_POPOVER_Z_INDEX, DEFAULT_LABELS } from "../constants"
import type { MemoryGraphLabels, ResolvedMemoryGraphLabels } from "../types"

const popoverSrc = readFileSync(
	resolve(__dirname, "../components/node-hover-popover.tsx"),
	"utf-8",
)
const legendSrc = readFileSync(
	resolve(__dirname, "../components/legend.tsx"),
	"utf-8",
)
const graphSrc = readFileSync(
	resolve(__dirname, "../components/memory-graph.tsx"),
	"utf-8",
)
const indexSrc = readFileSync(resolve(__dirname, "../index.tsx"), "utf-8")
const loadingSrc = readFileSync(
	resolve(__dirname, "../components/loading-indicator.tsx"),
	"utf-8",
)

describe("DEFAULT_LABELS — preserves original copy", () => {
	it("matches every previously hardcoded string", () => {
		expect(DEFAULT_LABELS.documentGroup).toBe("Documents")
		expect(DEFAULT_LABELS.documentTypeFallback).toBe("document")
		expect(DEFAULT_LABELS.documentSourceEdge).toBe("Document source")
		expect(DEFAULT_LABELS.documentToMemoryEdge).toBe("Document to memory")
		expect(DEFAULT_LABELS.documentIdLabel).toBe("Document")
		expect(DEFAULT_LABELS.viewDocument).toBe("View document")
		expect(DEFAULT_LABELS.goToDocument).toBe("Go to document")
		expect(DEFAULT_LABELS.nextDocument).toBe("Next document")
		expect(DEFAULT_LABELS.previousDocument).toBe("Prev document")
		expect(DEFAULT_LABELS.showMemory).toBe("Go to memory")
	})

	it("memoryCount formats counts like the original template", () => {
		expect(DEFAULT_LABELS.memoryCount(0)).toBe("0 memories")
		expect(DEFAULT_LABELS.memoryCount(5)).toBe("5 memories")
	})

	it("loadingMoreDocuments formats counts like the original template", () => {
		expect(DEFAULT_LABELS.loadingMoreDocuments(12)).toBe(
			"Loading more documents... (12)",
		)
	})
})

describe("label merge — partial overrides win, defaults fill the rest", () => {
	it("spread merge overrides only the provided keys", () => {
		const overrides: MemoryGraphLabels = {
			documentGroup: "Sources",
			viewDocument: "View source",
		}
		const resolved: ResolvedMemoryGraphLabels = {
			...DEFAULT_LABELS,
			...overrides,
		}
		expect(resolved.documentGroup).toBe("Sources")
		expect(resolved.viewDocument).toBe("View source")
		expect(resolved.nextDocument).toBe("Next document")
		expect(resolved.memoryCount(3)).toBe("3 memories")
	})

	it("custom memoryCount function replaces the default", () => {
		const resolved: ResolvedMemoryGraphLabels = {
			...DEFAULT_LABELS,
			memoryCount: (count) => `${count} facts`,
		}
		expect(resolved.memoryCount(2)).toBe("2 facts")
	})
})

describe("hover popover layering", () => {
	it("default z-index stays at the previous hardcoded value", () => {
		expect(DEFAULT_HOVER_POPOVER_Z_INDEX).toBe(100)
	})

	it("popover overlay uses the zIndex prop, not a literal", () => {
		expect(popoverSrc).not.toContain("zIndex: 100")
		const overlayIdx = popoverSrc.indexOf("const overlayStyle")
		const overlayEnd = popoverSrc.indexOf("}", overlayIdx)
		expect(popoverSrc.slice(overlayIdx, overlayEnd)).toContain("zIndex,")
	})

	it("popover defaults zIndex to DEFAULT_HOVER_POPOVER_Z_INDEX", () => {
		expect(popoverSrc).toContain("zIndex = DEFAULT_HOVER_POPOVER_Z_INDEX")
	})

	it("MemoryGraph resolves layering.hoverPopoverZIndex with fallback", () => {
		expect(graphSrc).toContain(
			"layering?.hoverPopoverZIndex ?? DEFAULT_HOVER_POPOVER_Z_INDEX",
		)
		expect(graphSrc).toContain("zIndex={hoverPopoverZIndex}")
	})
})

describe("no user-facing document strings remain hardcoded", () => {
	it("popover uses labels for all document-facing copy", () => {
		expect(popoverSrc).not.toContain('"View document"')
		expect(popoverSrc).not.toContain('"Go to document"')
		expect(popoverSrc).not.toContain('"Next document"')
		expect(popoverSrc).not.toContain('"Prev document"')
		expect(popoverSrc).not.toContain('label="Document"')
		expect(popoverSrc).not.toContain('|| "document"')
		expect(popoverSrc).toContain("labels.documentTypeFallback")
		expect(popoverSrc).toContain("labels.memoryCount(")
		expect(popoverSrc).toContain("labels.documentIdLabel")
		expect(popoverSrc).toContain("labels.viewDocument")
		expect(popoverSrc).toContain("labels.goToDocument")
		expect(popoverSrc).toContain("labels.showMemory")
		expect(popoverSrc).toContain("labels.nextDocument")
		expect(popoverSrc).toContain("labels.previousDocument")
	})

	it("legend uses labels for group and edge copy", () => {
		expect(legendSrc).not.toContain('label="Documents"')
		expect(legendSrc).not.toContain("Document source</span>")
		expect(legendSrc).not.toContain("Document to memory")
		expect(legendSrc).toContain("labels.documentGroup")
		expect(legendSrc).toContain("labels.documentSourceEdge")
		expect(legendSrc).toContain("labels.documentToMemoryEdge")
	})

	it("loading indicator uses labels for the loading-more copy", () => {
		expect(loadingSrc).not.toContain("Loading more documents")
		expect(loadingSrc).toContain("labels.loadingMoreDocuments(totalLoaded)")
	})

	it("MemoryGraph merges label overrides and passes them down", () => {
		expect(graphSrc).toContain("{ ...DEFAULT_LABELS, ...labelOverrides }")
		expect(graphSrc).toContain("labels={resolvedLabels}")
	})
})

describe("public API exports", () => {
	it("index exports the new constants and types", () => {
		expect(indexSrc).toContain("DEFAULT_LABELS")
		expect(indexSrc).toContain("DEFAULT_HOVER_POPOVER_Z_INDEX")
		expect(indexSrc).toContain("MemoryGraphLabels")
		expect(indexSrc).toContain("MemoryGraphLayering")
	})
})
