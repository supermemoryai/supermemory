import OpenAI from "openai"

interface SupermemoryInfiniteChatConfigBase {
	providerApiKey: string
	headers?: Record<string, string>
}

interface SupermemoryInfiniteChatConfigWithProviderName
	extends SupermemoryInfiniteChatConfigBase {
	providerName: keyof typeof providerMap
	providerUrl?: never
}

interface SupermemoryInfiniteChatConfigWithProviderUrl
	extends SupermemoryInfiniteChatConfigBase {
	providerUrl: string
	providerName?: never
}

export type SupermemoryInfiniteChatConfig =
	| SupermemoryInfiniteChatConfigWithProviderName
	| SupermemoryInfiniteChatConfigWithProviderUrl

type SupermemoryApiKey = string

const providerMap = {
	openai: "https://api.openai.com/v1",
	anthropic: "https://api.anthropic.com/v1",
	openrouter: "https://openrouter.ai/api/v1",
	deepinfra: "https://api.deepinfra.com/v1/openai",
	groq: "https://api.groq.com/openai/v1",
	google: "https://generativelanguage.googleapis.com/v1beta/openai",
	cloudflare: "https://gateway.ai.cloudflare.com/v1/*/unlimited-context/openai",
} as const

/**
 * Enhanced OpenAI client with supermemory integration
 * Only chat completions are supported - all other OpenAI API endpoints are disabled
 */
export class SupermemoryOpenAI extends OpenAI {
	private supermemoryApiKey: string

	constructor(
		supermemoryApiKey: SupermemoryApiKey,
		config?: SupermemoryInfiniteChatConfig,
	) {
		const baseURL = config?.providerName
			? providerMap[config.providerName]
			: (config?.providerUrl ?? "https://api.openai.com/v1")

		super({
			apiKey: config?.providerApiKey,
			baseURL,
			defaultHeaders: {
				"x-supermemory-api-key": supermemoryApiKey,
				...config?.headers,
			},
		})

		this.supermemoryApiKey = supermemoryApiKey

		// Disable all non-chat completion endpoints
		this.disableUnsupportedEndpoints()
	}

	/**
	 * Disable all OpenAI endpoints except chat completions
	 */
	private disableUnsupportedEndpoints() {
		const unsupportedError = (): never => {
			throw new Error(
				"Supermemory only supports chat completions. Use chatCompletion() or chat.completions.create() instead.",
			)
		}

		// Override all other OpenAI API endpoints using Object.defineProperty
		const endpoints = [
			"embeddings",
			"fineTuning",
			"images",
			"audio",
			"models",
			"moderations",
			"files",
			"batches",
			"uploads",
			"beta",
		]

		for (const endpoint of endpoints) {
			Object.defineProperty(this, endpoint, {
				get: unsupportedError,
				configurable: true,
			})
		}
	}

	/**
	 * Create chat completions with infinite context support
	 */
	async createChatCompletion<
		T extends OpenAI.Chat.Completions.ChatCompletionCreateParams,
	>(params: T) {
		return this.chat.completions.create(params)
	}

	/**
	 * Create chat completions with simplified interface
	 */
	async chatCompletion(
		messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
		options?: {
			model?: string
			temperature?: number
			maxTokens?: number
			tools?: OpenAI.Chat.Completions.ChatCompletionTool[]
			toolChoice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption
			stream?: boolean
		},
	) {
		const params = {
			model: options?.model ?? "gpt-4o",
			messages,
			temperature: options?.temperature,
			max_tokens: options?.maxTokens,
			tools: options?.tools,
			tool_choice: options?.toolChoice,
			stream: options?.stream,
		} satisfies OpenAI.Chat.Completions.ChatCompletionCreateParams

		return this.chat.completions.create(params)
	}
}
