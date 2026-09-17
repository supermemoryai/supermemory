/**
 * Mounted-render accessibility checks for the graph control surfaces:
 * accessible names on icon-only zoom buttons, disclosure state on the legend,
 * and a live region on the loading indicator.
 */

// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

import { Legend } from "../components/legend"
import { LoadingIndicator } from "../components/loading-indicator"
import { NavigationControls } from "../components/navigation-controls"
import { DEFAULT_COLORS, DEFAULT_LABELS } from "../constants"
import type { GraphNode } from "../types"

const node: GraphNode = {
	id: "doc-1",
	type: "document",
	x: 0,
	y: 0,
	data: {
		id: "doc-1",
		title: "Doc",
		summary: null,
		type: "text",
		createdAt: "2026-01-01",
		updatedAt: "2026-01-01",
		memories: [],
	},
	size: 40,
	borderColor: "#fff",
	isHovered: false,
	isDragging: false,
}

const noop = () => {}

describe("NavigationControls accessibility", () => {
	it("gives the icon-only zoom buttons accessible names", () => {
		const { getByLabelText } = render(
			<NavigationControls
				onCenter={noop}
				onZoomIn={noop}
				onZoomOut={noop}
				onAutoFit={noop}
				nodes={[node]}
				zoomLevel={100}
				colors={DEFAULT_COLORS}
			/>,
		)

		expect(getByLabelText("Zoom in")).toBeTruthy()
		expect(getByLabelText("Zoom out")).toBeTruthy()
	})
})

describe("Legend accessibility", () => {
	it("exposes disclosure state via aria-expanded and toggles it", () => {
		const { getByRole } = render(
			<Legend
				nodes={[node]}
				edges={[]}
				colors={DEFAULT_COLORS}
				labels={DEFAULT_LABELS}
			/>,
		)

		const toggle = getByRole("button", { name: "Legend" })
		expect(toggle.getAttribute("aria-expanded")).toBe("false")

		fireEvent.click(toggle)
		expect(toggle.getAttribute("aria-expanded")).toBe("true")
	})
})

describe("LoadingIndicator accessibility", () => {
	it("announces loading through a status live region", () => {
		const { getByRole } = render(
			<LoadingIndicator
				isLoading
				isLoadingMore={false}
				totalLoaded={0}
				colors={DEFAULT_COLORS}
				labels={DEFAULT_LABELS}
			/>,
		)

		const status = getByRole("status")
		expect(status.getAttribute("aria-live")).toBe("polite")
	})
})
