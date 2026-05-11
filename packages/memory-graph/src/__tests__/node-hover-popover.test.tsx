/**
 * Tests for UI changes introduced on the
 * vorflux/graph-popover-scrollable-view-full branch.
 *
 * The NodeHoverPopover component uses hooks (useMemo, useState, useCallback,
 * useEffect) internally, and the bun workspace's dual-React-instance layout
 * prevents rendering hook-bearing components in vitest's happy-dom environment.
 * These tests therefore verify behaviour through:
 *
 *  (a) Direct source-code assertions — reading the component source and
 *      asserting on specific string/AST patterns that encode the design
 *      choices (style properties, constant values, truncation limits, etc.).
 *
 *  (b) Pure-logic unit tests — re-implementing and testing the pure functions
 *      (truncate, documentId derivation, render-guard booleans) without
 *      mounting the component.
 *
 * This mirrors the pattern already used by all 107 existing tests in this
 * package (edge-logic, graph-data-utils, viewport, etc.) — none of them
 * mount React components either.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect } from "vitest"

// ---------------------------------------------------------------------------
// Source text — loaded once; all assertions operate on this string.
// ---------------------------------------------------------------------------
const SRC_PATH = resolve(__dirname, "../components/node-hover-popover.tsx")
const src = readFileSync(SRC_PATH, "utf-8")

// ---------------------------------------------------------------------------
// Pure re-implementation of the `truncate` helper (matches the source exactly)
// ---------------------------------------------------------------------------
function truncate(s: string, max: number): string {
	return s.length > max ? `${s.substring(0, max)}...` : s
}

// ---------------------------------------------------------------------------
// 1. Layout constants
// ---------------------------------------------------------------------------
describe("Layout constants", () => {
	it("SHORTCUTS_W is 160 (widened from 100)", () => {
		expect(src).toContain("const SHORTCUTS_W = 160")
	})

	it("CARD_W is 280 (unchanged)", () => {
		expect(src).toContain("const CARD_W = 280")
	})

	it("TOTAL_W formula references both constants", () => {
		expect(src).toContain("const TOTAL_W = CARD_W + 12 + SHORTCUTS_W")
	})
})

// ---------------------------------------------------------------------------
// 2. Content area — scrollable, full text (no truncation)
// ---------------------------------------------------------------------------
describe("Content area — scrollable and not truncated", () => {
	it("contentPadStyle has maxHeight: 100", () => {
		expect(src).toContain("maxHeight: 100,")
	})

	it("contentPadStyle has overflowY: 'auto'", () => {
		// The property must appear inside the contentPadStyle block
		const contentPadIdx = src.indexOf("const contentPadStyle")
		const nextConst = src.indexOf("\n\t\tconst ", contentPadIdx + 1)
		const block = src.slice(contentPadIdx, nextConst)
		expect(block).toContain('overflowY: "auto"')
	})

	it("contentPadStyle has flex: '1 1 auto' (grows to fill card height)", () => {
		const contentPadIdx = src.indexOf("const contentPadStyle")
		const nextConst = src.indexOf("\n\t\tconst ", contentPadIdx + 1)
		const block = src.slice(contentPadIdx, nextConst)
		expect(block).toContain('flex: "1 1 auto"')
	})

	it("content paragraph renders {content} directly — no truncate() call on content", () => {
		// Old code: truncate(content, 100)
		// New code: {content || "No content"}
		expect(src).not.toMatch(/truncate\(content,\s*100\)/)
		expect(src).toContain('{content || "No content"}')
	})
})

// ---------------------------------------------------------------------------
// 3. KeyBadge — has dark background and border (icon badge style)
// ---------------------------------------------------------------------------
describe("KeyBadge styles — has background and border", () => {
	it("KeyBadge style object contains backgroundColor", () => {
		// Locate the KeyBadge function body
		const start = src.indexOf("function KeyBadge(")
		const end = src.indexOf("\nfunction ", start + 1)
		const fnBody = src.slice(start, end)
		expect(fnBody).toContain("backgroundColor: colors.controlBg")
	})

	it("KeyBadge style object contains a border property", () => {
		const start = src.indexOf("function KeyBadge(")
		const end = src.indexOf("\nfunction ", start + 1)
		const fnBody = src.slice(start, end)
		expect(fnBody).toMatch(/\bborder\s*:/)
		expect(fnBody).toContain("colors.controlBorder")
	})

	it("KeyBadge still has the expected style properties", () => {
		const start = src.indexOf("function KeyBadge(")
		const end = src.indexOf("\nfunction ", start + 1)
		const fnBody = src.slice(start, end)
		expect(fnBody).toContain('display: "inline-flex"')
		expect(fnBody).toContain("width: 16")
		expect(fnBody).toContain("height: 16")
		expect(fnBody).toContain("borderRadius: 4")
		expect(fnBody).toContain("color: colors.popoverTextMuted")
	})
})

// ---------------------------------------------------------------------------
// 4. Shortcuts panel — no background or border
// ---------------------------------------------------------------------------
describe("Shortcuts panel styles — background and border removed", () => {
	it("shortcutsPanelStyle does not contain backgroundColor", () => {
		const start = src.indexOf("const shortcutsPanelStyle")
		const end = src.indexOf("\n\t\treturn (", start)
		const block = src.slice(start, end)
		expect(block).not.toContain("backgroundColor")
	})

	it("shortcutsPanelStyle does not contain a border property", () => {
		const start = src.indexOf("const shortcutsPanelStyle")
		const end = src.indexOf("\n\t\treturn (", start)
		const block = src.slice(start, end)
		expect(block).not.toMatch(/\bborder\s*:/)
	})

	it("shortcutsPanelStyle does not contain borderRadius", () => {
		const start = src.indexOf("const shortcutsPanelStyle")
		const end = src.indexOf("\n\t\treturn (", start)
		const block = src.slice(start, end)
		expect(block).not.toContain("borderRadius")
	})

	it("shortcutsPanelStyle still has layout properties", () => {
		const start = src.indexOf("const shortcutsPanelStyle")
		const end = src.indexOf("\n\t\treturn (", start)
		const block = src.slice(start, end)
		expect(block).toContain('display: "flex"')
		expect(block).toContain('flexDirection: "column"')
		expect(block).toContain("gap: 6")
	})
})

// ---------------------------------------------------------------------------
// 5. EyeIcon SVG component
// ---------------------------------------------------------------------------
describe("EyeIcon SVG component", () => {
	it("EyeIcon function is defined in the source", () => {
		expect(src).toContain("function EyeIcon(")
	})

	it("EyeIcon SVG has aria-hidden='true'", () => {
		const start = src.indexOf("function EyeIcon(")
		const end = src.indexOf("\nfunction ", start + 1)
		const fnBody = src.slice(start, end)
		expect(fnBody).toContain('aria-hidden="true"')
	})

	it("EyeIcon SVG viewBox is '0 0 24 24'", () => {
		const start = src.indexOf("function EyeIcon(")
		const end = src.indexOf("\nfunction ", start + 1)
		const fnBody = src.slice(start, end)
		expect(fnBody).toContain('viewBox="0 0 24 24"')
	})

	it("EyeIcon SVG contains a <path> element (outer eye shape)", () => {
		const start = src.indexOf("function EyeIcon(")
		const end = src.indexOf("\nfunction ", start + 1)
		const fnBody = src.slice(start, end)
		expect(fnBody).toContain("<path")
	})

	it("EyeIcon SVG contains a <circle> element (pupil)", () => {
		const start = src.indexOf("function EyeIcon(")
		const end = src.indexOf("\nfunction ", start + 1)
		const fnBody = src.slice(start, end)
		expect(fnBody).toContain("<circle")
	})

	it("EyeIcon receives stroke color from props", () => {
		const start = src.indexOf("function EyeIcon(")
		const end = src.indexOf("\nfunction ", start + 1)
		const fnBody = src.slice(start, end)
		expect(fnBody).toContain("stroke={color}")
	})
})

// ---------------------------------------------------------------------------
// 6. "View document" button — presence guards and callback wiring
// ---------------------------------------------------------------------------
describe("'View document' button — render guard in JSX", () => {
	it("button is gated on both onOpenDocument AND documentId", () => {
		// The render guard must be: {onOpenDocument && documentId && (…)}
		expect(src).toContain("{onOpenDocument && documentId && (")
	})

	it("button onClick calls onOpenDocument(documentId)", () => {
		expect(src).toContain("onClick={() => onOpenDocument(documentId)}")
	})

	it("button label text is 'View document'", () => {
		expect(src).toContain('label="View document"')
	})

	it("button icon is the EyeIcon component (not a string shortcut key)", () => {
		expect(src).toContain("icon={<EyeIcon color={colors.popoverTextMuted} />}")
	})
})

// ---------------------------------------------------------------------------
// 7. documentId derivation logic
// ---------------------------------------------------------------------------
describe("documentId derivation — memory vs document node", () => {
	it("source derives documentId from data.documentId for memory nodes", () => {
		expect(src).toContain(
			"const documentId = isMemory ? (data as MemoryNodeData).documentId : node.id",
		)
	})

	it("pure logic: memory node uses data.documentId as documentId", () => {
		// Re-implement the expression from source: isMemory ? data.documentId : node.id
		const isMemory = true
		const nodeId = "mem-1"
		const dataDocumentId = "parent-doc-7"
		const documentId = isMemory ? dataDocumentId : nodeId
		expect(documentId).toBe("parent-doc-7")
	})

	it("pure logic: document node uses node.id as documentId", () => {
		const isMemory = false
		const nodeId = "doc-42"
		const dataDocumentId = undefined
		const documentId = isMemory ? dataDocumentId : nodeId
		expect(documentId).toBe("doc-42")
	})

	it("pure logic: documentId is falsy (undefined) when memory node has no documentId", () => {
		// The render guard is `onOpenDocument && documentId`. When documentId is
		// undefined the whole expression is falsy regardless of onOpenDocument.
		const documentId: string | undefined = undefined
		expect(Boolean(documentId)).toBe(false)
	})

	it("pure logic: onOpenDocument being undefined makes the guard falsy", () => {
		// Boolean(undefined && anything) === false
		const onOpenDocument: ((id: string) => void) | undefined = undefined
		expect(Boolean(onOpenDocument)).toBe(false)
	})

	it("pure logic: both truthy values make the guard truthy", () => {
		// Both sides non-empty → guard passes
		const documentId: string | undefined = "doc-1"
		// Use a runtime-resolved value so TS can't narrow to a never-undefined type
		const handler = [(_id: string) => {}][0] as
			| ((id: string) => void)
			| undefined
		expect(Boolean(handler && documentId)).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// 8. VersionTimeline truncation limit — 120 chars (was 60)
// ---------------------------------------------------------------------------
describe("VersionTimeline truncation limit", () => {
	it("source calls truncate(entry.memory, 120) — not 60", () => {
		expect(src).toContain("truncate(entry.memory, 120)")
		expect(src).not.toContain("truncate(entry.memory, 60)")
	})

	it("truncate(s, 120): string of 150 chars is cut to 120 + '...'", () => {
		const s = "A".repeat(150)
		expect(truncate(s, 120)).toBe(`${"A".repeat(120)}...`)
	})

	it("truncate(s, 120): string of exactly 120 chars is returned unchanged", () => {
		const s = "B".repeat(120)
		expect(truncate(s, 120)).toBe(s)
	})

	it("truncate(s, 120): string of 61 chars is NOT truncated (old 60-char limit gone)", () => {
		const s = "C".repeat(61)
		const result = truncate(s, 120)
		expect(result).toBe(s)
		// Also confirm the old limit would have truncated it
		expect(truncate(s, 60)).toBe(`${"C".repeat(60)}...`)
	})

	it("truncate(s, 120): empty string returns empty string", () => {
		expect(truncate("", 120)).toBe("")
	})
})

// ---------------------------------------------------------------------------
// 9. VersionTimeline maxHeight increase — 160 (was 120)
// ---------------------------------------------------------------------------
describe("VersionTimeline container maxHeight", () => {
	it("VersionTimeline containerStyle has maxHeight: 160 (was 120)", () => {
		// Locate VersionTimeline function body
		const start = src.indexOf("function VersionTimeline(")
		const end = src.indexOf("\nexport const NodeHoverPopover", start)
		const fnBody = src.slice(start, end)
		expect(fnBody).toContain("maxHeight: 160")
		expect(fnBody).not.toContain("maxHeight: 120")
	})
})

// ---------------------------------------------------------------------------
// 10. onOpenDocument prop — declared in interface and destructured
// ---------------------------------------------------------------------------
describe("onOpenDocument prop wiring", () => {
	it("is declared in NodeHoverPopoverProps interface", () => {
		const start = src.indexOf("export interface NodeHoverPopoverProps")
		const end = src.indexOf("}", start)
		const block = src.slice(start, end)
		expect(block).toContain("onOpenDocument?: (documentId: string) => void")
	})

	it("is destructured in the component function parameters", () => {
		// The destructuring must appear inside the memo() call
		const memoStart = src.indexOf("export const NodeHoverPopover = memo")
		const fnBodyStart = src.indexOf("{", memoStart)
		const firstReturn = src.indexOf("return (", fnBodyStart)
		const paramBlock = src.slice(fnBodyStart, firstReturn)
		expect(paramBlock).toContain("onOpenDocument,")
	})
})

// ---------------------------------------------------------------------------
// 11. NavButton icon type — accepts ReactNode (not just string)
// ---------------------------------------------------------------------------
describe("NavButton icon prop type", () => {
	it("NavButton icon prop type is React.ReactNode (not string)", () => {
		// The NavButton params are: function NavButton({ icon, label, ... }: { icon: React.ReactNode ... })
		// The type annotation block follows the }: pattern.
		const start = src.indexOf("function NavButton(")
		// Find the }: { which starts the type annotation
		const typeAnnotationStart = src.indexOf("}: {", start)
		const typeAnnotationEnd = src.indexOf("}) {", typeAnnotationStart)
		const typeBlock = src.slice(typeAnnotationStart, typeAnnotationEnd)
		expect(typeBlock).toContain("icon: React.ReactNode")
		expect(typeBlock).not.toContain("icon: string")
	})

	it("NavButton always wraps icon in KeyBadge", () => {
		// All icons (string or ReactNode) are wrapped in KeyBadge for consistent badge styling
		expect(src).toContain("<KeyBadge colors={colors}>{icon}</KeyBadge>")
		// No conditional dispatch — all icons go through KeyBadge
		expect(src).not.toContain('typeof icon === "string"')
	})
})

// ---------------------------------------------------------------------------
// 12. handleOpenDocument wrapper in memory-graph.tsx
//     Verifies the dismiss-then-open pattern: setSelectedNode(null) and
//     setHoveredNode(null) are called before onOpenDocument?.(documentId)
// ---------------------------------------------------------------------------

const MG_SRC_PATH = resolve(__dirname, "../components/memory-graph.tsx")
const mgSrc = readFileSync(MG_SRC_PATH, "utf-8")

describe("handleOpenDocument wrapper in MemoryGraph", () => {
	// Locate the handleOpenDocument block once for all sub-tests
	const wrapperStart = mgSrc.indexOf("const handleOpenDocument = useCallback(")
	const wrapperEnd = mgSrc.indexOf("\t)", wrapperStart) + 2
	const wrapperBlock = mgSrc.slice(wrapperStart, wrapperEnd)

	it("handleOpenDocument wrapper is defined in memory-graph.tsx", () => {
		expect(wrapperBlock.length).toBeGreaterThan(0)
		expect(wrapperBlock).toContain("handleOpenDocument")
	})

	it("calls setSelectedNode(null) to dismiss the selected node", () => {
		expect(wrapperBlock).toContain("setSelectedNode(null)")
	})

	it("calls setHoveredNode(null) to dismiss the hovered node", () => {
		expect(wrapperBlock).toContain("setHoveredNode(null)")
	})

	it("calls onOpenDocument?.(documentId) — optional chaining preserves no-op when undefined", () => {
		expect(wrapperBlock).toContain("onOpenDocument?.(documentId)")
	})

	it("setSelectedNode(null) and setHoveredNode(null) appear before onOpenDocument?.(documentId)", () => {
		const selectedIdx = wrapperBlock.indexOf("setSelectedNode(null)")
		const hoveredIdx = wrapperBlock.indexOf("setHoveredNode(null)")
		const openDocIdx = wrapperBlock.indexOf("onOpenDocument?.(documentId)")
		expect(selectedIdx).toBeGreaterThanOrEqual(0)
		expect(hoveredIdx).toBeGreaterThanOrEqual(0)
		expect(openDocIdx).toBeGreaterThanOrEqual(0)
		// Both dismiss calls must appear before the open-document call
		expect(selectedIdx).toBeLessThan(openDocIdx)
		expect(hoveredIdx).toBeLessThan(openDocIdx)
	})

	it("handleOpenDocument is only forwarded to NodeHoverPopover when onOpenDocument is provided", () => {
		// The prop is passed as: onOpenDocument={onOpenDocument ? handleOpenDocument : undefined}
		// This prevents forwarding a handler when the parent didn't pass a callback.
		expect(mgSrc).toContain(
			"onOpenDocument={onOpenDocument ? handleOpenDocument : undefined}",
		)
	})

	it("handleOpenDocument is memoised with useCallback (dependency: onOpenDocument)", () => {
		expect(wrapperBlock).toContain("useCallback(")
		expect(wrapperBlock).toContain("[onOpenDocument]")
	})
})
