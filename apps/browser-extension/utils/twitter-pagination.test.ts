import { describe, expect, it } from "bun:test"
import { getNextUnseenCursor } from "./twitter-pagination"

describe("getNextUnseenCursor", () => {
	it("continues to a new cursor without requiring tweets on the current page", () => {
		expect(getNextUnseenCursor("cursor-2", new Set(["cursor-1"]))).toBe(
			"cursor-2",
		)
	})

	it("stops when there is no next cursor", () => {
		expect(getNextUnseenCursor(null, new Set())).toBeNull()
		expect(getNextUnseenCursor("", new Set())).toBeNull()
	})

	it("stops repeated and cyclic cursors", () => {
		const seenCursors = new Set(["cursor-1", "cursor-2"])

		expect(getNextUnseenCursor("cursor-2", seenCursors)).toBeNull()
		expect(getNextUnseenCursor("cursor-1", seenCursors)).toBeNull()
	})
})
