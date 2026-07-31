import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	OAUTH_CREDENTIALS_AVAILABLE,
	callTool,
	connect,
	type Session,
	textOf,
} from "./helpers"

describe.skipIf(!OAUTH_CREDENTIALS_AVAILABLE)(
	"MCP - on-demand widget permissions",
	() => {
		let session: Session

		beforeAll(async () => {
			session = await connect()
		})

		afterAll(async () => {
			await session?.close()
		})

		it("loads visible spaces and effective permissions on demand", async () => {
			const result = await callTool(session.client, "select-space")
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

		it("shares the selected space across MCP transport sessions", async () => {
			const picker = await callTool(session.client, "select-space")
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

			const separateSession = await connect()
			try {
				const identity = await callTool(separateSession.client, "whoAmI")
				expect(identity.isError).toBeFalsy()
				expect(JSON.parse(textOf(identity))).toMatchObject({
					activeSpace: firstTag,
				})
			} finally {
				await separateSession.close()
			}
		})
	},
)
