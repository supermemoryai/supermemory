import type OpenAI from "openai"
import { createNovitaClient, createNovitaMiddleware } from "./middleware"
import {
	NOVITA_MODELS,
	NOVITA_EMBEDDING_MODELS,
	NOVITA_ENDPOINTS,
	type NovitaMiddlewareOptions,
	type NovitaClientOptions,
	type NovitaModel,
	type NovitaEmbeddingModel,
} from "./types"

export {
	createSearchMemoriesFunction,
	createAddMemoryFunction,
	createGetProfileFunction,
	createDocumentListFunction,
	createDocumentDeleteFunction,
	createDocumentAddFunction,
	createMemoryForgetFunction,
	supermemoryTools,
	getToolDefinitions,
	createToolCallExecutor,
	createToolCallsExecutor,
	createSearchMemoriesTool,
	createAddMemoryTool,
	createGetProfileTool,
	createDocumentListTool,
	createDocumentDeleteTool,
	createDocumentAddTool,
	createMemoryForgetTool,
	memoryToolSchemas,
	type MemorySearchResult,
	type MemoryAddResult,
	type ProfileResult,
	type DocumentListResult,
	type DocumentDeleteResult,
	type DocumentAddResult,
	type MemoryForgetResult,
} from "../openai/tools"

export type {
	NovitaMiddlewareOptions as WithSupermemoryOptions,
	NovitaClientOptions,
	NovitaModel,
	NovitaEmbeddingModel,
}

export { NOVITA_MODELS, NOVITA_EMBEDDING_MODELS, NOVITA_ENDPOINTS }

export function withSupermemory(
	containerTag: string,
	options?: NovitaMiddlewareOptions,
	clientOptions?: NovitaClientOptions,
): OpenAI {
	if (!process.env.SUPERMEMORY_API_KEY) {
		throw new Error("SUPERMEMORY_API_KEY is not set")
	}

	const novitaClient = createNovitaClient(clientOptions)
	return createNovitaMiddleware(novitaClient, containerTag, options)
}

export function wrapNovitaClient(
	novitaClient: OpenAI,
	containerTag: string,
	options?: NovitaMiddlewareOptions,
): OpenAI {
	if (!process.env.SUPERMEMORY_API_KEY) {
		throw new Error("SUPERMEMORY_API_KEY is not set")
	}

	return createNovitaMiddleware(novitaClient, containerTag, options)
}

export function createNovita(options?: NovitaClientOptions): OpenAI {
	return createNovitaClient(options)
}
