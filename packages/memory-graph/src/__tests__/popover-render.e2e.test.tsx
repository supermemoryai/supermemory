/**
 * Mounted-render verification for configurable labels and popover layering.
 */

// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)
import { NodeHoverPopover } from "../components/node-hover-popover"
import { DEFAULT_COLORS, DEFAULT_LABELS } from "../constants"
import type { GraphNode, ResolvedMemoryGraphLabels } from "../types"

const documentNode: GraphNode = {
	id: "doc-1",
	type: "document",
	x: 0,
	y: 0,
	data: {
		id: "doc-1",
		title: "Doc title",
		summary: "Doc summary",
		type: "",
		createdAt: "2026-01-01",
		updatedAt: "2026-01-01",
		memories: [],
	},
	size: 40,
	borderColor: "#fff",
	isHovered: false,
	isDragging: false,
}

function renderPopover(
	labels?: ResolvedMemoryGraphLabels,
	zIndex?: number,
	onOpenDocument?: (id: string) => void,
) {
	return render(
		<NodeHoverPopover
			colors={DEFAULT_COLORS}
			labels={labels}
			node={documentNode}
			nodeRadius={20}
			screenX={100}
			screenY={100}
			zIndex={zIndex}
			onOpenDocument={onOpenDocument}
		/>,
	)
}

describe("NodeHoverPopover mounted render", () => {
	it("renders default document copy when no labels are passed", () => {
		const { container, getByText } = renderPopover(
			undefined,
			undefined,
			() => {},
		)
		getByText("View document")
		getByText("Go to memory")
		getByText("Next document")
		getByText("Prev document")
		getByText("document")
		getByText("Document")
		getByText("0 memories")
		const overlay = container.firstChild as HTMLElement
		expect(overlay.style.zIndex).toBe("100")
	})

	it("renders custom source-facing copy and custom z-index", () => {
		const labels: ResolvedMemoryGraphLabels = {
			...DEFAULT_LABELS,
			documentGroup: "Sources",
			documentTypeFallback: "source",
			documentIdLabel: "Source",
			viewDocument: "View source",
			goToDocument: "Go to source",
			nextDocument: "Next source",
			previousDocument: "Prev source",
			showMemory: "Show memory",
			memoryCount: (count) => `${count} facts`,
		}
		const { container, getByText, queryByText } = renderPopover(
			labels,
			30,
			() => {},
		)
		getByText("View source")
		getByText("Show memory")
		getByText("Next source")
		getByText("Prev source")
		getByText("source")
		getByText("Source")
		getByText("0 facts")
		expect(queryByText("View document")).toBeNull()
		const overlay = container.firstChild as HTMLElement
		expect(overlay.style.zIndex).toBe("30")
	})
})
