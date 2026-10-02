import { describe, expect, it } from "vitest"
import {
	containerTagToNamespace,
	isUnderPrefix,
	namespaceToContainerTag,
} from "./container-tag"

describe("namespace <-> container tag", () => {
	it("round-trips a simple namespace", () => {
		const namespace = ["memories", "user123"]
		expect(containerTagToNamespace(namespaceToContainerTag(namespace))).toEqual(
			namespace,
		)
	})

	it("keeps a segment containing the separator distinct from a deeper namespace", () => {
		// The collision this escaping exists to prevent.
		expect(namespaceToContainerTag(["a/b"])).not.toBe(
			namespaceToContainerTag(["a", "b"]),
		)
		expect(containerTagToNamespace(namespaceToContainerTag(["a/b"]))).toEqual([
			"a/b",
		])
		expect(
			containerTagToNamespace(namespaceToContainerTag(["a", "b"])),
		).toEqual(["a", "b"])
	})

	it("round-trips backslashes", () => {
		const namespace = ["a\\b", "c"]
		expect(containerTagToNamespace(namespaceToContainerTag(namespace))).toEqual(
			namespace,
		)
	})

	it("matches prefixes by segment, not by string", () => {
		expect(isUnderPrefix(["documents", "user1"], ["documents"])).toBe(true)
		expect(isUnderPrefix(["documents"], ["documents"])).toBe(true)
		expect(isUnderPrefix(["documents"], ["documents", "user1"])).toBe(false)
		// "doc" must not match "documents"
		expect(isUnderPrefix(["documents", "user1"], ["doc"])).toBe(false)
	})
})
