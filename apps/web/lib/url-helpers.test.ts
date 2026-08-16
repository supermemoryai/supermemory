import { describe, expect, it } from "bun:test"
import { extractYouTubeVideoId, isYouTubeUrl } from "./url-helpers"

const VIDEO_ID = "dQw4w9WgXcQ"

describe("isYouTubeUrl", () => {
	it("matches canonical youtube.com watch URLs", () => {
		expect(isYouTubeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true)
		expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
			true,
		)
	})

	it("matches real youtube subdomains", () => {
		expect(isYouTubeUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true)
		expect(isYouTubeUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
			true,
		)
	})

	it("matches youtu.be short links", () => {
		expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true)
		expect(isYouTubeUrl("https://www.youtu.be/dQw4w9WgXcQ")).toBe(true)
	})

	it("matches embed and shorts paths", () => {
		expect(isYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(true)
		expect(isYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
			true,
		)
	})

	it("is case-insensitive for scheme and host", () => {
		expect(isYouTubeUrl("HTTPS://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true)
		expect(isYouTubeUrl("https://WWW.YOUTUBE.COM/watch?v=dQw4w9WgXcQ")).toBe(
			true,
		)
	})

	it("matches scheme-less URLs", () => {
		expect(isYouTubeUrl("youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true)
		expect(isYouTubeUrl("www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true)
	})

	it("rejects lookalike domains", () => {
		expect(isYouTubeUrl("https://notyoutube.com/watch?v=dQw4w9WgXcQ")).toBe(
			false,
		)
		expect(isYouTubeUrl("https://myyoutu.be/dQw4w9WgXcQ")).toBe(false)
	})

	it("rejects hosts that merely start with youtube.com", () => {
		expect(
			isYouTubeUrl("https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ"),
		).toBe(false)
		expect(isYouTubeUrl("https://youtu.be.evil.example/dQw4w9WgXcQ")).toBe(
			false,
		)
	})

	it("rejects URLs that only contain youtube.com in the path", () => {
		expect(
			isYouTubeUrl("https://evil.example/youtube.com/watch?v=dQw4w9WgXcQ"),
		).toBe(false)
		expect(isYouTubeUrl("https://evil.example/redirect?to=youtu.be/x")).toBe(
			false,
		)
	})

	it("rejects empty and nullish input", () => {
		expect(isYouTubeUrl("")).toBe(false)
		expect(isYouTubeUrl(null)).toBe(false)
		expect(isYouTubeUrl(undefined)).toBe(false)
	})
})

describe("extractYouTubeVideoId", () => {
	it("extracts exact IDs from supported YouTube video URL formats", () => {
		expect(
			extractYouTubeVideoId(
				`https://www.youtube.com/watch?feature=share&v=${VIDEO_ID}`,
			),
		).toBe(VIDEO_ID)
		expect(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}?si=abc`)).toBe(
			VIDEO_ID,
		)
		expect(
			extractYouTubeVideoId(
				`https://www.youtube.com/embed/${VIDEO_ID}?start=10`,
			),
		).toBe(VIDEO_ID)
		expect(
			extractYouTubeVideoId(
				`https://www.youtube.com/shorts/${VIDEO_ID}?feature=share`,
			),
		).toBe(VIDEO_ID)
		expect(
			extractYouTubeVideoId(`https://www.youtube.com/live/${VIDEO_ID}`),
		).toBe(VIDEO_ID)
	})

	it("supports mobile, case-insensitive hosts, and scheme-less URLs", () => {
		expect(
			extractYouTubeVideoId(`https://m.youtube.com/watch?v=${VIDEO_ID}`),
		).toBe(VIDEO_ID)
		expect(
			extractYouTubeVideoId(`HTTPS://WWW.YOUTUBE.COM/shorts/${VIDEO_ID}`),
		).toBe(VIDEO_ID)
		expect(extractYouTubeVideoId(`youtu.be/${VIDEO_ID}`)).toBe(VIDEO_ID)
	})

	it("rejects lookalike hosts and URLs that only mention YouTube in a path", () => {
		expect(
			extractYouTubeVideoId(
				`https://youtube.com.evil.example/watch?v=${VIDEO_ID}`,
			),
		).toBeNull()
		expect(
			extractYouTubeVideoId(
				`https://evil.example/youtube.com/shorts/${VIDEO_ID}`,
			),
		).toBeNull()
		expect(
			extractYouTubeVideoId(`https://youtube.com@evil.example/${VIDEO_ID}`),
		).toBeNull()
	})

	it("rejects malformed IDs and unsupported YouTube routes", () => {
		expect(
			extractYouTubeVideoId("https://www.youtube.com/shorts/too-short"),
		).toBeNull()
		expect(
			extractYouTubeVideoId(`https://www.youtube.com/embed/${VIDEO_ID}x`),
		).toBeNull()
		expect(
			extractYouTubeVideoId(`https://www.youtube.com/channel/${VIDEO_ID}`),
		).toBeNull()
		expect(extractYouTubeVideoId(null)).toBeNull()
	})
})
