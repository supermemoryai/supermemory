import { describe, expect, it } from "vitest"
import {
	clampToRange,
	computeMinimapLayout,
	computeViewportRect,
	minimapToWorld,
	worldToMinimap,
} from "../canvas/minimap"

describe("computeMinimapLayout", () => {
	it("fits a square world into a padded box and centers it", () => {
		const layout = computeMinimapLayout(
			{ minX: 0, minY: 0, maxX: 100, maxY: 100 },
			120,
			120,
			10,
		)
		// avail = 100, world = 100 => scale 1
		expect(layout.scale).toBeCloseTo(1)
		// corners land on the padding edge
		expect(worldToMinimap(0, 0, layout)).toEqual({ x: 10, y: 10 })
		expect(worldToMinimap(100, 100, layout)).toEqual({ x: 110, y: 110 })
	})

	it("preserves aspect ratio for a wide world and centers the short axis", () => {
		const layout = computeMinimapLayout(
			{ minX: 0, minY: 0, maxX: 200, maxY: 100 },
			120,
			120,
			10,
		)
		// avail 100 x 100; width is the binding dimension => scale 0.5
		expect(layout.scale).toBeCloseTo(0.5)
		const topLeft = worldToMinimap(0, 0, layout)
		const bottomRight = worldToMinimap(200, 100, layout)
		// horizontally flush to padding, vertically centered (content height 50)
		expect(topLeft.x).toBeCloseTo(10)
		expect(bottomRight.x).toBeCloseTo(110)
		expect(topLeft.y).toBeCloseTo(35)
		expect(bottomRight.y).toBeCloseTo(85)
	})

	it("does not divide by zero for a degenerate (single-point) bound", () => {
		const layout = computeMinimapLayout(
			{ minX: 5, minY: 5, maxX: 5, maxY: 5 },
			100,
			100,
		)
		expect(Number.isFinite(layout.scale)).toBe(true)
		const p = worldToMinimap(5, 5, layout)
		expect(Number.isFinite(p.x)).toBe(true)
		expect(Number.isFinite(p.y)).toBe(true)
	})
})

describe("worldToMinimap / minimapToWorld round trip", () => {
	it("is an exact inverse", () => {
		const layout = computeMinimapLayout(
			{ minX: -50, minY: -20, maxX: 150, maxY: 180 },
			160,
			110,
			8,
		)
		for (const [wx, wy] of [
			[-50, -20],
			[0, 0],
			[75, 90],
			[150, 180],
		]) {
			const back = minimapToWorld(
				worldToMinimap(wx, wy, layout).x,
				worldToMinimap(wx, wy, layout).y,
				layout,
			)
			expect(back.x).toBeCloseTo(wx)
			expect(back.y).toBeCloseTo(wy)
		}
	})
})

describe("computeViewportRect", () => {
	const layout = computeMinimapLayout(
		{ minX: 0, minY: 0, maxX: 100, maxY: 100 },
		120,
		120,
		10,
	)

	it("maps the visible world region to a minimap rectangle", () => {
		// zoom 1, no pan => the canvas shows world [0..100] x [0..100]
		const rect = computeViewportRect(
			{ panX: 0, panY: 0, zoom: 1 },
			100,
			100,
			layout,
		)
		expect(rect.x).toBeCloseTo(10)
		expect(rect.y).toBeCloseTo(10)
		expect(rect.width).toBeCloseTo(100)
		expect(rect.height).toBeCloseTo(100)
	})

	it("shrinks the rectangle as the main view zooms in", () => {
		// zoom 2 => the canvas shows only half the world span in each axis
		const rect = computeViewportRect(
			{ panX: 0, panY: 0, zoom: 2 },
			100,
			100,
			layout,
		)
		expect(rect.width).toBeCloseTo(50)
		expect(rect.height).toBeCloseTo(50)
	})

	it("shifts the rectangle when the main view pans", () => {
		const base = computeViewportRect(
			{ panX: 0, panY: 0, zoom: 1 },
			100,
			100,
			layout,
		)
		// panning the world content left by 20 screen px moves the visible region right
		const panned = computeViewportRect(
			{ panX: -20, panY: 0, zoom: 1 },
			100,
			100,
			layout,
		)
		expect(panned.x).toBeGreaterThan(base.x)
	})
})

describe("clampToRange", () => {
	it("clamps below, within, and above", () => {
		expect(clampToRange(-5, 0, 10)).toBe(0)
		expect(clampToRange(5, 0, 10)).toBe(5)
		expect(clampToRange(50, 0, 10)).toBe(10)
	})
})
