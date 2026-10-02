import { BaseStore } from "@langchain/langgraph"
import type {
	GetOperation,
	Item,
	ListNamespacesOperation,
	MatchCondition,
	Operation,
	OperationResults,
	PutOperation,
	SearchOperation,
} from "@langchain/langgraph"
import type { SearchItem } from "@langchain/langgraph-checkpoint"
import Supermemory from "supermemory"
import { CLIENT_OPTIONS, DEFAULT_VALUES } from "../tools-shared"
import type { SupermemoryToolsConfig } from "../types"
import {
	containerTagToNamespace,
	namespaceToContainerTag,
} from "./container-tag"

const LOOKUP_PAGE_SIZE = 100

// Search results expose documentId but not customId, so addressing is carried
// in metadata.
const KEY_FIELD = "langgraphKey"
const NAMESPACE_FIELD = "langgraphNamespace"

/**
 * LangGraph `BaseStore` backed by supermemory.
 *
 * `batch` is the only abstract member — get/put/search/delete/listNamespaces
 * are concrete helpers that delegate to it.
 *
 * An item is one supermemory document: namespace becomes the container tag,
 * key becomes `customId`, and the value is stored as JSON content.
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

	private async runSearch(operation: SearchOperation): Promise<SearchItem[]> {
		const limit = operation.limit ?? DEFAULT_VALUES.limit
		const offset = operation.offset ?? 0

		const response = await this.client.search.documents({
			q: operation.query ?? "",
			// Array form: the singular containerTag is reported as ignored on some
			// paths (#1704).
			containerTags: [namespaceToContainerTag(operation.namespacePrefix)],
			includeFullDocs: true,
			limit: limit + offset,
		})

		return response.results.slice(offset).map((result) => ({
			...this.toItem(result),
			score: result.score,
		}))
	}

	private async runPut(operation: PutOperation): Promise<void> {
		if (operation.value === null) {
			const document = await this.findByKey(operation.namespace, operation.key)
			if (document) await this.client.documents.delete(document.id)
			return
		}

		const containerTag = namespaceToContainerTag(operation.namespace)

		await this.client.documents.add({
			content: JSON.stringify(operation.value),
			containerTags: [containerTag],
			customId: operation.key,
			metadata: {
				[KEY_FIELD]: operation.key,
				[NAMESPACE_FIELD]: containerTag,
			},
		})
	}

	private async runGet(operation: GetOperation): Promise<Item | null> {
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

	private async runListNamespaces(
		operation: ListNamespacesOperation,
	): Promise<string[][]> {
		const conditions = operation.matchConditions ?? []
		const seen = new Map<string, string[]>()

		for await (const document of this.scanDocuments()) {
			for (const tag of document.containerTags ?? []) {
				let namespace = containerTagToNamespace(tag)
				if (operation.maxDepth !== undefined) {
					namespace = namespace.slice(0, operation.maxDepth)
				}
				if (!conditions.every((c) => matches(namespace, c))) continue
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

	// customId is only unique within a container tag, so get(customId) could
	// hit another namespace. List within the tag, narrowed by the key metadata.
	private async findByKey(namespace: string[], key: string) {
		const containerTag = namespaceToContainerTag(namespace)
		const filters = { AND: [{ key: KEY_FIELD, value: key }] }

		for await (const document of this.scanDocuments(containerTag, filters)) {
			if (document.customId === key) return document
		}
		return undefined
	}

	private async *scanDocuments(
		containerTag?: string,
		filters?: Supermemory.DocumentListParams["filters"],
	) {
		let page = 1

		while (true) {
			const response = await this.client.documents.list({
				...(containerTag ? { containerTags: [containerTag] } : {}),
				...(filters ? { filters } : {}),
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
		const key = result.metadata?.[KEY_FIELD]
		const tag = result.metadata?.[NAMESPACE_FIELD]

		return {
			value: parseValue(result.content),
			key: typeof key === "string" ? key : result.documentId,
			namespace: typeof tag === "string" ? containerTagToNamespace(tag) : [],
			createdAt: new Date(result.createdAt),
			updatedAt: new Date(result.updatedAt),
		}
	}
}

/** Documents ingested outside this store aren't JSON; surface them raw. */
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

/** `"*"` in a path matches any single segment, per LangGraph's NameSpacePath. */
function matches(namespace: string[], condition: MatchCondition): boolean {
	const { matchType, path } = condition
	if (path.length > namespace.length) return false
	const start = matchType === "suffix" ? namespace.length - path.length : 0
	return path.every(
		(pattern, i) => pattern === "*" || namespace[start + i] === pattern,
	)
}
