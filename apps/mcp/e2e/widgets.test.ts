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
				namespaces?: Array<{ namespace: string }>
				assignedNamespaces?: Array<{
					namespace: string
					permission: "read" | "write"
				}>
			}
			expect(content.view).toBe("picker")
			expect(Array.isArray(content.namespaces)).toBe(true)
			expect(content.assignedNamespaces).toHaveLength(
				content.namespaces?.length ?? 0,
			)
			expect(
				content.assignedNamespaces?.every((access) =>
					["read", "write"].includes(access.permission),
				),
			).toBe(true)
		})

		it("shares the selected space across MCP transport sessions", async () => {
			const picker = await callTool(session.client, "select-space")
			const pickerContent = picker.structuredContent as {
				namespaces?: Array<{ namespace: string }>
			}
			const firstNamespace = pickerContent.namespaces?.[0]?.namespace
			expect(firstNamespace).toBeTruthy()

			const result = await callTool(session.client, "set-active-tag", {
				namespace: firstNamespace,
			})
			expect(result.isError).toBeFalsy()
			expect(result.structuredContent).toMatchObject({
				view: "confirmation",
				namespace: firstNamespace,
			})

			const separateSession = await connect()
			try {
				const identity = await callTool(separateSession.client, "who_am_i")
				expect(identity.isError).toBeFalsy()
				expect(JSON.parse(textOf(identity))).toMatchObject({
					activeSpace: firstNamespace,
				})
			} finally {
				await separateSession.close()
			}
		})
	},
)
