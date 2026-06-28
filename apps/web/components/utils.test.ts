import { describe, expect, it } from "bun:test"
import { extractYouTubeVideoId, isYouTubeUrl } from "./utils"

const VIDEO_ID = "dQw4w9WgXcQ"

describe("isYouTubeUrl", () => {
	it("matches real YouTube hostnames", () => {
		expect(isYouTubeUrl(`https://youtube.com/watch?v=${VIDEO_ID}`)).toBe(true)
		expect(isYouTubeUrl(`https://www.youtube.com/watch?v=${VIDEO_ID}`)).toBe(
			true,
		)
		expect(isYouTubeUrl(`HTTPS://m.youtube.com/watch?v=${VIDEO_ID}`)).toBe(true)
		expect(isYouTubeUrl(`youtu.be/${VIDEO_ID}`)).toBe(true)
	})

	it("rejects lookalike hosts and path-only matches", () => {
		expect(isYouTubeUrl(`https://notyoutube.com/watch?v=${VIDEO_ID}`)).toBe(
			false,
		)
		expect(
			isYouTubeUrl(`https://evil.example/youtube.com/watch?v=${VIDEO_ID}`),
		).toBe(false)
		expect(
			isYouTubeUrl(`https://youtube.com.evil.example/watch?v=${VIDEO_ID}`),
		).toBe(false)
		expect(isYouTubeUrl(`javascript://youtube.com/watch?v=${VIDEO_ID}`)).toBe(
			false,
		)
	})
})

describe("extractYouTubeVideoId", () => {
	it("extracts video ids from supported YouTube URL formats", () => {
		expect(
			extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}&t=3`),
		).toBe(VIDEO_ID)
		expect(
			extractYouTubeVideoId(`HTTPS://m.youtube.com/watch?v=${VIDEO_ID}`),
		).toBe(VIDEO_ID)
		expect(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}?si=abc`)).toBe(
			VIDEO_ID,
		)
		expect(extractYouTubeVideoId(`youtube.com/embed/${VIDEO_ID}`)).toBe(
			VIDEO_ID,
		)
		expect(
			extractYouTubeVideoId(`https://youtube.com/shorts/${VIDEO_ID}`),
		).toBe(VIDEO_ID)
		expect(extractYouTubeVideoId(`https://youtube.com/live/${VIDEO_ID}`)).toBe(
			VIDEO_ID,
		)
	})

	it("does not extract ids from unrelated hosts or invalid ids", () => {
		expect(
			extractYouTubeVideoId(
				`https://evil.example/youtube.com/watch?v=${VIDEO_ID}`,
			),
		).toBe(null)
		expect(
			extractYouTubeVideoId(
				`https://youtube.com.evil.example/watch?v=${VIDEO_ID}`,
			),
		).toBe(null)
		expect(extractYouTubeVideoId("https://youtube.com/watch?v=too-short")).toBe(
			null,
		)
	})
})
