import { act, cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { InputHandler } from "../canvas/input-handler"
import { SpatialIndex } from "../canvas/hit-test"
import { ForceSimulation } from "../canvas/simulation"
import { ViewportState } from "../canvas/viewport"
import { Minimap } from "../components/minimap"
import { DEFAULT_COLORS } from "../constants"
import type { GraphNode } from "../types"

const handlers: InputHandler[] = []
const simulations: ForceSimulation[] = []

afterEach(() => {
	cleanup()
	for (const handler of handlers.splice(0)) handler.destroy()
	for (const simulation of simulations.splice(0)) simulation.destroy()
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

function makeNode(id: string, x: number, y: number): GraphNode {
	return {
		id,
		type: "document",
		x,
		y,
		size: 40,
		borderColor: "#fff",
		isHovered: false,
		isDragging: false,
		data: {
			id,
			title: id,
			summary: null,
			type: "text",
			createdAt: "2026-01-01",
			updatedAt: "2026-01-01",
			memories: [],
		},
	}
}

describe("Minimap stopped-layout dragging", () => {
	it.each([
		{ reduced: false, touch: false },
		{ reduced: false, touch: true },
		{ reduced: true, touch: false },
		{ reduced: true, touch: true },
	])("refreshes actual dragging with reduced=$reduced and touch=$touch without idle scans", ({
		reduced,
		touch,
	}) => {
		const frames = new Map<number, FrameRequestCallback>()
		let nextFrame = 0
		vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
			frames.set(++nextFrame, callback)
			return nextFrame
		})
		vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id))
		vi.stubGlobal("matchMedia", () => ({ matches: reduced }))
		const frame = () => {
			const callbacks = [...frames.values()]
			frames.clear()
			act(() => {
				for (const callback of callbacks) callback(0)
			})
		}
		const clearRect = vi.fn()
		const arc = vi.fn()
		const ctx = new Proxy(
			{ clearRect, arc },
			{
				get: (target, key) => Reflect.get(target, key) ?? (() => {}),
				set: () => true,
			},
		) as unknown as CanvasRenderingContext2D
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx)
		vi.spyOn(
			HTMLCanvasElement.prototype,
			"getBoundingClientRect",
		).mockReturnValue({
			x: 0,
			y: 0,
			left: 0,
			top: 0,
			width: 800,
			height: 600,
			right: 800,
			bottom: 600,
			toJSON: () => ({}),
		})
		const node = makeNode("drag", 100, 100)
		const nodes = [makeNode("left", 0, 0), node, makeNode("right", 400, 300)]
		const viewport = new ViewportState(0, 0, 1)
		let simulation: ForceSimulation | undefined
		if (reduced) {
			simulation = new ForceSimulation()
			simulations.push(simulation)
			simulation.init(nodes, [])
			expect(simulation.isActive()).toBe(false)
		}
		let x = node.x
		const readX = vi.fn(() => x)
		Object.defineProperty(node, "x", {
			get: readX,
			set: (value: number) => {
				x = value
			},
		})
		const result = render(
			<Minimap
				nodes={nodes}
				colors={DEFAULT_COLORS}
				viewportRef={{ current: viewport }}
				canvasWidth={800}
				canvasHeight={600}
				simulation={simulation}
			/>,
		)
		frame()
		expect(clearRect).toHaveBeenCalledTimes(1)
		const initialArcs = [...arc.mock.calls]
		readX.mockClear()
		for (let i = 0; i < 5; i++) frame()
		expect(clearRect).toHaveBeenCalledTimes(1)
		expect(readX).not.toHaveBeenCalled()
		const canvas = document.createElement("canvas")
		document.body.appendChild(canvas)
		const index = new SpatialIndex()
		index.rebuild(nodes, true)
		const onClick = vi.fn()
		const onEnd = vi.fn(() => simulation?.coolDown())
		const handler = new InputHandler(canvas, viewport, index, {
			onNodeHover: () => {},
			onNodeClick: onClick,
			onNodeDragStart: () => simulation?.reheat(),
			onNodeDragEnd: onEnd,
			onRequestRender: () => {},
		})
		handlers.push(handler)
		const startX = node.x
		const startY = node.y
		if (touch) {
			canvas.dispatchEvent(
				Object.assign(new Event("touchstart"), {
					touches: [{ clientX: startX, clientY: startY }],
				}),
			)
			canvas.dispatchEvent(
				Object.assign(new Event("touchmove"), {
					touches: [{ clientX: startX + 60, clientY: startY + 30 }],
				}),
			)
		} else {
			canvas.dispatchEvent(
				new MouseEvent("mousedown", {
					clientX: startX,
					clientY: startY,
					button: 0,
				}),
			)
			window.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: startX + 60,
					clientY: startY + 30,
				}),
			)
		}
		expect(node.x).toBe(startX + 60)
		expect(viewport.nodePositionVersion).toBe(1)
		frame()
		expect(clearRect).toHaveBeenCalledTimes(2)
		expect(arc.mock.calls.slice(3)).not.toEqual(initialArcs)
		if (touch)
			canvas.dispatchEvent(
				Object.assign(new Event("touchend"), { touches: [] }),
			)
		else window.dispatchEvent(new MouseEvent("mouseup"))
		expect(onEnd).toHaveBeenCalledOnce()
		expect(onClick).not.toHaveBeenCalled()
		readX.mockClear()
		for (let i = 0; i < 5; i++) frame()
		expect(clearRect).toHaveBeenCalledTimes(2)
		expect(readX).not.toHaveBeenCalled()
		viewport.pan(1, 0)
		frame()
		expect(clearRect).toHaveBeenCalledTimes(3)
		result.unmount()
		expect(frames.size).toBe(0)
		canvas.remove()
	})
})
