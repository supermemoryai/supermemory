import { createOpenAI } from "@ai-sdk/openai"

interface SupermemoryInfiniteChatConfigBase {
	providerApiKey: string
	headers: Record<string, string>
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

export const createSupermemoryInfiniteChat = (
	apiKey: SupermemoryApiKey,
	config: SupermemoryInfiniteChatConfig,
) =>
	createOpenAI({
		apiKey: config.providerApiKey,
		baseURL: config.providerName
			? providerMap[config.providerName]
			: config.providerUrl,
		headers: {
			"x-api-key": apiKey,
			...config.headers,
		},
	}).chat
