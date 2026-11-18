import { NextResponse } from "next/server"
import { Supermemory } from "supermemory"
import { deleteDocument } from "../../../../../../packages/tools/src/tools-shared"
import { resolveSupermemoryApiKey } from "@/lib/api-keys"
import {
	manualMemoryDocument,
	manualMemoryId,
	type MemorySelection,
} from "@/lib/manual-memory"
import {
	PlaygroundRequestError,
	assertTrustedBrowserRequest,
	mayUseEnvironmentKeys,
	parseApiKeys,
	parseConversationId,
	parseMessages,
	parseNamespace,
	readJsonObject,
} from "@/lib/request-validation"

function parseSelection(value: unknown): MemorySelection {
	if (value === undefined) return { kind: "chat" }
	if (
		typeof value !== "number" ||
		!Number.isInteger(value) ||
		value < 0 ||
		value >= 64
	) {
		throw new PlaygroundRequestError("Invalid message index", 400)
	}
	return { kind: "message", index: value }
}

function createClient(apiKey: string): Supermemory {
	return new Supermemory({
		apiKey,
		timeoutInSeconds: 30,
		maxRetries: 0,
		...(process.env.SUPERMEMORY_BASE_URL
			? { baseUrl: process.env.SUPERMEMORY_BASE_URL }
			: {}),
	})
}

function errorResponse(error: unknown) {
	return NextResponse.json(
		{
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		},
		{ status: error instanceof PlaygroundRequestError ? error.status : 500 },
	)
}

async function input(req: Request) {
	assertTrustedBrowserRequest(req)
	const body = await readJsonObject(req)
	const namespace = parseNamespace(body.namespace)
	const conversationId = parseConversationId(body.conversationId)
	const selection = parseSelection(body.messageIndex)
	const apiKey = resolveSupermemoryApiKey(parseApiKeys(body.apiKeys), {
		allowEnvironment: mayUseEnvironmentKeys(req),
	})
	if (!apiKey) {
		throw new PlaygroundRequestError("Supermemory API key is required", 400)
	}
	return { body, namespace, conversationId, selection, apiKey }
}

export async function POST(req: Request) {
	try {
		const { body, namespace, conversationId, selection, apiKey } =
			await input(req)
		const messages = parseMessages(body.messages)
		if (selection.kind === "message") {
			const selected = messages[selection.index]
			if (!selected) {
				throw new PlaygroundRequestError("Message index is out of range", 400)
			}
			if (!selected.content.trim()) {
				throw new PlaygroundRequestError("Selected message has no text", 400)
			}
		}
		const document = manualMemoryDocument(
			namespace,
			conversationId,
			messages,
			selection,
		)
		await createClient(apiKey).add(namespace, {
			...document,
			dreaming: "instant",
		})
		return NextResponse.json({ ok: true, id: document.id })
	} catch (error) {
		return errorResponse(error)
	}
}

export async function DELETE(req: Request) {
	try {
		const { namespace, conversationId, selection, apiKey } = await input(req)
		const id = manualMemoryId(namespace, conversationId, selection)
		await deleteDocument(createClient(apiKey), namespace, id)
		return NextResponse.json({ ok: true, id })
	} catch (error) {
		return errorResponse(error)
	}
}
