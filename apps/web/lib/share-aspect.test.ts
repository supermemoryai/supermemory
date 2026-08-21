import { describe, expect, it } from "bun:test"
import {
	getShareAspectPreset,
	SHARE_ASPECT_PRESETS,
	shareAspectMaxHeightDvh,
	type ShareAspect,
} from "./share-aspect"

describe("share-aspect presets", () => {
	it("exposes post, square and story", () => {
		expect(SHARE_ASPECT_PRESETS.map((p) => p.id)).toEqual([
			"post",
			"square",
			"story",
		])
	})

	it("resolves each preset by id", () => {
		for (const preset of SHARE_ASPECT_PRESETS) {
			expect(getShareAspectPreset(preset.id)).toBe(preset)
		}
	})

	it("falls back to post for an unknown aspect", () => {
		expect(getShareAspectPreset("nope" as ShareAspect).id).toBe("post")
	})

	it("has coherent ratio strings and numeric values", () => {
		expect(getShareAspectPreset("square").value).toBe(1)
		expect(getShareAspectPreset("post").value).toBeGreaterThan(1) // landscape
		expect(getShareAspectPreset("story").value).toBeLessThan(1) // portrait
	})

	it("lets the narrow portrait story use more vertical space than the wide post", () => {
		expect(shareAspectMaxHeightDvh("story")).toBeGreaterThan(
			shareAspectMaxHeightDvh("post"),
		)
	})
})
