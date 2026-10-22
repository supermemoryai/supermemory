import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SpatialIndex } from "../canvas/hit-test"
import { InputHandler } from "../canvas/input-handler"
import { ForceSimulation } from "../canvas/simulation"
import { ViewportState } from "../canvas/viewport"
import type { GraphNode } from "../types"

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

	let dragStarts: Array<{ id: string; node: GraphNode }>
	let dragEnds: number
	let testNode: GraphNode
	let handler: InputHandler
	let simulation: ForceSimulation | null

	const fire = (name: string, e: TouchEvent) => {
		const fn = listeners.get(name)
		if (!fn) throw new Error(`no listener registered for ${name}`)
		fn(e as unknown as Event)
	}

	beforeEach(() => {
		const stub = makeStubCanvas()
		listeners = stub.listeners
		clicks = []
		dragStarts = []
		dragEnds = 0
		simulation = null

		viewport = new ViewportState(0, 0, 1)
		const index = new SpatialIndex()
		testNode = makeNode("doc-1", 100, 100)
		index.rebuild([testNode])

		handler = new InputHandler(stub.canvas, viewport, index, {
			onNodeHover: () => {},
			onNodeClick: (id) => {
				clicks.push(id)
			},
			onNodeDragStart: (id, node) => {
				dragStarts.push({ id, node })
				simulation?.reheat()
			},
			onNodeDragEnd: () => {
				dragEnds++
				simulation?.coolDown()
			},
			onRequestRender: () => {},
		})
	})

	afterEach(() => {
		handler.destroy()
		simulation?.destroy()
		vi.unstubAllGlobals()
	})

	it("cancels a pending tap without selecting and permits a subsequent tap", () => {
		fire("touchstart", touchEvent([touch(100, 100)]))
		fire("touchcancel", touchEvent([]))
		fire("touchend", touchEvent([]))
		expect(clicks).toEqual([])
		expect(dragEnds).toBe(0)
		fire("touchstart", touchEvent([touch(100, 100)]))
		fire("touchend", touchEvent([]))
		expect(clicks).toEqual(["doc-1"])
	})

	it.each([
		false,
		true,
	])("releases cancelled touch drags with reduced motion %s", (reduced) => {
		vi.stubGlobal("matchMedia", () => ({ matches: reduced }))
		simulation = new ForceSimulation()
		simulation.init([testNode], [])
		simulation.stop()
		testNode.x = 100
		testNode.y = 100
		fire("touchstart", touchEvent([touch(100, 100)]))
		fire("touchmove", touchEvent([touch(160, 120)]))
		expect(testNode.fx).toBe(160)
		expect(simulation.isActive()).toBe(!reduced)
		fire("touchcancel", touchEvent([]))
		expect(testNode.fx).toBeNull()
		expect(testNode.fy).toBeNull()
		expect(handler.getDraggingNode()).toBeNull()
		expect(simulation.isActive()).toBe(false)
		expect(dragEnds).toBe(1)
		fire("touchcancel", touchEvent([]))
		fire("touchend", touchEvent([]))
		expect(dragEnds).toBe(1)
		expect(clicks).toEqual([])
	})

	it("clears cancelled pan and pinch state without selecting", () => {
		fire("touchstart", touchEvent([touch(400, 400)]))
		fire("touchmove", touchEvent([touch(460, 400)]))
		fire("touchcancel", touchEvent([]))
		fire("touchmove", touchEvent([touch(500, 400)]))
		expect(viewport.panX).toBe(60)
		fire("touchstart", touchEvent([touch(100, 100), touch(200, 200)]))
		fire("touchcancel", touchEvent([]))
		fire("touchend", touchEvent([]))
		expect(clicks).toEqual([])
	})

	it("releases a touch drag on pinch and removes cancellation listeners on destroy", () => {
		fire("touchstart", touchEvent([touch(100, 100)]))
		fire("touchmove", touchEvent([touch(160, 120)]))
		fire("touchstart", touchEvent([touch(160, 120), touch(240, 200)]))
		expect(testNode.fx).toBeNull()
		expect(dragEnds).toBe(1)
		handler.destroy()
		expect(listeners.has("touchcancel")).toBe(false)
		expect(listeners.size).toBe(0)
		expect(clicks).toEqual([])
	})

	it("increments the position revision only when a drag moves the node", () => {
		fire("touchstart", touchEvent([touch(100, 100)]))
		fire("touchmove", touchEvent([touch(160, 120)]))
		expect(viewport.nodePositionVersion).toBe(1)
		fire("touchmove", touchEvent([touch(160, 120)]))
		fire("touchend", touchEvent([]))
		expect(viewport.nodePositionVersion).toBe(1)
	})

	it("selects a node on a single tap", () => {
		fire("touchstart", touchEvent([touch(100, 100)]))
		fire("touchend", touchEvent([]))

		expect(clicks).toEqual(["doc-1"])
		expect(dragStarts).toEqual([])
		expect(testNode.fx).toBeUndefined()
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

	it("drags a node on touch and updates its fixed coordinates", () => {
		fire("touchstart", touchEvent([touch(100, 100)]))
		expect(dragStarts).toEqual([])

		fire("touchmove", touchEvent([touch(160, 120)]))
		expect(dragStarts.map((d) => d.id)).toEqual(["doc-1"])
		expect(testNode.x).toBe(160)
		expect(testNode.y).toBe(120)
		expect(testNode.fx).toBe(160)
		expect(testNode.fy).toBe(120)

		fire("touchend", touchEvent([]))
		expect(dragEnds).toBe(1)
		expect(testNode.fx).toBeNull()
		expect(testNode.fy).toBeNull()
		expect(clicks).toEqual([])
	})

	it("pans the viewport when dragging empty space", () => {
		fire("touchstart", touchEvent([touch(400, 400)]))
		fire("touchmove", touchEvent([touch(460, 400)]))
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
		// zoom 0.25: world (100, 100) renders at screen (25, 25).
		viewport.zoomImmediate(0.25, 0, 0)

		fire("touchstart", touchEvent([touch(25, 25)]))
		fire("touchmove", touchEvent([touch(33, 25)]))
		fire("touchend", touchEvent([]))

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
