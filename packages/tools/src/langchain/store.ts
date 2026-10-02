import Supermemory from "supermemory"
import { BaseStore } from "@langchain/langgraph"
import type { Item, Operation, OperationResults } from "@langchain/langgraph"
import type { SearchItem } from "@langchain/langgraph-checkpoint"
import { CLIENT_OPTIONS } from "../tools-shared"
import type { SupermemoryToolsConfig } from "../types"
import { namespaceToContainerTag } from "./container-tag"

/**
 * LangGraph `BaseStore` backed by supermemory.
 *
 * `BaseStore` declares only `batch` as abstract — `get`, `put`, `search`,
 * `delete` and `listNamespaces` are concrete helpers that build operations and
 * delegate here, so implementing `batch` implements the whole interface.
 *
 * Namespaces map onto container tags (see `./container-tag`), keys onto
 * document `customId`, and `search({ query })` onto supermemory's hybrid
 * search.
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
			if ("query" in operation || "namespacePrefix" in operation) {
				results.push(await this.runSearch(operation))
				continue
			}
			if ("value" in operation) {
				results.push(await this.runPut(operation))
				continue
			}
			if ("key" in operation) {
				results.push(await this.runGet(operation))
				continue
			}
			results.push(await this.runListNamespaces())
		}

		return results as OperationResults<Op>
	}

	private async runSearch(operation: {
		namespacePrefix: string[]
		query?: string
		limit?: number
		offset?: number
	}): Promise<SearchItem[]> {
		const response = await this.client.search({
			q: operation.query ?? "",
			containerTag: namespaceToContainerTag(operation.namespacePrefix),
			limit: operation.limit,
			searchMode: "hybrid",
		})

		// ponytail: result -> SearchItem mapping is the remaining work; the
		// supermemory result shape (memory vs chunk entries) needs deciding
		// before this is useful.
		throw new Error(
			`SupermemoryStore.search is not implemented yet (received ${response.results?.length ?? 0} results)`,
		)
	}

	private async runPut(operation: {
		namespace: string[]
		key: string
		value: Record<string, unknown> | null
	}): Promise<void> {
		if (operation.value === null) {
			throw new Error("SupermemoryStore delete is not implemented yet")
		}

		await this.client.documents.add({
			content: JSON.stringify(operation.value),
			containerTags: [namespaceToContainerTag(operation.namespace)],
			customId: operation.key,
		})
	}

	private async runGet(_operation: {
		namespace: string[]
		key: string
	}): Promise<Item | null> {
		throw new Error("SupermemoryStore.get is not implemented yet")
	}

	private async runListNamespaces(): Promise<string[][]> {
		throw new Error("SupermemoryStore.listNamespaces is not implemented yet")
	}
}
