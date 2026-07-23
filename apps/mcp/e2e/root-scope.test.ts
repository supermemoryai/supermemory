import { randomUUID } from "node:crypto"
import { afterAll, describe, expect, it } from "vitest"
import {
	API_KEY,
	callTool,
	connect,
	deleteDocument,
	documentIdOf,
	recallUntil,
	textOf,
} from "./helpers"

type ToolLike = {
	name: string
	inputSchema?: { properties?: Record<string, unknown> }
}

const propsOf = (tools: ToolLike[], name: string): Record<string, unknown> =>
	tools.find((t) => t.name === name)?.inputSchema?.properties ?? {}

// Fixed tag (not a per-run UUID) so the test doesn't mint a new project each run.
const SCOPE_TAG = "sm_e2e_root"

// x-sm-project locks the connection to one project: strips containerTag from schemas and scopes every op — distinct from the per-call arg.
describe.skipIf(!API_KEY)("MCP — x-sm-project root scoping", () => {
	const createdDocumentIds: string[] = []

	afterAll(async () => {
		await Promise.all(
			createdDocumentIds.map((documentId) => deleteDocument(documentId)),
		)
	}, 330_000)

	it("strips containerTag from tool schemas when x-sm-project is set", async () => {
		const scoped = await connect({ containerTag: SCOPE_TAG })
		const plain = await connect()
		try {
			const scopedTools = (await scoped.client.listTools()).tools
			const plainTools = (await plain.client.listTools()).tools

			expect(propsOf(plainTools, "memory")).toHaveProperty("containerTag")
			expect(propsOf(plainTools, "recall")).toHaveProperty("containerTag")

			expect(propsOf(scopedTools, "memory")).not.toHaveProperty("containerTag")
			expect(propsOf(scopedTools, "recall")).not.toHaveProperty("containerTag")
		} finally {
			await scoped.close()
			await plain.close()
		}
	})

	it("scopes saves to the connection project and isolates them from default", async () => {
		const marker = `root-${randomUUID()}`
		const content = `e2e root scope. token=${marker}. The root flower is bluebell.`

		const rooted = await connect({ containerTag: SCOPE_TAG })
		try {
			const save = await callTool(rooted.client, "memory", {
				content,
				action: "save",
			})
			expect(save.isError).toBeFalsy()
			expect(textOf(save)).toContain(SCOPE_TAG)
			const documentId = documentIdOf(save)
			expect(documentId).toBeTruthy()
			if (documentId) createdDocumentIds.push(documentId)

			const found = await recallUntil(
				rooted.client,
				"root flower bluebell",
				marker,
			)
			expect(found, "marker not found within its root scope").not.toBeNull()
		} finally {
			await rooted.close()
		}

		// A default connection searches sm_project_default only — must not see it.
		const plain = await connect()
		try {
			const leaked = await recallUntil(
				plain.client,
				"root flower bluebell",
				marker,
				{
					tries: 3,
					delayMs: 3000,
				},
			)
			expect(leaked, "rooted memory leaked into the default project").toBeNull()
		} finally {
			await plain.close()
		}
	}, 120_000)
})
