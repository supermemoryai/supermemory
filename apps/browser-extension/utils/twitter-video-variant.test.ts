import { describe, expect, it } from "bun:test"
import { pickBestVideoVariantUrl } from "./twitter-utils"

describe("pickBestVideoVariantUrl", () => {
	it("returns an empty string when there are no variants", () => {
		expect(pickBestVideoVariantUrl(undefined)).toBe("")
		expect(pickBestVideoVariantUrl([])).toBe("")
	})

	it("picks the highest-bitrate mp4, not the first variant", () => {
		const variants = [
			{
				url: "https://video.twimg.com/playlist.m3u8",
				content_type: "application/x-mpegURL",
			},
			{
				url: "https://video.twimg.com/low.mp4",
				content_type: "video/mp4",
				bitrate: 256000,
			},
			{
				url: "https://video.twimg.com/high.mp4",
				content_type: "video/mp4",
				bitrate: 2176000,
			},
			{
				url: "https://video.twimg.com/mid.mp4",
				content_type: "video/mp4",
				bitrate: 832000,
			},
		]
		expect(pickBestVideoVariantUrl(variants)).toBe(
			"https://video.twimg.com/high.mp4",
		)
	})

	it("does not return the HLS playlist when mp4 renditions exist", () => {
		const variants = [
			{
				url: "https://video.twimg.com/playlist.m3u8",
				content_type: "application/x-mpegURL",
			},
			{
				url: "https://video.twimg.com/only.mp4",
				content_type: "video/mp4",
				bitrate: 632000,
			},
		]
		expect(pickBestVideoVariantUrl(variants)).toBe(
			"https://video.twimg.com/only.mp4",
		)
	})

	it("falls back to the first variant when no mp4 is present", () => {
		const variants = [
			{
				url: "https://video.twimg.com/playlist.m3u8",
				content_type: "application/x-mpegURL",
			},
		]
		expect(pickBestVideoVariantUrl(variants)).toBe(
			"https://video.twimg.com/playlist.m3u8",
		)
	})

	it("detects mp4 by extension when content_type is absent", () => {
		const variants = [
			{ url: "https://video.twimg.com/240/vid.mp4?tag=12" },
			{ url: "https://video.twimg.com/720/vid.mp4?tag=12", bitrate: 2176000 },
		]
		expect(pickBestVideoVariantUrl(variants)).toBe(
			"https://video.twimg.com/720/vid.mp4?tag=12",
		)
	})
})
