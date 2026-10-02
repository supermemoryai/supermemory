import { describe, expect, it } from "vitest"
import {
	containerTagToNamespace,
	namespaceToContainerTag,
} from "./container-tag"

/** What the API accepts: alphanumerics, hyphens, underscores, colons. */
const ALLOWED = /^[A-Za-z0-9\-_:]*$/

describe("namespace <-> container tag", () => {
	it("round-trips a simple namespace", () => {
		const namespace = ["memories", "user123"]
		expect(containerTagToNamespace(namespaceToContainerTag(namespace))).toEqual(
			namespace,
		)
	})

	it("keeps a segment containing the separator distinct from a deeper namespace", () => {
		expect(namespaceToContainerTag(["a:b"])).not.toBe(
			namespaceToContainerTag(["a", "b"]),
		)
		expect(containerTagToNamespace(namespaceToContainerTag(["a:b"]))).toEqual([
			"a:b",
		])
		expect(
			containerTagToNamespace(namespaceToContainerTag(["a", "b"])),
		).toEqual(["a", "b"])
	})

	it("only emits characters the API accepts", () => {
		for (const namespace of [
			["memories", "user 123"],
			["a/b", "c.d"],
			["emoji 🙂", "slash/"],
			["under_score", "colon:"],
		]) {
			expect(namespaceToContainerTag(namespace)).toMatch(ALLOWED)
			expect(
				containerTagToNamespace(namespaceToContainerTag(namespace)),
			).toEqual(namespace)
		}
	})
})
