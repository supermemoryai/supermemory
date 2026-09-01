import { describe, expect, it } from "bun:test"
import { MAX_HEAD_BYTES, readBoundedText } from "./route"

function createStreamResponse(chunks: string[]): {
	response: Response
	wasCancelled: () => boolean
} {
	let cancelled = false
	let index = 0
	const encoder = new TextEncoder()
	const stream = new ReadableStream<Uint8Array>({
		pull(controller) {
			if (index < chunks.length) {
				controller.enqueue(encoder.encode(chunks[index++]))
			} else {
				controller.close()
			}
		},
		cancel() {
			cancelled = true
		},
	})

	return {
		response: new Response(stream),
		wasCancelled: () => cancelled,
	}
}

describe("readBoundedText", () => {
	it("stops reading and cancels the stream immediately when </head> is reached", async () => {
		const headPart = "<!DOCTYPE html><html><head><title>Supermemory</title></head>"
		const hugeBodyPart = "<body>" + "x".repeat(1_000_000) + "</body></html>"
		const { response, wasCancelled } = createStreamResponse([
			headPart,
			hugeBodyPart,
		])

		const result = await readBoundedText(response)

		expect(result).not.toBeNull()
		expect(result).toContain("<title>Supermemory</title></head>")
		expect(result).not.toContain("x".repeat(100))
		expect(wasCancelled()).toBe(true)
	})

	it("stops reading when <body is reached for HTML without closing head", async () => {
		const headPart = "<html><head><title>No closing tag</title>"
		const bodyPart = "<body class='main'>" + "y".repeat(500_000) + "</body>"
		const trailingPart = "<footer>more content</footer>"
		const { response, wasCancelled } = createStreamResponse([
			headPart,
			bodyPart,
			trailingPart,
		])

		const result = await readBoundedText(response)

		expect(result).not.toBeNull()
		expect(result).toContain("<title>No closing tag</title>")
		expect(result).not.toContain("y".repeat(100))
		expect(wasCancelled()).toBe(true)
	})

	it("handles case-insensitive closing head tag (e.g. </HEAD>)", async () => {
		const headPart = "<html><HEAD><TITLE>Uppercase Tag</TITLE></HEAD>"
		const bodyPart = "<BODY>trailing</BODY>"
		const { response, wasCancelled } = createStreamResponse([headPart, bodyPart])

		const result = await readBoundedText(response)

		expect(result).not.toBeNull()
		expect(result).toContain("<TITLE>Uppercase Tag</TITLE></HEAD>")
		expect(wasCancelled()).toBe(true)
	})

	it("detects </head> even when split across multiple stream chunks", async () => {
		const chunk1 = "<html><head><title>Split Test</title></h"
		const chunk2 = "ead><body>First body chunk</body>"
		const chunk3 = "<div>Trailing huge body content</div>"
		const { response, wasCancelled } = createStreamResponse([
			chunk1,
			chunk2,
			chunk3,
		])

		const result = await readBoundedText(response)

		expect(result).not.toBeNull()
		expect(result).toBe("<html><head><title>Split Test</title></head>")
		expect(wasCancelled()).toBe(true)
	})

	it("preserves multibyte UTF-8 characters across stream boundaries", async () => {
		const headContent =
			"<html><head><title>Supermemory · 🧠 知识库</title></head>"
		const bodyContent = "<body>Content</body>"
		const trailing = "<footer>Tail</footer>"
		const { response, wasCancelled } = createStreamResponse([
			headContent,
			bodyContent,
			trailing,
		])

		const result = await readBoundedText(response)

		expect(result).not.toBeNull()
		expect(result).toContain("Supermemory · 🧠 知识库")
		expect(wasCancelled()).toBe(true)
	})

	it("caps total read at maxBytes when neither head nor body tag is present", async () => {
		const chunk1 = "a".repeat(50_000)
		const chunk2 = "b".repeat(50_000)
		const chunk3 = "c".repeat(50_000)
		const { response, wasCancelled } = createStreamResponse([
			chunk1,
			chunk2,
			chunk3,
		])

		const maxBytes = 60_000
		const result = await readBoundedText(response, maxBytes)

		expect(result).not.toBeNull()
		expect(result!.length).toBeGreaterThanOrEqual(maxBytes)
		expect(result!.length).toBeLessThan(120_000)
		expect(wasCancelled()).toBe(true)
	})

	it("handles empty stream body gracefully", async () => {
		const response = new Response("")
		const result = await readBoundedText(response)
		expect(result).toBeNull()
	})

	it("handles null body gracefully", async () => {
		const response = { body: null } as unknown as Response
		const result = await readBoundedText(response)
		expect(result).toBeNull()
	})

	it("handles multi-megabyte streams (> 5 MB) without buffering full body", async () => {
		const headContent = `<!DOCTYPE html><html><head>
			<meta property="og:title" content="Large Document" />
			<meta property="og:description" content="A very big document" />
		</head>`
		// 5 chunks of 1MB body
		const hugeChunks = [
			headContent,
			"1".repeat(1_000_000),
			"2".repeat(1_000_000),
			"3".repeat(1_000_000),
			"4".repeat(1_000_000),
			"5".repeat(1_000_000),
		]
		const { response, wasCancelled } = createStreamResponse(hugeChunks)

		const result = await readBoundedText(response)

		expect(result).not.toBeNull()
		expect(result).toContain('property="og:title" content="Large Document"')
		expect(wasCancelled()).toBe(true)
		expect(result!.length).toBeLessThan(MAX_HEAD_BYTES)
	})
})
