import { describe, expect, it } from "bun:test"
import {
	handleEditorSubmitShortcut,
	resolveSubmittedContent,
	submitEditorContent,
} from "."

type EditorSnapshot = NonNullable<Parameters<typeof submitEditorContent>[0]>

function createEditor(readMarkdown: () => string): EditorSnapshot {
	return {
		getJSON: () => ({ type: "doc" }),
		storage: {
			markdown: {
				manager: {
					serialize: readMarkdown,
				},
			},
		},
	} as unknown as EditorSnapshot
}

describe("submitEditorContent", () => {
	it("submits the editor snapshot captured before pending updates flush", () => {
		let markdown = "latest editor content"
		const events: string[] = []
		const editor = createEditor(() => {
			events.push("serialize")
			return markdown
		})

		submitEditorContent(
			editor,
			() => {
				events.push("flush")
				markdown = "content changed during flush"
			},
			(content) => events.push(`submit:${content}`),
		)

		expect(events).toEqual([
			"serialize",
			"flush",
			"submit:latest editor content",
		])
	})

	it("does not submit when the editor is unavailable", () => {
		const events: string[] = []

		submitEditorContent(
			null,
			() => events.push("flush"),
			(content) => events.push(`submit:${content}`),
		)

		expect(events).toEqual([])
	})
})

describe("handleEditorSubmitShortcut", () => {
	it("handles both Command+Enter and Control+Enter", () => {
		for (const modifier of ["metaKey", "ctrlKey"] as const) {
			const events: string[] = []
			const editor = createEditor(() => "latest editor content")
			const event = {
				metaKey: false,
				ctrlKey: false,
				key: "Enter",
				preventDefault: () => events.push("preventDefault"),
				[modifier]: true,
			}

			const handled = handleEditorSubmitShortcut(
				event,
				editor,
				() => events.push("flush"),
				(content) => events.push(`submit:${content}`),
			)

			expect(handled).toBe(true)
			expect(events).toEqual([
				"preventDefault",
				"flush",
				"submit:latest editor content",
			])
		}
	})

	it("ignores unrelated key presses", () => {
		const events: string[] = []
		const handled = handleEditorSubmitShortcut(
			{
				metaKey: true,
				ctrlKey: false,
				key: "Escape",
				preventDefault: () => events.push("preventDefault"),
			},
			createEditor(() => "latest editor content"),
			() => events.push("flush"),
			(content) => events.push(`submit:${content}`),
		)

		expect(handled).toBe(false)
		expect(events).toEqual([])
	})
})

describe("resolveSubmittedContent", () => {
	it("prefers the editor snapshot and falls back for button submissions", () => {
		expect(resolveSubmittedContent("latest", "stale")).toBe("latest")
		expect(resolveSubmittedContent(undefined, "button state")).toBe(
			"button state",
		)
	})
})
