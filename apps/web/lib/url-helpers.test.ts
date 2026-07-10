import { describe, expect, it } from "bun:test"
import { isYouTubeUrl } from "./url-helpers"

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
