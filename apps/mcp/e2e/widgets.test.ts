import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	AUTH_CREDENTIALS_AVAILABLE,
	callTool,
	connect,
	type Session,
} from "./helpers"

describe.skipIf(!AUTH_CREDENTIALS_AVAILABLE)(
	"MCP - on-demand widget permissions",
	() => {
		let session: Session

		beforeAll(async () => {
			session = await connect()
		})

		afterAll(async () => {
			await session?.close()
		})

		it("loads visible workspaces and effective permissions on demand", async () => {
			const result = await callTool(session.client, "select-workspace")
			expect(result.isError).toBeFalsy()
			const content = result.structuredContent as {
				view?: string
				containerTags?: Array<{ containerTag: string }>
				assignedTags?: Array<{
					containerTag: string
					permission: "read" | "write"
				}>
			}
			expect(content.view).toBe("picker")
			expect(Array.isArray(content.containerTags)).toBe(true)
			expect(content.assignedTags).toHaveLength(
				content.containerTags?.length ?? 0,
			)
			expect(
				content.assignedTags?.every((tag) =>
					["read", "write"].includes(tag.permission),
				),
			).toBe(true)
		})

		it("sets an active workspace only from the visible list", async () => {
			const picker = await callTool(session.client, "select-workspace")
			const pickerContent = picker.structuredContent as {
				containerTags?: Array<{ containerTag: string }>
			}
			const firstTag = pickerContent.containerTags?.[0]?.containerTag
			expect(firstTag).toBeTruthy()

			const result = await callTool(session.client, "set-active-tag", {
				containerTag: firstTag,
			})
			expect(result.isError).toBeFalsy()
			expect(result.structuredContent).toMatchObject({
				view: "confirmation",
				containerTag: firstTag,
			})
		})

		it("loads guided-save writable choices on demand", async () => {
			const result = await callTool(session.client, "guided-save", {
				prefill: "Preview only",
			})
			expect(result.isError).toBeFalsy()
			const content = result.structuredContent as {
				view?: string
				writableTags?: string[]
				prefill?: string
			}
			expect(content.view).toBe("save")
			expect(Array.isArray(content.writableTags)).toBe(true)
			expect(content.prefill).toBe("Preview only")
		})

		it("loads upload writable choices on demand", async () => {
			const result = await callTool(session.client, "upload-file")
			expect(result.isError).toBeFalsy()
			const content = result.structuredContent as {
				view?: string
				writableTags?: string[]
			}
			expect(content.view).toBe("upload")
			expect(Array.isArray(content.writableTags)).toBe(true)
		})
	},
)
