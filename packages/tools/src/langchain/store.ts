import { BaseStore } from "@langchain/langgraph"
import type { Item, Operation, OperationResults } from "@langchain/langgraph"
import type { SearchItem } from "@langchain/langgraph-checkpoint"
import Supermemory from "supermemory"
import { CLIENT_OPTIONS } from "../tools-shared"
import type { SupermemoryToolsConfig } from "../types"
import {
	containerTagToNamespace,
	namespaceToContainerTag,
} from "./container-tag"

/** Page size used when scanning documents to resolve a key. */
const LOOKUP_PAGE_SIZE = 100

/**
 * Metadata keys used to carry the store's addressing back out of search
 * results, which expose `documentId` but not `customId`.
 */
const KEY_FIELD = "langgraphKey"
const NAMESPACE_FIELD = "langgraphNamespace"

/**
 * LangGraph `BaseStore` backed by supermemory.
 *
 * `BaseStore` declares only `batch` as abstract — `get`, `put`, `search`,
 * `delete` and `listNamespaces` are concrete helpers that build operations and
 * delegate here, so implementing `batch` implements the whole interface.
 *
 * An item is one supermemory document: the namespace becomes the container tag
 * (see `./container-tag`), the key becomes the document's `customId`, and the
 * value is stored as JSON content.
 */
export class SupermemoryStore extends BaseStore {
	private client: Supermemory

	constructor(apiKey: string, config?: SupermemoryToolsConfig) {
		super()
		this.client = new Supermemory({
			apiKey,
			...CLIENT_OPTIONS,
			...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
		})
	}

	async batch<Op extends Operation[]>(
		operations: Op,
	): Promise<OperationResults<Op>> {
		const results = []

		for (const operation of operations) {
			if ("namespacePrefix" in operation) {
				results.push(await this.runSearch(operation))
			} else if ("value" in operation) {
				results.push(await this.runPut(operation))
			} else if ("key" in operation) {
				results.push(await this.runGet(operation))
			} else {
				results.push(await this.runListNamespaces(operation))
			}
		}

		return results as OperationResults<Op>
	}

	private async runSearch(operation: {
		namespacePrefix: string[]
		query?: string
		limit?: number
		offset?: number
	}): Promise<SearchItem[]> {
		const limit = operation.limit ?? 10
		const offset = operation.offset ?? 0

		const response = await this.client.search.documents({
			q: operation.query ?? "",
			containerTag: namespaceToContainerTag(operation.namespacePrefix),
			// Values are stored as JSON content, so the document body is the item.
			includeFullDocs: true,
			limit: limit + offset,
		})

		return response.results.slice(offset).map((result) => ({
			...this.toItem(result),
			score: result.score,
		}))
	}

	private async runPut(operation: {
		namespace: string[]
		key: string
		value: Record<string, unknown> | null
	}): Promise<void> {
		if (operation.value === null) {
			await this.deleteByKey(operation.namespace, operation.key)
			return
		}

		await this.client.documents.add({
			content: JSON.stringify(operation.value),
			containerTags: [namespaceToContainerTag(operation.namespace)],
			customId: operation.key,
			metadata: {
				[KEY_FIELD]: operation.key,
				[NAMESPACE_FIELD]: namespaceToContainerTag(operation.namespace),
			},
		})
	}

	private async runGet(operation: {
		namespace: string[]
		key: string
	}): Promise<Item | null> {
		const document = await this.findByKey(operation.namespace, operation.key)
		if (!document) return null

		return {
			value: parseValue(document.content),
			key: operation.key,
			namespace: operation.namespace,
			createdAt: new Date(document.createdAt),
			updatedAt: new Date(document.updatedAt),
		}
	}

	private async runListNamespaces(operation: {
		matchConditions?: { matchType: "prefix" | "suffix"; path: string[] }[]
		maxDepth?: number
		limit: number
		offset: number
	}): Promise<string[][]> {
		const seen = new Map<string, string[]>()

		for await (const document of this.scanDocuments()) {
			for (const tag of document.containerTags ?? []) {
				let namespace = containerTagToNamespace(tag)
				if (operation.maxDepth !== undefined) {
					namespace = namespace.slice(0, operation.maxDepth)
				}
				const matches = (operation.matchConditions ?? []).every((condition) =>
					condition.matchType === "prefix"
						? matchesPrefix(namespace, condition.path)
						: matchesSuffix(namespace, condition.path),
				)
				if (!matches) continue
				seen.set(namespace.join("\u0000"), namespace)
			}
		}

		const namespaces = [...seen.values()].sort((a, b) =>
			a.join("\u0000").localeCompare(b.join("\u0000")),
		)
		return namespaces.slice(
			operation.offset,
			operation.offset + operation.limit,
		)
	}

	private async deleteByKey(namespace: string[], key: string): Promise<void> {
		const document = await this.findByKey(namespace, key)
		if (!document) return
		await this.client.documents.delete(document.id)
	}

	/**
	 * Resolve a store key to its document. Search exposes `documentId` but not
	 * `customId`, so the listing endpoint is used instead, scoped to the
	 * namespace's container tag.
	 */
	private async findByKey(namespace: string[], key: string) {
		const containerTag = namespaceToContainerTag(namespace)

		for await (const document of this.scanDocuments(containerTag)) {
			if (document.customId === key) return document
		}
		return undefined
	}

	private async *scanDocuments(containerTag?: string) {
		let page = 1

		while (true) {
			const response = await this.client.documents.list({
				...(containerTag ? { containerTags: [containerTag] } : {}),
				includeContent: true,
				limit: LOOKUP_PAGE_SIZE,
				page,
			})

			yield* response.memories

			if (response.memories.length < LOOKUP_PAGE_SIZE) return
			page += 1
		}
	}

	private toItem(result: {
		documentId: string
		createdAt: string
		updatedAt: string
		content?: string | null
		metadata: Record<string, unknown> | null
	}): Item {
		const key = asString(result.metadata?.[KEY_FIELD]) ?? result.documentId
		const tag = asString(result.metadata?.[NAMESPACE_FIELD])

		return {
			value: parseValue(result.content),
			key,
			namespace: tag ? containerTagToNamespace(tag) : [],
			createdAt: new Date(result.createdAt),
			updatedAt: new Date(result.updatedAt),
		}
	}
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined
}

/**
 * Values are written as JSON. Anything else — a document ingested outside this
 * store, for instance — is surfaced as raw content rather than throwing.
 */
function parseValue(
	content: string | null | undefined,
): Record<string, unknown> {
	if (!content) return {}
	try {
		const parsed: unknown = JSON.parse(content)
		return parsed !== null && typeof parsed === "object"
			? (parsed as Record<string, unknown>)
			: { value: parsed }
	} catch {
		return { content }
	}
}

/** `"*"` matches any single segment, per LangGraph's NameSpacePath. */
function segmentMatches(segment: string, pattern: string): boolean {
	return pattern === "*" || segment === pattern
}

function matchesPrefix(namespace: string[], prefix: string[]): boolean {
	if (prefix.length > namespace.length) return false
	return prefix.every((pattern, i) =>
		segmentMatches(namespace[i] as string, pattern),
	)
}

function matchesSuffix(namespace: string[], suffix: string[]): boolean {
	if (suffix.length > namespace.length) return false
	const start = namespace.length - suffix.length
	return suffix.every((pattern, i) =>
		segmentMatches(namespace[start + i] as string, pattern),
	)
}
