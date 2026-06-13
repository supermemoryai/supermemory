import { NextResponse } from "next/server"
import { buildBackendHeaders, chunkArray, getBackendBaseUrl } from "../_utils"

type ExportDocument = {
	content?: string | null
	summary?: string | null
	customId?: string | null
	containerTags?: string[] | null
	metadata?: Record<string, unknown> | null
	entityContext?: string | null
}

type ImportPayload =
	| {
			containerTags?: string[]
			targetContainerTags?: string[]
			documents?: ExportDocument[]
			memories?: ExportDocument[]
			data?: ExportDocument[]
	  }
	| ExportDocument[]

function normalizeDocuments(payload: ImportPayload): ExportDocument[] {
	if (Array.isArray(payload)) return payload
	if (Array.isArray(payload.documents)) return payload.documents
	if (Array.isArray(payload.memories)) return payload.memories
	if (Array.isArray(payload.data)) return payload.data
	return []
}

function pickTargetContainerTags(payload: ImportPayload): string[] | null {
	if (Array.isArray(payload)) return null
	if (
		Array.isArray(payload.targetContainerTags) &&
		payload.targetContainerTags.length > 0
	) {
		return payload.targetContainerTags
	}
	if (
		Array.isArray(payload.containerTags) &&
		payload.containerTags.length > 0
	) {
		return payload.containerTags
	}
	return null
}

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as ImportPayload
		const documents = normalizeDocuments(payload)
		const overrideContainerTags = pickTargetContainerTags(payload)

		if (documents.length === 0) {
			return NextResponse.json(
				{ error: "No memories were provided for import" },
				{ status: 400 },
			)
		}

		const batches = chunkArray(
			documents
				.map((document) => {
					const content = (document.content ?? document.summary ?? "").trim()
					if (!content) return null
					return {
						content,
						customId: document.customId ?? undefined,
						containerTags:
							overrideContainerTags ?? document.containerTags ?? undefined,
						metadata: document.metadata ?? undefined,
						entityContext: document.entityContext ?? undefined,
					}
				})
				.filter(
					(document): document is NonNullable<typeof document> =>
						document !== null,
				),
			25,
		)

		if (batches.length === 0 || batches.every((batch) => batch.length === 0)) {
			return NextResponse.json(
				{ error: "No importable memories were found in the payload" },
				{ status: 400 },
			)
		}

		let imported = 0
		for (const batch of batches) {
			if (batch.length === 0) continue

			const response = await fetch(
				`${getBackendBaseUrl()}/v3/documents/batch`,
				{
					method: "POST",
					headers: buildBackendHeaders(request),
					body: JSON.stringify({
						documents: batch,
						metadata: {
							sm_source: "supermemory-export",
							sm_imported_at: new Date().toISOString(),
						},
					}),
				},
			)

			if (!response.ok) {
				const message = await response.text()
				throw new Error(
					message || `Import failed with status ${response.status}`,
				)
			}

			imported += batch.length
		}

		return NextResponse.json({ success: true, imported })
	} catch (error) {
		console.error("Memory import failed:", error)
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to import memories",
			},
			{ status: 500 },
		)
	}
}
