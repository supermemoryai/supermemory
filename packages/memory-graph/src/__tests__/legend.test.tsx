import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Legend } from "../components/legend"
import { DEFAULT_COLORS } from "../constants"

afterEach(cleanup)

describe("Legend", () => {
	it("keeps disclosure state and motion behavior in sync", () => {
		const { container } = render(
			<Legend colors={DEFAULT_COLORS} edges={[]} nodes={[]} />,
		)

		const legendButton = screen.getByRole("button", { name: "Legend" })
		const legendReveal = container.querySelector(".mg-legend-reveal")

		expect(legendButton.getAttribute("aria-expanded")).toBe("false")
		expect(legendReveal?.getAttribute("data-expanded")).toBe("false")
		expect(
			document.getElementById("supermemory-graph-legend-motion")?.textContent,
		).toContain("prefers-reduced-motion")

		fireEvent.click(legendButton)

		expect(legendButton.getAttribute("aria-expanded")).toBe("true")
		expect(legendReveal?.getAttribute("data-expanded")).toBe("true")
	})

	it("exposes the connections disclosure state", () => {
		render(<Legend colors={DEFAULT_COLORS} edges={[]} nodes={[]} />)
		fireEvent.click(screen.getByRole("button", { name: "Legend" }))

		const connectionsButton = screen.getByRole("button", {
			name: /Connections/,
		})
		expect(connectionsButton.getAttribute("aria-expanded")).toBe("true")

		fireEvent.click(connectionsButton)

		expect(connectionsButton.getAttribute("aria-expanded")).toBe("false")
	})
})
