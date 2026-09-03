/**
 * Mounted-render verification for the in-graph search control.
 */

// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)
import { SearchControl } from "../components/search-control"
import { DEFAULT_COLORS } from "../constants"

function renderControl(
	overrides: Partial<React.ComponentProps<typeof SearchControl>> = {},
) {
	const props = {
		query: "",
		onQueryChange: vi.fn(),
		matchCount: 0,
		currentIndex: -1,
		onNext: vi.fn(),
		onPrev: vi.fn(),
		onClear: vi.fn(),
		colors: DEFAULT_COLORS,
		...overrides,
	}
	return { props, ...render(<SearchControl {...props} />) }
}

describe("SearchControl mounted render", () => {
	it("hides the match counter until there is a query", () => {
		const { queryByText } = renderControl()
		expect(queryByText("0/0")).toBeNull()
	})

	it("shows the 1-based position and total for the current match", () => {
		const { getByText } = renderControl({
			query: "design",
			matchCount: 3,
			currentIndex: 1,
		})
		getByText("2/3")
	})

	it("reports zero results distinctly", () => {
		const { getByText } = renderControl({
			query: "zzz",
			matchCount: 0,
			currentIndex: 0,
		})
		getByText("0/0")
	})

	it("forwards typing to onQueryChange", () => {
		const { props, getByLabelText } = renderControl()
		fireEvent.change(getByLabelText("Search graph nodes"), {
			target: { value: "berlin" },
		})
		expect(props.onQueryChange).toHaveBeenCalledWith("berlin")
	})

	it("steps matches with Enter and Shift+Enter", () => {
		const { props, getByLabelText } = renderControl({
			query: "a",
			matchCount: 2,
			currentIndex: 0,
		})
		const input = getByLabelText("Search graph nodes")
		fireEvent.keyDown(input, { key: "Enter" })
		expect(props.onNext).toHaveBeenCalledTimes(1)
		fireEvent.keyDown(input, { key: "Enter", shiftKey: true })
		expect(props.onPrev).toHaveBeenCalledTimes(1)
	})

	it("clears on Escape and on the clear button", () => {
		const { props, getByLabelText } = renderControl({
			query: "a",
			matchCount: 1,
			currentIndex: 0,
		})
		fireEvent.keyDown(getByLabelText("Search graph nodes"), { key: "Escape" })
		fireEvent.click(getByLabelText("Clear search"))
		expect(props.onClear).toHaveBeenCalledTimes(2)
	})

	it("disables the step buttons when there are no matches", () => {
		const { getByLabelText } = renderControl({ query: "zzz", matchCount: 0 })
		expect((getByLabelText("Next match") as HTMLButtonElement).disabled).toBe(
			true,
		)
		expect(
			(getByLabelText("Previous match") as HTMLButtonElement).disabled,
		).toBe(true)
	})
})
