import OpenAI from "openai"
import {
	NOVITA_ENDPOINTS,
	type NovitaClientOptions,
	type NovitaMiddlewareOptions,
} from "./types"

const NOVITA_API_KEY = process.env.NOVITA_API_KEY

export function createNovitaClient(options?: NovitaClientOptions): OpenAI {
	const apiKey = options?.apiKey ?? NOVITA_API_KEY

	if (!apiKey) {
		throw new Error(
			"NOVITA_API_KEY is not set — provide it via `options.apiKey` or set `process.env.NOVITA_API_KEY`",
		)
	}

	return new OpenAI({
		apiKey,
		baseURL: options?.baseURL ?? NOVITA_ENDPOINTS.OPENAI,
		...(options?.organization && { organization: options.organization }),
	})
}

export function createNovitaMiddleware(
	novitaClient: OpenAI,
	containerTag: string,
	options?: NovitaMiddlewareOptions,
): OpenAI {
	const logger = {
		info: (message: string, data?: Record<string, unknown>) => {
			if (options?.verbose) {
				console.log(`[novita-supermemory] ${message}`, data ?? "")
			}
		},
		error: (message: string, data?: Record<string, unknown>) => {
			console.error(`[novita-supermemory] ${message}`, data ?? "")
		},
		debug: (message: string, data?: Record<string, unknown>) => {
			if (options?.verbose) {
				console.debug(`[novita-supermemory] ${message}`, data ?? "")
			}
		},
	}

	const conversationId = options?.conversationId
	const mode = options?.mode ?? "profile"
	const addMemory = options?.addMemory ?? "never"
	const baseUrl = options?.baseUrl ?? "https://api.supermemory.ai"

	const originalCreate = novitaClient.chat.completions.create
	const originalResponsesCreate = novitaClient.responses?.create

	const getLastUserMessage = (
		messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
	) => {
		const lastUserMessage = messages
			.slice()
			.reverse()
			.find((msg) => msg.role === "user")

		return typeof lastUserMessage?.content === "string"
			? lastUserMessage.content
			: ""
	}

	const supermemoryProfileSearch = async (
		containerTag: string,
		queryText: string,
	): Promise<{
		profile: {
			static?: Array<{ memory: string; metadata?: Record<string, unknown> }>
			dynamic?: Array<{ memory: string; metadata?: Record<string, unknown> }>
		}
		searchResults: {
			results: Array<{ memory: string; metadata?: Record<string, unknown> }>
		}
	}> => {
		const payload = queryText
			? JSON.stringify({
					q: queryText,
					containerTag: containerTag,
				})
			: JSON.stringify({
					containerTag: containerTag,
				})

		const response = await fetch(`${baseUrl}/v4/profile`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
			},
			body: payload,
		})

		if (!response.ok) {
			const errorText = await response.text().catch(() => "Unknown error")
			throw new Error(
				`Supermemory profile search failed: ${response.status} ${response.statusText}. ${errorText}`,
			)
		}

		return await response.json()
	}

	const convertProfileToMarkdown = (data: {
		profile: {
			static?: Array<{ memory: string }>
			dynamic?: Array<{ memory: string }>
		}
		searchResults: { results: Array<{ memory: string }> }
	}): string => {
		const parts: string[] = []

		if (data.profile.static?.length) {
			parts.push("### Static Profile (Facts about user)")
			for (const item of data.profile.static) {
				parts.push(`- ${item.memory}`)
			}
		}

		if (data.profile.dynamic?.length) {
			parts.push("### Dynamic Context (Recent activity)")
			for (const item of data.profile.dynamic) {
				parts.push(`- ${item.memory}`)
			}
		}

		return parts.join("\n")
	}

	const deduplicateMemories = (data: {
		static?: Array<{ memory: string }>
		dynamic?: Array<{ memory: string }>
		searchResults?: Array<{ memory: string }>
	}): {
		static: string[]
		dynamic: string[]
		searchResults: string[]
	} => {
		const seen = new Set<string>()
		const result = {
			static: [] as string[],
			dynamic: [] as string[],
			searchResults: [] as string[],
		}

		for (const item of data.static ?? []) {
			const normalized = item.memory.toLowerCase().trim()
			if (!seen.has(normalized)) {
				seen.add(normalized)
				result.static.push(item.memory)
			}
		}

		for (const item of data.dynamic ?? []) {
			const normalized = item.memory.toLowerCase().trim()
			if (!seen.has(normalized)) {
				seen.add(normalized)
				result.dynamic.push(item.memory)
			}
		}

		for (const item of data.searchResults ?? []) {
			const normalized = item.memory.toLowerCase().trim()
			if (!seen.has(normalized)) {
				seen.add(normalized)
				result.searchResults.push(item.memory)
			}
		}

		return result
	}

	const addSystemPrompt = async (
		messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
		containerTag: string,
		mode: "profile" | "query" | "full",
	): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> => {
		const systemPromptExists = messages.some((msg) => msg.role === "system")
		const queryText = mode !== "profile" ? getLastUserMessage(messages) : ""

		const memoriesResponse = await supermemoryProfileSearch(
			containerTag,
			queryText,
		)

		const memoryCountStatic = memoriesResponse.profile.static?.length || 0
		const memoryCountDynamic = memoriesResponse.profile.dynamic?.length || 0

		logger.info("Memory search completed", {
			containerTag,
			memoryCountStatic,
			memoryCountDynamic,
			mode,
		})

		const deduplicated = deduplicateMemories({
			static: memoriesResponse.profile.static,
			dynamic: memoriesResponse.profile.dynamic,
			searchResults: memoriesResponse.searchResults?.results,
		})

		const profileData =
			mode !== "query"
				? convertProfileToMarkdown({
						profile: {
							static: deduplicated.static.map((m) => ({ memory: m })),
							dynamic: deduplicated.dynamic.map((m) => ({ memory: m })),
						},
						searchResults: { results: [] },
					})
				: ""

		const searchResultsMemories =
			mode !== "profile"
				? `Search results for user's recent message: \n${deduplicated.searchResults.map((memory) => `- ${memory}`).join("\n")}`
				: ""

		const memories = `${profileData}\n${searchResultsMemories}`.trim()

		if (!memories) {
			return messages
		}

		if (systemPromptExists) {
			return messages.map((msg) =>
				msg.role === "system"
					? { ...msg, content: `${msg.content} \n ${memories}` }
					: msg,
			)
		}

		return [{ role: "system" as const, content: memories }, ...messages]
	}

	const createWithMemory = async (
		params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
	) => {
		const messages = Array.isArray(params.messages) ? params.messages : []

		if (mode !== "profile") {
			const userMessage = getLastUserMessage(messages)
			if (!userMessage) {
				logger.debug("No user message found, skipping memory search")
				return originalCreate.call(novitaClient.chat.completions, params)
			}
		}

		logger.info("Starting memory search", {
			containerTag,
			conversationId,
			mode,
		})

		const enhancedMessages = await addSystemPrompt(messages, containerTag, mode)

		return originalCreate.call(novitaClient.chat.completions, {
			...params,
			messages: enhancedMessages,
		})
	}

	novitaClient.chat.completions.create =
		createWithMemory as typeof originalCreate

	if (originalResponsesCreate) {
		const createResponsesWithMemory = async (
			params: Parameters<typeof originalResponsesCreate>[0],
		) => {
			const input = typeof params.input === "string" ? params.input : ""

			if (mode !== "profile" && !input) {
				logger.debug("No input found for Responses API, skipping memory search")
				return originalResponsesCreate.call(novitaClient.responses, params)
			}

			logger.info("Starting memory search for Responses API", {
				containerTag,
				conversationId,
				mode,
			})

			const queryText = mode !== "profile" ? input : ""
			const memoriesResponse = await supermemoryProfileSearch(
				containerTag,
				queryText,
			)

			const deduplicated = deduplicateMemories({
				static: memoriesResponse.profile.static,
				dynamic: memoriesResponse.profile.dynamic,
				searchResults: memoriesResponse.searchResults?.results,
			})

			const profileData =
				mode !== "query"
					? convertProfileToMarkdown({
							profile: {
								static: deduplicated.static.map((m) => ({ memory: m })),
								dynamic: deduplicated.dynamic.map((m) => ({ memory: m })),
							},
							searchResults: { results: [] },
						})
					: ""

			const searchResultsMemories =
				mode !== "profile"
					? `Search results: \n${deduplicated.searchResults.map((memory) => `- ${memory}`).join("\n")}`
					: ""

			const memories = `${profileData}\n${searchResultsMemories}`.trim()

			const enhancedInstructions = memories
				? `${params.instructions || ""}\n\n${memories}`.trim()
				: params.instructions

			return originalResponsesCreate.call(novitaClient.responses, {
				...params,
				instructions: enhancedInstructions,
			})
		}

		novitaClient.responses.create =
			createResponsesWithMemory as typeof originalResponsesCreate
	}

	return novitaClient
}
