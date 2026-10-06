import type { AddResponse } from "supermemory"
import { createSupermemoryClient } from "./shared/context"

export interface ConversationMessage {
	role: "user" | "assistant" | "system" | "tool"
	content: string | ContentPart[]
	name?: string
	tool_calls?: ToolCall[]
	tool_call_id?: string
}

export type ContentPart =
	| { type: "text"; text: string }
	| { type: "image_url"; imageUrl: { url: string } }

const BASE64_ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

const encodeBase64 = (bytes: Uint8Array): string => {
	let encoded = ""
	for (let index = 0; index < bytes.length; index += 3) {
		const first = bytes[index] ?? 0
		const second = bytes[index + 1]
		const third = bytes[index + 2]
		const value = (first << 16) | ((second ?? 0) << 8) | (third ?? 0)
		encoded += BASE64_ALPHABET[(value >> 18) & 63]
		encoded += BASE64_ALPHABET[(value >> 12) & 63]
		encoded += second === undefined ? "=" : BASE64_ALPHABET[(value >> 6) & 63]
		encoded += third === undefined ? "=" : BASE64_ALPHABET[value & 63]
	}
	return encoded
}

/** Normalize supported SDK image representations to a URL or data URL. */
export const toConversationImageUrl = (
	value: unknown,
	mediaType = "image/jpeg",
): string | null => {
	if (typeof URL !== "undefined" && value instanceof URL) {
		return value.toString()
	}
	if (typeof value === "string") {
		const trimmed = value.trim()
		if (!trimmed) return null
		return /^[a-z][a-z\d+.-]*:/i.test(trimmed)
			? trimmed
			: `data:${mediaType};base64,${trimmed}`
	}

	const bytes =
		value instanceof Uint8Array
			? value
			: value instanceof ArrayBuffer
				? new Uint8Array(value)
				: null
	return bytes && bytes.length > 0
		? `data:${mediaType};base64,${encodeBase64(bytes)}`
		: null
}

export interface ToolCall {
	id: string
	type: "function"
	function: {
		name: string
		arguments: string
	}
}

export interface AddConversationParams {
	id: string
	messages: ConversationMessage[]
	namespace: string
	metadata?: Record<string, string | number | boolean>
	supportingContext?: string
	apiKey: string
	baseUrl?: string
}

const CONVERSATION_REQUEST_TIMEOUT_SECONDS = 30

const ROLE_LABELS: Record<ConversationMessage["role"], string> = {
	user: "User",
	assistant: "Assistant",
	system: "System",
	tool: "Tool",
}

// Data URLs are dropped: inlining base64 would bloat the document text.
const formatContentPart = (part: ContentPart): string => {
	if (part.type === "text") return part.text
	const url = part.imageUrl.url
	return url.startsWith("data:") ? "[image]" : `[image: ${url}]`
}

export function formatConversationText(
	messages: ConversationMessage[],
): string {
	return messages
		.map((message) => {
			const content =
				typeof message.content === "string"
					? message.content
					: message.content.map(formatContentPart).join(" ")
			const toolCalls = (message.tool_calls ?? [])
				.map(
					(call) =>
						`[tool call: ${call.function.name}(${call.function.arguments})]`,
				)
				.join(" ")
			const label = message.name
				? `${ROLE_LABELS[message.role]} (${message.name})`
				: ROLE_LABELS[message.role]
			return `${label}: ${[content, toolCalls].filter(Boolean).join(" ")}`
		})
		.join("\n\n")
}

// Same id → same document, so one conversation stays one document.
export async function addConversation(
	params: AddConversationParams,
): Promise<AddResponse> {
	const client = createSupermemoryClient({
		apiKey: params.apiKey,
		baseUrl: params.baseUrl,
	})
	return await client.add(
		params.namespace,
		{
			content: formatConversationText(params.messages),
			id: params.id,
			dreaming: "instant",
			...(params.metadata && { metadata: params.metadata }),
			...(params.supportingContext && {
				supportingContext: params.supportingContext,
			}),
		},
		{ timeoutInSeconds: CONVERSATION_REQUEST_TIMEOUT_SECONDS, maxRetries: 0 },
	)
}
