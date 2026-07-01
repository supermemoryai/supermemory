import { $fetch } from "@lib/api"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { isSafeSourceId } from "./source-annotations"

export const MEMORY_TOOL_PART_TYPES = [
	"tool-searchMemories",
	"tool-recallContext",
	"tool-discoverSpaces",
] as const
export const MAX_INLINE_GRAPH_DOCUMENT_IDS = 20

export type MemoryToolName =
	| "searchMemories"
	| "recallContext"
	| "discoverSpaces"
export type ToolDocumentMetadata = {
	id?: string | undefined
	internalDocumentId?: string | undefined
	customId?: string | null | undefined
	title?: string | null | undefined
	type?: string | null | undefined
	summary?: string | null | undefined
	url?: string | null | undefined
}
export type MemoryToolResultItem = {
	id?: string | undefined
	citationId?: string | undefined
	kind?: "memory" | "chunk" | "aggregate" | string | undefined
	content?: string | undefined
	score?: number | undefined
	documentId?: string | undefined
	documentIds?: string[] | undefined
	internalDocumentId?: string | undefined
	customId?: string | undefined
	documents?: ToolDocumentMetadata[] | undefined
	document?: ToolDocumentMetadata | undefined
}
export type MemoryToolResult = {
	query?: string | undefined
	count?: number | undefined
	sourceIds?: string[] | undefined
	documentIds?: string[] | undefined
	results?: MemoryToolResultItem[] | undefined
	spaces?:
		| Array<{
				results?: MemoryToolResultItem[] | undefined
				sourceIds?: string[] | undefined
				documentIds?: string[] | undefined
		  }>
		| undefined
}
export type MemoryToolOutput = {
	output: MemoryToolResult
}
export type CitationTarget = {
	sourceId: string
	memoryId?: string | undefined
	kind?: string | undefined
	content?: string | undefined
	documentId?: string | undefined
	customId?: string | null | undefined
	title?: string | null | undefined
	type?: string | null | undefined
	summary?: string | null | undefined
	url?: string | null | undefined
}

export type CitationDisplay = {
	title: string
	summary: string | null
	kind: string
}

export type DocumentWithMemories = z.infer<
	typeof DocumentsWithMemoriesResponseSchema
>["documents"][0]

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function strings(values: unknown): string[] {
	if (!Array.isArray(values)) return []
	return values.filter(
		(value): value is string => typeof value === "string" && value.length > 0,
	)
}

function normalizeOutput(output: unknown): MemoryToolResult {
	if (!isObject(output)) return {}

	const nested = [output]
	for (const key of [
		"memory",
		"search",
		"searchResult",
		"memoryResult",
		"memoryOutput",
		"hints",
	]) {
		const value = output[key]
		if (isObject(value)) nested.push(value)
	}

	const sourceIds: string[] = []
	const documentIds: string[] = []
	const results: MemoryToolResultItem[] = []

	const merged: MemoryToolResult = {
		query: typeof output.query === "string" ? output.query : undefined,
		count: typeof output.count === "number" ? output.count : undefined,
		sourceIds,
		documentIds,
		results,
		spaces: Array.isArray(output.spaces)
			? (output.spaces.filter(isObject) as MemoryToolResult["spaces"])
			: undefined,
	}

	for (const value of nested) {
		sourceIds.push(...strings(value.sourceIds))
		documentIds.push(...strings(value.documentIds))
		if (Array.isArray(value.results))
			results.push(
				...(value.results.filter(isObject) as MemoryToolResultItem[]),
			)
	}

	for (const space of merged.spaces ?? []) {
		sourceIds.push(...strings(space.sourceIds))
		documentIds.push(...strings(space.documentIds))
		if (Array.isArray(space.results))
			results.push(
				...(space.results.filter(isObject) as MemoryToolResultItem[]),
			)
	}

	merged.sourceIds = dedupe(merged.sourceIds ?? [])
	merged.documentIds = dedupe(merged.documentIds ?? [])
	return merged
}

function dedupe(values: string[]): string[] {
	return Array.from(new Set(values.filter(Boolean)))
}

