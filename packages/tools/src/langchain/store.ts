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
 * key becomes `customId`, and the value is stored as JSON content. Writes and
 * reads wait for an item still being ingested by supermemory.
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

		const items = response.results.map((result) => ({
			...this.toItem(result),
			score: result.score,
		}))

		// Values are stored as JSON content, so the filter runs client-side over
		// the fetched page and can return fewer than `limit` items.
		const { filter } = operation
		const matching = filter
			? items.filter((item) =>
					Object.entries(filter).every(([field, expected]) =>
						compareValues(item.value[field], expected),
					),
				)
			: items

		return matching.slice(offset, offset + limit)
	}

	private async runPut(operation: PutOperation): Promise<void> {
		const found = await this.findByKey(operation.namespace, operation.key)
		const existing = found && (await this.settle(found))

		if (operation.value === null) {
			if (existing) await this.client.documents.delete(existing.id)
			return
		}

		const content = JSON.stringify(operation.value)

		// add() with an existing customId appends to the content; update replaces.
		if (existing) {
			await this.client.documents.update(existing.id, { content })
			return
		}

		const containerTag = namespaceToContainerTag(operation.namespace)

		await this.client.documents.add({
			content,
			containerTags: [containerTag],
			customId: operation.key,
			metadata: {
				[KEY_FIELD]: operation.key,
				[NAMESPACE_FIELD]: containerTag,
			},
		})
	}

	private async runGet(operation: GetOperation): Promise<Item | null> {
		const found = await this.findByKey(operation.namespace, operation.key)
		if (!found) return null
		const document = await this.settle(found)

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

	// Mid-ingestion the API drops updates, rejects deletes with 409 and returns
	// null content, so wait for a document to settle before touching it.
	// ponytail: fixed 1s poll capped at 60s; make it configurable if needed.
	private async settle(document: {
		id: string
		status: string
		content?: string | null
		createdAt: string
		updatedAt: string
	}) {
		let current = document
		for (let attempt = 0; !isSettled(current.status); attempt++) {
			if (attempt === 60) {
				throw new Error(`supermemory document ${document.id} still processing`)
			}
			await new Promise((resolve) => setTimeout(resolve, 1000))
			current = await this.client.documents.get(document.id)
		}
		return current
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

/**
 * LangGraph's search filter semantics: exact match, or `$eq`/`$ne`/`$gt`/
 * `$gte`/`$lt`/`$lte`/`$in`/`$nin`. Mirrors InMemoryStore, which doesn't
 * export its helper.
 */
function compareValues(actual: unknown, expected: unknown): boolean {
	if (expected === null || typeof expected !== "object") {
		return actual === expected
	}
	return Object.entries(expected).every(([op, value]) => {
		switch (op) {
			case "$eq":
				return actual === value
			case "$ne":
				return actual !== value
			case "$gt":
				return Number(actual) > Number(value)
			case "$gte":
				return Number(actual) >= Number(value)
			case "$lt":
				return Number(actual) < Number(value)
			case "$lte":
				return Number(actual) <= Number(value)
			case "$in":
				return Array.isArray(value) && value.includes(actual)
			case "$nin":
				return !Array.isArray(value) || !value.includes(actual)
			default:
				return false
		}
	})
}

function isSettled(status: string): boolean {
	return status === "done" || status === "failed"
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
