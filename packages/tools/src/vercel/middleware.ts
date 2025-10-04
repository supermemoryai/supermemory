import type {
	LanguageModelV2,
	LanguageModelV2CallOptions,
	LanguageModelV2Middleware,
	LanguageModelV2Message,
} from "@ai-sdk/provider"
import { wrapLanguageModel } from "ai"
import Supermemory from "supermemory"

const getLastUserMessage = (params: LanguageModelV2CallOptions) => {
	const lastUserMessage = params.prompt
		.reverse()
		.find((prompt: LanguageModelV2Message) => prompt.role === "user")
	const memories = lastUserMessage?.content
		.filter((content) => content.type === "text")
		.map((content) => content.text)
		.join(" ")
	return memories
}

const addSystemPrompt = async (
	params: LanguageModelV2CallOptions,
	supermemory: Supermemory,
	lastUserMessage: string,
	containerTag: string,
) => {
	const systemPromptExists = params.prompt.some(
		(prompt) => prompt.role === "system",
	)
	const memoriesResponse = await supermemory.search.execute({
		q: lastUserMessage,
		containerTags: [containerTag],
	})
	const memories = memoriesResponse.results.map((result) =>
		result.chunks.map((chunk) => chunk.content).join(" "),
	).join("\n")
	if (systemPromptExists) {
		return {
			...params,
			prompt: params.prompt.map((prompt) =>
				prompt.role === "system"
					? { ...prompt, content: `${prompt.content} \n ${memories}` }
					: prompt,
			),
		}
	}

	return {
		...params,
		prompt: [
			{ role: "system" as const, content: memories },
			...params.prompt,
		],
	}
}

export const createSupermemoryMiddleware = (
	supermemory: Supermemory,
	containerTag: string,
): LanguageModelV2Middleware => ({
	transformParams: async ({ params }) => {
		const lastUserMessage = getLastUserMessage(params)

		if (!lastUserMessage) {
			return params
		}

		const transformedParams = await addSystemPrompt(
			params,
			supermemory,
			lastUserMessage,
			containerTag,
		)
		return transformedParams
	},
})

export const wrapVercelLanguageModel = (
	model: LanguageModelV2,
	containerTag: string,
): LanguageModelV2 => {
	const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY

	if (!SUPERMEMORY_API_KEY) {
		throw new Error("SUPERMEMORY_API_KEY is not set")
	}

	const supermemory = new Supermemory({
		apiKey: SUPERMEMORY_API_KEY,
	})
	const wrappedModel = wrapLanguageModel({
		model,
		middleware: createSupermemoryMiddleware(supermemory, containerTag),
	})

	return wrappedModel
}