function addTarget(
	index: Map<string, CitationTarget>,
	key: unknown,
	target: CitationTarget,
) {
	if (typeof key !== "string" || !isSafeSourceId(key)) return
	if (!index.has(key)) index.set(key, { ...target, sourceId: key })
}

function citationTargetForResult(
	sourceId: string,
	result: MemoryToolResultItem,
): CitationTarget {
	const doc = firstDocumentForResult(result)
	const docId =
		doc?.internalDocumentId ??
		result.internalDocumentId ??
		doc?.id ??
		result.documentIds?.find(Boolean) ??
		result.documentId
	const docTarget = documentTarget(sourceId, doc)
	return {
		...docTarget,
		memoryId: result.id,
		kind: result.kind,
		content: result.content,
		documentId: docTarget.documentId ?? docId,
		customId: docTarget.customId ?? result.customId,
	}
}

function documentTarget(
	sourceId: string,
	doc?: ToolDocumentMetadata | null,
): CitationTarget {
	return {
		sourceId,
		documentId: doc?.internalDocumentId ?? doc?.id,
		customId:
			doc?.customId ??
			(doc?.internalDocumentId && doc.id !== doc.internalDocumentId
				? doc.id
				: undefined),
		title: doc?.title,
		type: doc?.type,
		summary: doc?.summary,
		url: doc?.url,
	}
}

function firstDocumentForResult(
	result: MemoryToolResultItem,
): ToolDocumentMetadata | null {
	if (result.document && isObject(result.document)) return result.document
	if (Array.isArray(result.documents) && result.documents.length > 0)
		return result.documents.find(isObject) ?? null
	const firstId =
		result.documentIds?.find(Boolean) ??
		result.documentId ??
		result.internalDocumentId ??
		result.customId
	return firstId ? { id: firstId, customId: result.customId } : null
}

export function isMemoryToolOutputReady(
	part: Record<string, unknown>,
): boolean {
	return (
		part.state === "output-available" ||
		part.state === "done" ||
		(part.state === undefined && part.output !== undefined)
	)
}

export function extractMemoryToolOutputs(message: {
	parts?: readonly unknown[]
}): MemoryToolOutput[] {
	const parts = Array.isArray(message.parts) ? message.parts : []
	const outputs: MemoryToolOutput[] = []

	for (let partIndex = 0; partIndex < parts.length; partIndex++) {
		const part = parts[partIndex]
		if (!isObject(part)) continue
		const type = part.type
		if (
			typeof type !== "string" ||
			!MEMORY_TOOL_PART_TYPES.includes(
				type as (typeof MEMORY_TOOL_PART_TYPES)[number],
			)
		)
			continue
		if (!isMemoryToolOutputReady(part)) continue
		outputs.push({ output: normalizeOutput(part.output) })
	}

	return outputs
}

export function buildCitationIndex(
	outputs: MemoryToolOutput[],
): Map<string, CitationTarget> {
	const index = new Map<string, CitationTarget>()

	for (const { output } of outputs) {
		for (const result of output.results ?? []) {
			if (result.citationId)
				addTarget(
					index,
					result.citationId,
					citationTargetForResult(result.citationId, result),
				)
		}

		for (const sourceId of output.sourceIds ?? []) {
			if (index.has(sourceId)) continue
			const matchingResult = (output.results ?? []).find(
				(result) => result.citationId === sourceId || result.id === sourceId,
			)
			if (matchingResult)
				addTarget(
					index,
					sourceId,
					citationTargetForResult(sourceId, matchingResult),
				)
		}
	}

	return index
}

export function extractDocumentIdsFromMemoryOutput(
	output: MemoryToolResult,
): string[] {
	const ids: string[] = []
	ids.push(...(output.documentIds ?? []))
	for (const result of output.results ?? []) {
		if (result.id) ids.push(result.id)
		if (result.documentId) ids.push(result.documentId)
		if (result.internalDocumentId) ids.push(result.internalDocumentId)
		ids.push(...(result.documentIds ?? []))
		if (result.document?.id) ids.push(result.document.id)
		if (result.document?.customId) ids.push(result.document.customId)
		for (const doc of result.documents ?? []) {
			if (doc.internalDocumentId) ids.push(doc.internalDocumentId)
			if (doc.id) ids.push(doc.id)
			if (doc.customId) ids.push(doc.customId)
		}
	}
	return dedupe(ids).slice(0, MAX_INLINE_GRAPH_DOCUMENT_IDS)
}

