import { beforeAll, describe, expect, it, mock } from "bun:test"
import { createElement, type ComponentProps } from "react"
import { renderToStaticMarkup } from "react-dom/server"

const VIDEO_ID = "dQw4w9WgXcQ"
const SHORTS_URL = `https://www.youtube.com/shorts/${VIDEO_ID}`

mock.module("@/lib/fonts", () => ({ dmSansClassName: () => "" }))

let YoutubePreview: typeof import("./document-cards/youtube-preview").YoutubePreview
let YoutubeVideo: typeof import("./document-modal/content/yt-video").YoutubeVideo

beforeAll(async () => {
	;({ YoutubePreview } = await import("./document-cards/youtube-preview"))
	;({ YoutubeVideo } = await import("./document-modal/content/yt-video"))
})

describe("YouTube Shorts rendering", () => {
	it("renders a Shorts embed in the memory card", () => {
		const document = {
			url: SHORTS_URL,
			title: "A short",
			content: null,
		} as ComponentProps<typeof YoutubePreview>["document"]

		const html = renderToStaticMarkup(
			createElement(YoutubePreview, { document }),
		)

		expect(html).toContain(`src="https://www.youtube.com/embed/${VIDEO_ID}"`)
	})

	it("renders the same Shorts embed in the document modal", () => {
		const html = renderToStaticMarkup(
			createElement(YoutubeVideo, { url: SHORTS_URL }),
		)

		expect(html).toContain(`src="https://www.youtube.com/embed/${VIDEO_ID}"`)
	})
})
