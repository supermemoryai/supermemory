import type {
	LanguageModelV2,
	LanguageModelV2CallOptions,
	LanguageModelV2Message,
	LanguageModelV2StreamPart,
} from "@ai-sdk/provider"
import { toConversationImageUrl } from "../conversations-client"

// Re-export shared types for backward compatibility
export type {
	ProfileStructure,
	ProfileMarkdownData,
} from "../shared"

// Provider v2 does not export V3 names, so keep the public declaration on the
// common V2 surface and structurally accept V3 models at the wrapper boundary.
type LanguageModelV3Compat = Omit<
	LanguageModelV2,
	"specificationVersion" | "doGenerate" | "doStream"
> & {
	readonly specificationVersion: "v3"
	// biome-ignore lint/suspicious/noExplicitAny: Bridges mutually exclusive provider major declarations.
	doGenerate(...args: any[]): PromiseLike<any>
	// biome-ignore lint/suspicious/noExplicitAny: Bridges mutually exclusive provider major declarations.
	doStream(...args: any[]): PromiseLike<any>
}

export type LanguageModel = LanguageModelV2 | LanguageModelV3Compat
export type LanguageModelCallOptions = LanguageModelV2CallOptions
export type LanguageModelMessage = LanguageModelV2Message
export type LanguageModelStreamPart = LanguageModelV2StreamPart

export type OutputContentItem =
	| { type: "text"; text: string }
	| { type: "reasoning"; text: string }
	| {
			type: "tool-call"
			id: string
			function: { name: string; arguments: string }
	  }
	| { type: "file"; name: string; mediaType: string; data: string }
	| {
			type: "source"
			sourceType: string
			id: string
			url: string
			title: string
	  }

// Re-export convertProfileToMarkdown from shared for backward compatibility
export { convertProfileToMarkdown } from "../shared"

export const getLastUserMessage = (
	params: LanguageModelCallOptions,
): string | undefined => {
	const lastUserMessage = params.prompt
		.slice()
		.reverse()
		.find((prompt: LanguageModelMessage) => prompt.role === "user")

	if (!lastUserMessage) {
		return undefined
	}

	const content = lastUserMessage.content

	// Handle string content directly
	if (typeof content === "string") {
		return content
	}

	// Handle array content - extract text parts
	return content
		.filter((part) => part.type === "text")
		.map((part) => (part as { type: "text"; text: string }).text)
		.join(" ")
}

/** Whether the prompt contains user content that `/v4/conversations` can store. */
export const hasPersistableUserContent = (
	params: LanguageModelCallOptions,
): boolean => {
	return params.prompt.some((message) => {
		if (message.role !== "user") return false
		const content: unknown = message.content
		if (typeof content === "string") {
			return Boolean(content.trim())
		}
		if (!Array.isArray(content)) return false
		return content.some((value) => {
			if (!value || typeof value !== "object") return false
			const part = value as {
				type?: unknown
				text?: unknown
				mediaType?: unknown
				data?: unknown
			}
			if (part.type === "text" && typeof part.text === "string") {
				return Boolean(part.text.trim())
			}
			return (
				part.type === "file" &&
				typeof part.mediaType === "string" &&
				part.mediaType.startsWith("image/") &&
				toConversationImageUrl(part.data, part.mediaType) !== null
			)
		})
	})
}

export const filterOutSupermemories = (content: string) => {
	return content.split("User Supermemories: ")[0]
}