export async function fetchDocumentsByIds(
	ids: string[],
): Promise<DocumentWithMemories[]> {
	const uniqueIds = dedupe(ids)
	if (uniqueIds.length === 0) return []

	const fetchBy = async (by: "id" | "customId", requestedIds: string[]) => {
		const response = await $fetch("@post/documents/documents/by-ids", {
			body: {
				ids: requestedIds,
				by,
			},
			disableValidation: true,
		})
		const result = response as {
			error?: { message?: string } | null
			data?: { documents?: DocumentWithMemories[] } | null
		}
		if (result.error) {
			throw new Error("Failed to fetch source documents", {
				cause: result.error,
			})
		}
		return result.data?.documents ?? []
	}

	const byIdDocs = await fetchBy("id", uniqueIds)
	const seen = new Set<string>()
	const foundLookup = new Set<string>()
	for (const doc of byIdDocs) {
		if (doc.id) {
			seen.add(doc.id)
			foundLookup.add(doc.id)
		}
		if (doc.customId) foundLookup.add(doc.customId)
	}

	const unresolved = uniqueIds.filter((id) => !foundLookup.has(id))
	const byCustomDocs =
		unresolved.length > 0 ? await fetchBy("customId", unresolved) : []
	const merged = [...byIdDocs]
	for (const doc of byCustomDocs) {
		if (doc.id && !seen.has(doc.id)) {
			seen.add(doc.id)
			merged.push(doc)
		}
	}

	return merged
}

export function mapDocumentsByKnownIds(
	documents: DocumentWithMemories[],
): Map<string, DocumentWithMemories> {
	const map = new Map<string, DocumentWithMemories>()
	for (const doc of documents) {
		if (doc.id) map.set(doc.id, doc)
		if (doc.customId) map.set(doc.customId, doc)
	}
	return map
}

function hasDisplayMetadata(target: CitationTarget): boolean {
	return !!(
		target.title?.trim() ||
		target.documentId ||
		target.customId ||
		target.url ||
		target.type ||
		target.summary?.trim()
	)
}

export function getCitationDisplay(
	target: CitationTarget,
	document?: DocumentWithMemories,
): CitationDisplay {
	const memoryOnly = !document && !hasDisplayMetadata(target)
	const summary =
		document?.summary ||
		target.summary ||
		target.content ||
		(document as { content?: string } | undefined)?.content ||
		null

	return {
		title: memoryOnly
			? "Memory"
			: document?.title?.trim() ||
				target.title?.trim() ||
				document?.customId ||
				target.customId ||
				target.documentId ||
				target.sourceId,
		summary: summary ? summary.trim() : null,
		kind: (document?.type || target.type || target.kind || "memory").replaceAll(
			"_",
			" ",
		),
	}
}

export function getDocumentSourceUrl(
	document: Pick<DocumentWithMemories, "type" | "url"> & {
		customId?: string | null
	},
) {
	const url = document.url ?? null
	const googleDocTypes: Record<string, { prefix: string; apiPattern: RegExp }> =
		{
			google_doc: {
				prefix: "https://docs.google.com/document/d/",
				apiPattern: /docs\.googleapis\.com\/v1\/documents\/([A-Za-z0-9_-]+)/,
			},
			google_sheet: {
				prefix: "https://docs.google.com/spreadsheets/d/",
				apiPattern:
					/sheets\.googleapis\.com\/v4\/spreadsheets\/([A-Za-z0-9_-]+)/,
			},
			google_slide: {
				prefix: "https://docs.google.com/presentation/d/",
				apiPattern:
					/slides\.googleapis\.com\/v1\/presentations\/([A-Za-z0-9_-]+)/,
			},
		}
	const googleDoc = document.type ? googleDocTypes[document.type] : undefined
	if (!googleDoc) return url
	if (document.customId) return `${googleDoc.prefix}${document.customId}/edit`
	const apiId = url?.match(googleDoc.apiPattern)?.[1]
	return apiId ? `${googleDoc.prefix}${apiId}/edit` : url
}
