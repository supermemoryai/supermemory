/**
 * Zooming out far past the data schedules onLoadMore after 500ms. That timer
 * must be dropped when the user zooms back in before it fires, when a load is
 * already running, and when the graph unmounts (#1834).
 */

// @vitest-environment happy-dom

import { cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ViewportState } from "../canvas/viewport"
import { MemoryGraph } from "../components/memory-graph"
import type { GraphApiDocument, GraphNode } from "../types"

type ViewportChange = (zoom: number, popoverVisible: boolean) => void

// GraphCanvas owns the real wheel and pinch handling. Mock it and capture the
// callback it would call, so a test can zoom without a canvas.
const canvas = vi.hoisted(() => ({
	viewport: null as ViewportState | null,
	onViewportChange: null as ViewportChange | null,
	nodeCount: 0,
}))

vi.mock("../components/graph-canvas", () => ({
	GraphCanvas: (props: {
		nodes: GraphNode[]
		onViewportChange?: ViewportChange
		viewportRef: { current: ViewportState | null }
	}) => {
		props.viewportRef.current = canvas.viewport
		canvas.onViewportChange = props.onViewportChange ?? null
		canvas.nodeCount = props.nodes.length
		return null
	},
}))

const WIDTH = 800
const HEIGHT = 600

function makeDocument(id: string): GraphApiDocument {
	return {
		id,
		title: id,
		summary: null,
		documentType: "text",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		memories: [
			{
				id: `${id}-memory`,
				memory: "A remembered fact",
				isStatic: false,
				spaceId: "space",
				isLatest: true,
				isForgotten: false,
				forgetAfter: null,
				forgetReason: null,
				version: 1,
				parentMemoryId: null,
				rootMemoryId: null,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
				memoryRelations: null,
			},
		],
	}
}

const documents = [makeDocument("doc-a"), makeDocument("doc-b")]

async function mountGraph(props: {
	onLoadMore: () => void
	isLoadingMore?: boolean
}) {
	const view = render(<MemoryGraph documents={documents} hasMore {...props} />)
	await waitFor(() => expect(canvas.nodeCount).toBeGreaterThan(0))
	await waitFor(() => expect(canvas.onViewportChange).not.toBeNull())
	// Timers are faked only after mount, so the data hook and waitFor above
	// run on real timers.
	vi.useFakeTimers()
	return view
}

// A zoom of 0.001 makes the visible area 800,000 world units wide, far past
// any node extent; a zoom of 100 shrinks it to 8 units.
function zoomTo(zoom: number) {
	const viewport = canvas.viewport
	const onViewportChange = canvas.onViewportChange
	if (!viewport || !onViewportChange) throw new Error("graph not mounted")
	viewport.zoom = zoom
	onViewportChange(zoom, false)
}

beforeEach(() => {
	canvas.viewport = new ViewportState()
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: WIDTH,
		bottom: HEIGHT,
		width: WIDTH,
		height: HEIGHT,
		toJSON: () => ({}),
	})
})

afterEach(() => {
	cleanup()
	vi.useRealTimers()
	vi.restoreAllMocks()
	canvas.viewport = null
	canvas.onViewportChange = null
	canvas.nodeCount = 0
})

describe("load more timer", () => {
	it("calls onLoadMore once after staying zoomed out for 500ms", async () => {
		const onLoadMore = vi.fn()
		await mountGraph({ onLoadMore })

		zoomTo(0.001)
		zoomTo(0.0009)
		vi.advanceTimersByTime(499)
		expect(onLoadMore).not.toHaveBeenCalled()
		vi.advanceTimersByTime(1)
		expect(onLoadMore).toHaveBeenCalledTimes(1)
	})

	it("drops the pending load when the user zooms back in", async () => {
		const onLoadMore = vi.fn()
		await mountGraph({ onLoadMore })

		zoomTo(0.001)
		vi.advanceTimersByTime(200)
		zoomTo(100)
		vi.advanceTimersByTime(1000)
		expect(onLoadMore).not.toHaveBeenCalled()
	})

	it("starts a fresh 500ms wait after zooming out again", async () => {
		const onLoadMore = vi.fn()
		await mountGraph({ onLoadMore })

		zoomTo(0.001)
		vi.advanceTimersByTime(400)
		zoomTo(100)
		zoomTo(0.001)
		vi.advanceTimersByTime(400)
		expect(onLoadMore).not.toHaveBeenCalled()
		vi.advanceTimersByTime(100)
		expect(onLoadMore).toHaveBeenCalledTimes(1)
	})

	it("does not load again while a load is already running", async () => {
		const onLoadMore = vi.fn()
		const view = await mountGraph({ onLoadMore })

		zoomTo(0.001)
		view.rerender(
			<MemoryGraph
				documents={documents}
				hasMore
				isLoadingMore
				onLoadMore={onLoadMore}
			/>,
		)
		vi.advanceTimersByTime(1000)
		expect(onLoadMore).not.toHaveBeenCalled()
	})

	it("does not fire after the graph unmounts", async () => {
		const onLoadMore = vi.fn()
		const view = await mountGraph({ onLoadMore })

		zoomTo(0.001)
		view.unmount()
		vi.advanceTimersByTime(1000)
		expect(onLoadMore).not.toHaveBeenCalled()
	})
})
