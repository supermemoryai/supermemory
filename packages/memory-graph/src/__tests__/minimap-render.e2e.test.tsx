/**
 * Mounted-render verification for the Minimap: it should render a canvas and
 * survive an environment where the 2D context is unavailable (happy-dom).
 */

// @vitest-environment happy-dom

import { createRef } from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

import { Minimap } from "../components/minimap"
import { ViewportState } from "../canvas/viewport"
import { DEFAULT_COLORS } from "../constants"
import type { GraphNode } from "../types"

const nodes: GraphNode[] = [
	{
		id: "doc-1",
		type: "document",
		x: 0,
		y: 0,
		data: {
			id: "doc-1",
			title: "Doc",
			summary: "",
			type: "",
			createdAt: "2026-01-01",
			updatedAt: "2026-01-01",
			memories: [],
		},
		size: 40,
		borderColor: "#58C7E8",
		clusterColor: "#58C7E8",
		isHovered: false,
		isDragging: false,
	},
	{
		id: "mem-1",
		type: "memory",
		x: 120,
		y: 80,
		data: {
			id: "mem-1",
			content: "Memory",
			documentId: "doc-1",
			memory: "Memory",
			isForgotten: false,
			isLatest: true,
			createdAt: "2026-01-01",
			updatedAt: "2026-01-01",
		} as GraphNode["data"],
		size: 24,
		borderColor: "#74D680",
		clusterColor: "#74D680",
		isHovered: false,
		isDragging: false,
	},
]

describe("Minimap render", () => {
	it("renders a canvas without throwing", () => {
		const viewportRef = createRef<ViewportState | null>()
		;(viewportRef as { current: ViewportState | null }).current =
			new ViewportState()

		const { container } = render(
			<Minimap
				nodes={nodes}
				colors={DEFAULT_COLORS}
				viewportRef={viewportRef}
				canvasWidth={800}
				canvasHeight={600}
				viewportVersion={0}
			/>,
		)

		const canvas = container.querySelector("canvas")
		expect(canvas).not.toBeNull()
	})

	it("renders nothing visible but does not crash with no nodes", () => {
		const viewportRef = createRef<ViewportState | null>()
		;(viewportRef as { current: ViewportState | null }).current =
			new ViewportState()

		const { container } = render(
			<Minimap
				nodes={[]}
				colors={DEFAULT_COLORS}
				viewportRef={viewportRef}
				canvasWidth={800}
				canvasHeight={600}
				viewportVersion={1}
			/>,
		)

		expect(container.querySelector("canvas")).not.toBeNull()
	})
})
