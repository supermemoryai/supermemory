import { Document } from "@langchain/core/documents"
import {
	BaseRetriever,
	type BaseRetrieverInput,
} from "@langchain/core/retrievers"
import {
	DEFAULT_VALUES,
	clampSearchLimit,
	createToolsClient,
} from "../tools-shared"
import type { SupermemoryToolsConfig } from "../types"

export interface SupermemoryRetrieverOptions extends BaseRetrieverInput {
	/** Supermemory v5 namespace to search. */
	namespace: string
	/** Maximum number of documents to return. */
	limit?: number
	config?: SupermemoryToolsConfig
}

/** LangChain retriever backed by Supermemory's hybrid memory search. */
export class SupermemoryRetriever extends BaseRetriever {
	lc_namespace = ["supermemory", "retrievers"]

	private client
	private namespace: string
	private limit: number

	constructor(apiKey: string, options: SupermemoryRetrieverOptions) {
		super(options)
		this.client = createToolsClient(apiKey, options.config)
		this.namespace = options.namespace
		this.limit = clampSearchLimit(options.limit ?? DEFAULT_VALUES.limit)
	}

	override async _getRelevantDocuments(query: string): Promise<Document[]> {
		const response = await this.client.search(this.namespace, {
			query,
			limit: this.limit,
			threshold: DEFAULT_VALUES.searchThreshold,
			searchMode: "hybrid",
		})

		return response.results.flatMap((result) => {
			const pageContent = result.memory ?? result.chunk
			if (!pageContent) return []
			return [
				new Document({
					pageContent,
					metadata: {
						...result.metadata,
						id: result.id,
						namespace: this.namespace,
						similarity: result.similarity,
						createdAt: result.system.createdAt,
						updatedAt: result.system.updatedAt,
					},
				}),
			]
		})
	}
}
