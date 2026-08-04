import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	uploadPreparationSchema,
	uploadResponseSchema,
} from "../src/shared/types"
import {
	OAUTH_CREDENTIALS_AVAILABLE,
	callTool,
	connect,
	type Session,
	sleep,
	textOf,
} from "./helpers"

type AppView = {
	view?: string
	viewId?: string
	id?: string
	fileName?: string
	containerTag?: string
	writableTags?: string[]
}

async function waitForToolText(
	session: Session,
	name: string,
	args: Record<string, unknown>,
	needle: string,
	tries: number,
	delayMs: number,
): Promise<string | null> {
	for (let attempt = 0; attempt < tries; attempt++) {
		const result = await callTool(session.client, name, args)
		const text = textOf(result)
		if (!result.isError && text.includes(needle)) return text
		await sleep(delayMs)
	}
	return null
}

describe.skipIf(!OAUTH_CREDENTIALS_AVAILABLE)(
	"MCP - documents and memories",
	() => {
		let session: Session
		const createdMemories: Array<{
			content: string
			containerTag: string
		}> = []

		beforeAll(async () => {
			session = await connect()
		})

		afterAll(async () => {
			for (const memory of createdMemories) {
				await callTool(session.client, "add_memory", {
					content: memory.content,
					action: "forget",
					containerTag: memory.containerTag,
				}).catch(() => {})
			}
			await session?.close()
		})

		it("saves and reads a document, then lists a real extracted memory", async () => {
			const marker = `docs-${randomUUID()}`
			const content = `For E2E marker ${marker}, the user's preferred test fruit is dragonfruit.`
			const launcher = await callTool(session.client, "guided-save", {
				prefill: content,
			})
			expect(launcher.isError).toBeFalsy()

			const launcherView = launcher.structuredContent as AppView
			const containerTag = launcherView.writableTags?.[0]
			expect(launcherView.view).toBe("save")
			expect(launcherView.viewId).toBeTruthy()
			expect(containerTag).toBeTruthy()
			if (!launcherView.viewId || !containerTag) {
				throw new Error("Guided save did not provide a writable space")
			}

			const saved = await callTool(session.client, "save-memory", {
				content,
				containerTag,
				viewId: launcherView.viewId,
			})
			expect(saved.isError).toBeFalsy()
			const savedView = saved.structuredContent as AppView
			expect(savedView).toMatchObject({
				view: "save-success",
				containerTag,
			})
			expect(savedView.id).toBeTruthy()
			if (!savedView.id) throw new Error("Save did not return a document ID")
			createdMemories.push({ content, containerTag })

			const listedDocument = await waitForToolText(
				session,
				"listDocuments",
				{ page: 1, limit: 50, containerTag },
				`[${savedView.id}]`,
				20,
				1000,
			)
			expect(listedDocument, "saved document did not appear").not.toBeNull()

			const document = await waitForToolText(
				session,
				"getDocument",
				{ documentId: savedView.id },
				`Document ID: ${savedView.id}`,
				20,
				1000,
			)
			expect(document, "saved document could not be read").not.toBeNull()

			const memoriesResult = await callTool(session.client, "listMemories", {
				page: 1,
				limit: 10,
				containerTag: "sm_project_default",
			})
			expect(memoriesResult.isError).toBeFalsy()
			const memories = textOf(memoriesResult)
			expect(memories).toMatch(/active memor(?:y|ies) \(page 1 of \d+/i)

			const sourceDocumentId = memories.match(
				/Source documents: ([^,\n]+)/,
			)?.[1]
			expect(sourceDocumentId).toBeTruthy()
			if (!sourceDocumentId) {
				throw new Error("Listed memory did not include a source document")
			}

			const sourceDocument = await callTool(session.client, "getDocument", {
				documentId: sourceDocumentId,
			})
			expect(sourceDocument.isError).toBeFalsy()
			expect(textOf(sourceDocument)).toContain(
				`Document ID: ${sourceDocumentId}`,
			)
		}, 60_000)

		it("uploads and reads a text document", async () => {
			const marker = randomUUID()
			const fileName = `mcp-e2e-${marker}.txt`
			const fileContent = `E2E upload marker ${marker}.`
			const launcher = await callTool(session.client, "upload-file")
			expect(launcher.isError).toBeFalsy()

			const launcherView = launcher.structuredContent as AppView
			const containerTag = launcherView.writableTags?.[0]
			expect(launcherView.view).toBe("upload")
			expect(launcherView.viewId).toBeTruthy()
			expect(containerTag).toBeTruthy()
			if (!launcherView.viewId || !containerTag) {
				throw new Error("Upload did not provide a writable space")
			}

			const prepared = await callTool(session.client, "prepare-file-upload")
			expect(prepared.isError).toBeFalsy()
			const preparation = uploadPreparationSchema.parse(
				prepared.structuredContent,
			)
			const formData = new FormData()
			formData.append("file", new Blob([fileContent]), fileName)
			formData.append("containerTag", containerTag)
			formData.append(
				"metadata",
				JSON.stringify({ sm_source: "supermemory-mcp" }),
			)

			const response = await fetch(preparation.uploadUrl, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${preparation.uploadToken}`,
				},
				body: formData,
			})
			expect(response.ok).toBe(true)
			const uploaded = uploadResponseSchema.parse(await response.json())

			const document = await waitForToolText(
				session,
				"getDocument",
				{ documentId: uploaded.id },
				`Document ID: ${uploaded.id}`,
				20,
				1000,
			)
			expect(document, "uploaded document could not be read").not.toBeNull()
		}, 30_000)
	},
)
