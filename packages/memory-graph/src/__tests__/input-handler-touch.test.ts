import { beforeEach, describe, expect, it } from "vitest"
import { SpatialIndex } from "../canvas/hit-test"
import { InputHandler } from "../canvas/input-handler"
import { ViewportState } from "../canvas/viewport"
import type { GraphNode } from "../types"

/**
 * InputHandler tap-to-select on touch devices.
 *
 * onTouchStart calls preventDefault() (required to stop scroll/zoom of the
 * page), which also suppresses the browser's synthesized click event — so
 * node selection must be detected from the raw touch lifecycle. These tests
 * drive the handler through a stub canvas that records the listeners it
 * registers.
 */

type Listener = (e: Event) => void

function makeStubCanvas() {
	const listeners = new Map<string, Listener>()
	const canvas = {
		addEventListener: (name: string, fn: Listener) => {
			listeners.set(name, fn)
		},
		removeEventListener: (name: string) => {
			listeners.delete(name)
		},
		getBoundingClientRect: () => ({
			left: 0,
			top: 0,
			right: 800,
			bottom: 600,
			width: 800,
			height: 600,
			x: 0,
			y: 0,
		}),
		style: {} as CSSStyleDeclaration,
	}
	return { canvas: canvas as unknown as HTMLCanvasElement, listeners }
}

function touch(clientX: number, clientY: number) {
	return { clientX, clientY }
}

function touchEvent(touches: Array<{ clientX: number; clientY: number }>) {
	return {
		touches,
		preventDefault: () => {},
	} as unknown as TouchEvent
}

function makeNode(id: string, x: number, y: number): GraphNode {
	return {
		id,
		type: "document",
		x,
		y,
		data: {
			id,
			title: id,
			summary: "",
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
}

describe("InputHandler touch tap-to-select", () => {
	let listeners: Map<string, Listener>
	let clicks: Array<string | null>
	let viewport: ViewportState

	const fire = (name: string, e: TouchEvent) => {
		const fn = listeners.get(name)
		if (!fn) throw new Error(`no listener registered for ${name}`)
		fn(e as unknown as Event)
	}

	beforeEach(() => {
		const stub = makeStubCanvas()
		listeners = stub.listeners
		clicks = []

		// zoom 1 / pan 0 so screen coordinates equal world coordinates
		viewport = new ViewportState(0, 0, 1)
		const index = new SpatialIndex()
		index.rebuild([makeNode("doc-1", 100, 100)])

		new InputHandler(stub.canvas, viewport, index, {
			onNodeHover: () => {},
			onNodeClick: (id) => {
				clicks.push(id)
			},
			onNodeDragStart: () => {},
			onNodeDragEnd: () => {},
			onRequestRender: () => {},
		})
	})

	it("selects a node on a single tap", () => {
		fire("touchstart", touchEvent([touch(100, 100)]))
		fire("touchend", touchEvent([]))

		expect(clicks).toEqual(["doc-1"])
	})

	it("clears selection when tapping empty space", () => {
		fire("touchstart", touchEvent([touch(400, 400)]))
		fire("touchend", touchEvent([]))

		expect(clicks).toEqual([null])
	})

	it("still counts jittery taps within the movement threshold", () => {
		fire("touchstart", touchEvent([touch(100, 100)]))
		fire("touchmove", touchEvent([touch(104, 103)]))
		fire("touchend", touchEvent([]))

		expect(clicks).toEqual(["doc-1"])
	})

	it("does not fire a click after a pan", () => {
		fire("touchstart", touchEvent([touch(100, 100)]))
		fire("touchmove", touchEvent([touch(160, 100)]))
		fire("touchend", touchEvent([]))

		expect(clicks).toEqual([])
		// the drag actually panned the viewport
		expect(viewport.panX).toBe(60)
	})

	it("does not fire a click after a pinch gesture", () => {
		fire("touchstart", touchEvent([touch(100, 100)]))
		// second finger lands -> pinch, no longer a tap
		fire("touchstart", touchEvent([touch(100, 100), touch(200, 200)]))
		fire("touchend", touchEvent([touch(100, 100)]))
		fire("touchend", touchEvent([]))

		expect(clicks).toEqual([])
	})

	it("hit-tests a jittery tap against the node under the finger at touchstart", () => {
		// Zoomed out, a few-pixel finger jitter maps to a large world-space shift.
		// The sub-threshold move still pans the viewport, so re-projecting the
		// start screen point through the panned transform lands well off the node.
		// zoom 0.25: world (100, 100) renders at screen (25, 25).
		viewport.zoomImmediate(0.25, 0, 0)

		fire("touchstart", touchEvent([touch(25, 25)]))
		// 8px screen jitter (below the 10px tap threshold) that pans the viewport
		fire("touchmove", touchEvent([touch(33, 25)]))
		fire("touchend", touchEvent([]))

		// the jitter did move the viewport, but the tap still resolves the node
		expect(viewport.panX).toBe(8)
		expect(clicks).toEqual(["doc-1"])
	})

	it("hit-tests the tap through the current viewport transform", () => {
		// zoom 2x, pan (50, 50): world (100, 100) renders at screen (250, 250)
		viewport.pan(50, 50)
		viewport.zoomImmediate(2, 50, 50)

		fire("touchstart", touchEvent([touch(250, 250)]))
		fire("touchend", touchEvent([]))

		expect(clicks).toEqual(["doc-1"])
	})
})
