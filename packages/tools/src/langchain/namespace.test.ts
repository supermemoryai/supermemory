import { describe, expect, it } from "vitest"
import { fromSupermemoryNamespace, toSupermemoryNamespace } from "./namespace"

describe("LangGraph namespace mapping", () => {
	it("round-trips segments without collisions", () => {
		const namespaces = [
			["users", "ada"],
			["a:b"],
			["a", "b"],
			["spaces and/slashes", "under_score", "日本語"],
		]

		const encoded = namespaces.map(toSupermemoryNamespace)
		expect(new Set(encoded).size).toBe(namespaces.length)
		expect(encoded.map(fromSupermemoryNamespace)).toEqual(namespaces)
	})

	it("ignores namespaces not owned by the store", () => {
		expect(fromSupermemoryNamespace("user_alex")).toBeNull()
		expect(fromSupermemoryNamespace("langgraph:bad_encoding_")).toBeNull()
	})
})
