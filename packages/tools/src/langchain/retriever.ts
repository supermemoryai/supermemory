import { Document } from "@langchain/core/documents"
import {
	BaseRetriever,
	type BaseRetrieverInput,
} from "@langchain/core/retrievers"
import Supermemory from "supermemory"
import {
	CLIENT_OPTIONS,
	DEFAULT_VALUES,
	clampSearchLimit,
} from "../tools-shared"
import type { SupermemoryToolsConfig } from "../types"

export interface SupermemoryRetrieverOptions extends BaseRetrieverInput {
	/** Container tag to scope the search to. Required. */
	containerTag: string
	/** Maximum number of results to return. */
	limit?: number
	config?: SupermemoryToolsConfig
}

/**
 * LangChain retriever backed by supermemory's hybrid search, so supermemory
 * can be dropped into an existing RAG chain or agent that already accepts a
 * `BaseRetriever`.
 */
export class SupermemoryRetriever extends BaseRetriever {
	lc_namespace = ["supermemory", "retrievers"]

	private client: Supermemory
	private containerTag: string
	private limit: number

	constructor(apiKey: string, options: SupermemoryRetrieverOptions) {
		super(options)
		this.client = new Supermemory({
			apiKey,
			...CLIENT_OPTIONS,
			...(options.config?.baseUrl ? { baseURL: options.config.baseUrl } : {}),
		})
		this.containerTag = options.containerTag
		this.limit = clampSearchLimit(options.limit ?? DEFAULT_VALUES.limit)
	}

	override async _getRelevantDocuments(query: string): Promise<Document[]> {
		// Hybrid search, the same call ai-sdk.ts uses: extracted memories when
		// they exist, source chunks otherwise.
		const response = await this.client.search({
			q: query,
			containerTag: this.containerTag,
			limit: this.limit,
			threshold: DEFAULT_VALUES.searchThreshold,
			searchMode: "hybrid",
		})

		return response.results.map(
			(result) =>
				new Document({
					pageContent: result.memory ?? result.chunk ?? "",
					metadata: {
						id: result.id,
						containerTag: this.containerTag,
						similarity: result.similarity,
						updatedAt: result.updatedAt,
					},
				}),
		)
	}
}
