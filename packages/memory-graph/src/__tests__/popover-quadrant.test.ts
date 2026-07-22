import { describe, expect, it } from "vitest"
import { pickBestQuadrant } from "../components/node-hover-popover"

/**
 * pickBestQuadrant(screenX, screenY, nodeRadius, containerWidth,
 * containerHeight, popoverWidth, popoverHeight)
 *
 * gap = 24 in the implementation, so available space per side is:
 *   right: containerWidth - (screenX + nodeRadius + 24)
 *   left:  screenX - nodeRadius - 24
 *   above: screenY - nodeRadius - 24
 *   below: containerHeight - (screenY + nodeRadius + 24)
 */
describe("pickBestQuadrant", () => {
	const RADIUS = 10
	const POPOVER_W = 476 // CARD_W(280) + 12 + SHORTCUTS_W(160) + GAP(24)
	const POPOVER_H = 230

	it("prefers right when there is room on the right", () => {
		expect(
			pickBestQuadrant(100, 300, RADIUS, 1200, 600, POPOVER_W, POPOVER_H),
		).toBe("right")
	})

	it("falls back to left when only the left side fits", () => {
		// right space: 1200 - (1100 + 10 + 24) = 66 -> no fit
		// left space: 1100 - 10 - 24 = 1066 -> fits
		expect(
			pickBestQuadrant(1100, 40, RADIUS, 1200, 260, POPOVER_W, POPOVER_H),
		).toBe("left")
	})

	it("falls back to below when neither horizontal side fits", () => {
		// container is narrow (500 wide) so neither left nor right fits 476,
		// but there is 600 - (100 + 10 + 24) = 466 below -> fits 230
		expect(
			pickBestQuadrant(250, 100, RADIUS, 500, 600, POPOVER_W, POPOVER_H),
		).toBe("below")
	})

	it("uses above when it is the only side that fits", () => {
		// node near the bottom of a narrow container
		// above space: 500 - 10 - 24 = 466 -> fits 230
		// below space: 600 - (500 + 10 + 24) = 66 -> no fit
		expect(
			pickBestQuadrant(250, 500, RADIUS, 500, 600, POPOVER_W, POPOVER_H),
		).toBe("above")
	})

	it("treats exactly-enough space as a fit", () => {
		// right space: 800 - (280 + 10 + 24) = 486 -> not 476? use exact math
		// choose screenX so right space === POPOVER_W: screenX = 800 - 24 - 10 - 476 = 290
		expect(
			pickBestQuadrant(290, 300, RADIUS, 800, 600, POPOVER_W, POPOVER_H),
		).toBe("right")
	})

	describe("when no quadrant fully fits", () => {
		it("picks the side with the most available space instead of defaulting to right", () => {
			// container 800x300, node hugging the right edge at (750, 150)
			// right: 800 - (750 + 10 + 24) = 16
			// left:  750 - 10 - 24 = 716  <- most space, but < 800 popover width
			// above: 150 - 10 - 24 = 116
			// below: 300 - (150 + 10 + 24) = 116
			expect(pickBestQuadrant(750, 150, RADIUS, 800, 300, 800, 400)).toBe(
				"left",
			)
		})

		it("picks below when the node hugs the top of a short container", () => {
			// container 400x500, node at (200, 60)
			// right: 400 - (200 + 10 + 24) = 166
			// left:  200 - 10 - 24 = 166
			// above: 60 - 10 - 24 = 26
			// below: 500 - (60 + 10 + 24) = 406  <- most space
			expect(pickBestQuadrant(200, 60, RADIUS, 400, 500, 600, 600)).toBe(
				"below",
			)
		})

		it("picks above when the node hugs the bottom of a short container", () => {
			// container 400x500, node at (200, 440)
			// above: 440 - 10 - 24 = 406  <- most space
			// below: 500 - (440 + 10 + 24) = 26
			expect(pickBestQuadrant(200, 440, RADIUS, 400, 500, 600, 600)).toBe(
				"above",
			)
		})
	})
})
