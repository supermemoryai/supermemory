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
import type { Supermemory } from "supermemory"
import {
	DEFAULT_VALUES,
	SEARCH_LIMIT_BOUNDS,
	createToolsClient,
	isNotFoundError,
} from "../tools-shared"
import type { SupermemoryToolsConfig } from "../types"
import { fromSupermemoryNamespace, toSupermemoryNamespace } from "./namespace"

const KEY_FIELD = "langgraphKey"
const PAGE_SIZE = 100

type StoredDocument = Awaited<ReturnType<Supermemory["documents"]["get"]>>

/** LangGraph's persistent store interface backed by Supermemory v5. */
export class SupermemoryStore extends BaseStore {
	private client

	constructor(apiKey: string, config?: SupermemoryToolsConfig) {
		super()
		this.client = createToolsClient(apiKey, config)
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

	private async runPut(operation: PutOperation): Promise<void> {
		const namespace = toSupermemoryNamespace(operation.namespace)
		const existing = await this.getDocument(namespace, operation.key)

		if (operation.value === null) {
			if (!existing) return
			const document = await this.settle(namespace, existing)
			const response = await this.client.documents.delete(namespace, {
				ids: [document.id],
			})
			if (response.count !== 1) {
				throw new Error(
					response.errors[0]?.error ??
						`Failed to delete LangGraph item ${operation.key}`,
				)
			}
			return
		}

		const content = JSON.stringify(operation.value)
		if (existing) {
			const document = await this.settle(namespace, existing)
			await this.client.documents.update(namespace, document.id, { content })
			return
		}

		await this.client.add(namespace, {
			content,
			id: operation.key,
			metadata: { [KEY_FIELD]: operation.key },
			taskType: "superrag",
		})
	}

	private async runGet(operation: GetOperation): Promise<Item | null> {
		const namespace = toSupermemoryNamespace(operation.namespace)
		const found = await this.getDocument(namespace, operation.key)
		if (!found) return null
		return this.toItem(
			await this.settle(namespace, found),
			operation.namespace,
			operation.key,
		)
	}

	private async runSearch(operation: SearchOperation) {
		const limit = operation.limit ?? DEFAULT_VALUES.limit
		const offset = operation.offset ?? 0
		const namespaces = await this.namespacesUnder(operation.namespacePrefix)
		const pages = await Promise.all(
			namespaces.map((namespace) =>
				operation.query
					? this.searchNamespace(namespace, operation.query)
					: this.listNamespace(namespace),
			),
		)
		const items = pages.flat()

		if (operation.query) {
			items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
		}
		const filter = operation.filter
		const matching = filter
			? items.filter((item) => matchesFilter(item.value, filter))
			: items
		return matching.slice(offset, offset + limit)
	}

	private async searchNamespace(namespace: string[], query: string) {
		const encoded = toSupermemoryNamespace(namespace)
		// ponytail: one maximum API page per namespace; add server-side paging if
		// search gains it and stores need more than the top 50 candidates.
		const response = await this.client.search(encoded, {
			query,
			searchMode: "chunks",
			limit: SEARCH_LIMIT_BOUNDS.max,
			threshold: 0,
		})

		const items = await Promise.all(
			response.results.map(async (result) => {
				const key = result.metadata[KEY_FIELD]
				if (typeof key !== "string") return null
				const document = await this.getDocument(encoded, key)
				if (!document) return null
				return {
					...this.toItem(document, namespace, key),
					score: result.similarity,
				}
			}),
		)
		return items.filter((item) => item !== null)
	}

	private async listNamespace(namespace: string[]) {
		const encoded = toSupermemoryNamespace(namespace)
		const items: Array<Item & { score?: number }> = []
		let page = 1
		while (true) {
			const response = await this.client.list(encoded, "documents", {
				page,
				limit: PAGE_SIZE,
			})
			const documents = await Promise.all(
				response.documents.map(async (listed) => {
					const document = await this.getDocument(encoded, listed.id)
					return document ? this.settle(encoded, document) : null
				}),
			)
			for (const document of documents) {
				if (!document) continue
				const key = document.metadata[KEY_FIELD]
				if (typeof key !== "string") continue
				items.push(this.toItem(document, namespace, key))
			}
			if (page >= response.pagination.totalPages) return items
			page += 1
		}
	}

	private async runListNamespaces(operation: ListNamespacesOperation) {
		const seen = new Map<string, string[]>()
		const conditions = operation.matchConditions ?? []
		for (const namespace of await this.listManagedNamespaces()) {
			let candidate = namespace
			if (operation.maxDepth !== undefined) {
				candidate = candidate.slice(0, operation.maxDepth)
			}
			if (!conditions.every((condition) => matches(candidate, condition))) {
				continue
			}
			seen.set(candidate.join("\u0000"), candidate)
		}

		return [...seen.values()]
			.sort((a, b) => a.join("\u0000").localeCompare(b.join("\u0000")))
			.slice(operation.offset, operation.offset + operation.limit)
	}

	private async namespacesUnder(prefix: string[]): Promise<string[][]> {
		const namespaces = await this.listManagedNamespaces()
		return namespaces.filter(
			(namespace) =>
				namespace.length >= prefix.length &&
				prefix.every((segment, index) => namespace[index] === segment),
		)
	}

	private async listManagedNamespaces(): Promise<string[][]> {
		const namespaces: string[][] = []
		let page = 1
		while (true) {
			const response = await this.client.namespaces.list({
				page,
				limit: PAGE_SIZE,
			})
			for (const entry of response.namespaces) {
				const decoded = fromSupermemoryNamespace(entry.namespace)
				if (decoded) namespaces.push(decoded)
			}
			if (page >= response.pagination.totalPages) return namespaces
			page += 1
		}
	}

	private async getDocument(
		namespace: string,
		id: string,
	): Promise<StoredDocument | null> {
		try {
			return await this.client.documents.get(namespace, id)
		} catch (error) {
			if (isNotFoundError(error)) return null
			throw error
		}
	}

	private async settle(
		namespace: string,
		document: StoredDocument,
	): Promise<StoredDocument> {
		let current = document
		for (let attempt = 0; !isSettled(current.system.status); attempt++) {
			if (attempt === 60) {
				throw new Error(`Supermemory document ${document.id} still processing`)
			}
			await new Promise((resolve) => setTimeout(resolve, 1000))
			current = await this.client.documents.get(namespace, document.id)
		}
		return current
	}

	private toItem(
		document: StoredDocument,
		namespace: string[],
		key: string,
	): Item {
		return {
			value: parseValue(document.content),
			key,
			namespace,
			createdAt: new Date(document.system.createdAt),
			updatedAt: new Date(document.system.updatedAt),
		}
	}
}

function isSettled(status: string): boolean {
	return status === "done" || status === "failed"
}

function parseValue(content: string | null): Record<string, unknown> {
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

function matchesFilter(
	value: Record<string, unknown>,
	filter: Record<string, unknown>,
): boolean {
	return Object.entries(filter).every(([field, expected]) =>
		compareValues(value[field], expected),
	)
}

function compareValues(actual: unknown, expected: unknown): boolean {
	if (expected === null || typeof expected !== "object") {
		return actual === expected
	}
	return Object.entries(expected).every(([operator, value]) => {
		switch (operator) {
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

function matches(namespace: string[], condition: MatchCondition): boolean {
	if (condition.path.length > namespace.length) return false
	const start =
		condition.matchType === "suffix"
			? namespace.length - condition.path.length
			: 0
	return condition.path.every(
		(pattern, index) => pattern === "*" || namespace[start + index] === pattern,
	)
}
