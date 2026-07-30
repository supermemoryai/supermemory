import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	OAUTH_CREDENTIALS_AVAILABLE,
	callTool,
	connect,
	type Session,
	textOf,
} from "./helpers"

describe.skipIf(!OAUTH_CREDENTIALS_AVAILABLE)(
	"MCP - documents and memories",
	() => {
		let s: Session

		beforeAll(async () => {
			s = await connect()
		})
		afterAll(async () => {
			await s?.close()
		})

		it("appears in tool discovery", async () => {
			const tools = await s.client.listTools()
			const names = tools.tools.map((t) => t.name)
			expect(names).toContain("listMemories")
			expect(names).toContain("listDocuments")
			expect(names).toContain("getDocument")
		})

		it("lists extracted memory entries directly", async () => {
			const result = await callTool(s.client, "listMemories", { limit: 20 })
			expect(result.isError).toBeFalsy()
			expect(textOf(result)).toMatch(
				/active memor(y|ies) \(page \d+ of \d+|No active memories stored yet/i,
			)
		})

		it("lists documents and can read one by ID", async () => {
			const res = await callTool(s.client, "listDocuments", {
				page: 1,
				limit: 1,
			})
			expect(res.isError).toBeFalsy()
			const txt = textOf(res)
			expect(txt).toMatch(/page 1 of \d+|No documents stored yet/i)

			const documentId = txt.match(/- \[([^\]]+)\]/)?.[1]
			if (!documentId) return

			const document = await callTool(s.client, "getDocument", { documentId })
			expect(document.isError).toBeFalsy()
			expect(textOf(document)).toContain(`Document ID: ${documentId}`)
		}, 30_000)

		it("rejects an out-of-range limit", async () => {
			const res = await callTool(s.client, "listMemories", { limit: 500 })
			// Zod schema caps limit at 50 — the SDK surfaces this as a tool error.
			expect(res.isError).toBeTruthy()
		}, 30_000)
	},
)
