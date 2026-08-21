import { describe, expect, it } from "bun:test"
import {
	clampScale,
	clampTranslation,
	IDENTITY_TRANSFORM,
	isZoomed,
	MAX_SCALE,
	MIN_SCALE,
	panBy,
	toCssTransform,
	zoomAtPoint,
} from "./image-zoom"

describe("clampScale", () => {
	it("clamps to the [min, max] range", () => {
		expect(clampScale(0.2)).toBe(MIN_SCALE)
		expect(clampScale(3)).toBe(3)
		expect(clampScale(999)).toBe(MAX_SCALE)
	})
})

describe("zoomAtPoint", () => {
	it("zooms toward the center without shifting when pointer is centered", () => {
		const next = zoomAtPoint(IDENTITY_TRANSFORM, 2, 0, 0)
		expect(next.scale).toBe(2)
		expect(next.x).toBe(0)
		expect(next.y).toBe(0)
	})

	it("keeps the point under the cursor stationary", () => {
		// Zooming 2x at pointer (100, 0) from identity.
		// world point under cursor = (100 - 0)/1 = 100; after 2x it must stay at 100.
		const next = zoomAtPoint(IDENTITY_TRANSFORM, 2, 100, 0)
		const worldUnderCursor = (100 - next.x) / next.scale
		expect(worldUnderCursor).toBeCloseTo(100)
		expect(next.x).toBeCloseTo(-100)
	})

	it("recenters when zooming back out to minimum scale", () => {
		const zoomed = zoomAtPoint(IDENTITY_TRANSFORM, 4, 120, 60)
		const out = zoomAtPoint(zoomed, 0.01, 120, 60)
		expect(out.scale).toBe(MIN_SCALE)
		expect(out.x).toBe(0)
		expect(out.y).toBe(0)
	})

	it("returns the same transform when already at max and zooming in", () => {
		const atMax = { scale: MAX_SCALE, x: 5, y: 5 }
		expect(zoomAtPoint(atMax, 2, 0, 0)).toBe(atMax)
	})
})

describe("clampTranslation", () => {
	it("allows no travel at scale 1", () => {
		const clamped = clampTranslation({ scale: 1, x: 50, y: 50 }, 800, 600)
		expect(clamped.x).toBe(0)
		expect(clamped.y).toBe(0)
	})

	it("limits travel to (scale-1)*half on each axis", () => {
		// scale 2, container 800x600 => maxX 400, maxY 300
		expect(clampTranslation({ scale: 2, x: 999, y: -999 }, 800, 600)).toEqual({
			scale: 2,
			x: 400,
			y: -300,
		})
		expect(clampTranslation({ scale: 2, x: 100, y: -50 }, 800, 600)).toEqual({
			scale: 2,
			x: 100,
			y: -50,
		})
	})
})

describe("panBy", () => {
	it("applies a delta and re-clamps", () => {
		const start = { scale: 2, x: 0, y: 0 }
		const panned = panBy(start, 1000, 0, 800, 600)
		expect(panned.x).toBe(400) // clamped to maxX
	})
})

describe("isZoomed / toCssTransform", () => {
	it("reports zoom state", () => {
		expect(isZoomed(IDENTITY_TRANSFORM)).toBe(false)
		expect(isZoomed({ scale: 1.5, x: 0, y: 0 })).toBe(true)
	})

	it("serializes the CSS transform", () => {
		expect(toCssTransform({ scale: 2, x: 10, y: -5 })).toBe(
			"translate(10px, -5px) scale(2)",
		)
	})
})
