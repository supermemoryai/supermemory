import { createElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { McpAppPreviewProvider } from "../McpAppProvider"
import { Save } from "../views/Save"
import { Upload } from "../views/Upload"
import {
	isWritableTag,
	preferredWritableTag,
	retainedWritableTag,
} from "./writableTag"

describe("isWritableTag", () => {
	it("accepts only tags in the writable set", () => {
		expect(isWritableTag("team", ["personal", "team"])).toBe(true)
		expect(isWritableTag("read-only", ["personal", "team"])).toBe(false)
		expect(isWritableTag(null, ["personal", "team"])).toBe(false)
	})
})

function renderWithApp(view: ReactElement): string {
	return renderToStaticMarkup(createElement(McpAppPreviewProvider, null, view))
}

describe("preferredWritableTag", () => {
	it("keeps the candidate when it is writable", () => {
		expect(preferredWritableTag("team", ["personal", "team"])).toBe("team")
	})

	it("falls back when the candidate is not writable", () => {
		expect(preferredWritableTag("read-only", ["personal", "team"])).toBe(
			"personal",
		)
	})

	it("uses the first writable tag when there is no candidate", () => {
		expect(preferredWritableTag(null, ["personal", "team"])).toBe("personal")
	})

	it("returns null when no writable tags are available", () => {
		expect(preferredWritableTag("read-only", [])).toBeNull()
	})
})

describe("retainedWritableTag", () => {
	it("keeps a selection while it remains writable", () => {
		expect(retainedWritableTag("team", ["personal", "team"])).toBe("team")
	})

	it("clears a selection instead of silently retargeting it", () => {
		expect(retainedWritableTag("team", ["personal"])).toBeNull()
		expect(retainedWritableTag(null, ["personal"])).toBeNull()
	})
})

describe("writable space views", () => {
	const props = {
		activeTag: "read-only",
		writableTags: ["sm_project_personal"],
		onAdvance: () => {},
		onError: () => {},
	}

	it("selects a writable fallback in the save form", () => {
		const markup = renderWithApp(
			createElement(Save, { ...props, prefill: "Remember this" }),
		)

		expect(markup).toContain("Personal")
		expect(markup).not.toContain("Select space")
	})

	it("selects a writable fallback in the upload form", () => {
		const markup = renderWithApp(createElement(Upload, props))

		expect(markup).toContain("Personal")
		expect(markup).not.toContain("Select space")
	})

	it("disables saving when no writable spaces are available", () => {
		const markup = renderWithApp(
			createElement(Save, {
				...props,
				prefill: "Remember this",
				writableTags: [],
			}),
		)

		expect(markup).not.toContain("Select space")
		expect(markup).toContain('disabled=""')
	})

	it("disables uploading when no writable spaces are available", () => {
		const markup = renderWithApp(
			createElement(Upload, { ...props, writableTags: [] }),
		)

		expect(markup).not.toContain("Select space")
		expect(markup).toContain('disabled=""')
	})
})
