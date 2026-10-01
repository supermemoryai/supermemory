/**
 * Client for the Supermemory Conversations API
 *
 * This module provides a helper function to ingest conversations using the
 * /v4/conversations endpoint, which supports structured messages with smart
 * diffing and append detection on the backend.
 */

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

/** Normalize supported SDK image representations for `/v4/conversations`. */
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
	conversationId: string
	messages: ConversationMessage[]
	containerTags?: string[]
	metadata?: Record<string, string | number | boolean>
	apiKey: string
	baseUrl?: string
}

export interface AddConversationResponse {
	id: string
	conversationId: string
	status: string
}

const CONVERSATION_REQUEST_TIMEOUT_MS = 30_000

/**
 * Adds a conversation to Supermemory using the /v4/conversations endpoint
 *
 * This endpoint supports:
 * - Structured messages with roles (user, assistant, system, tool)
 * - Multi-modal content (text, images)
 * - Tool calls and responses
 *
 * @param params - Configuration for adding the conversation
 * @returns Promise resolving to the conversation response
 * @throws Error if the API request fails
 *
 * @example
 * ```typescript
 * const response = await addConversation({
 *   conversationId: "conv-123",
 *   messages: [
 *     { role: "user", content: "Hello!" },
 *     { role: "assistant", content: "Hi there!" }
 *   ],
 *   containerTags: ["user-456"],
 *   apiKey: process.env.SUPERMEMORY_API_KEY,
 * })
 * ```
 */
export async function addConversation(
	params: AddConversationParams,
): Promise<AddConversationResponse> {
	const baseUrl = params.baseUrl || "https://api.supermemory.ai"
	const url = `${baseUrl}/v4/conversations`

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${params.apiKey}`,
		},
		body: JSON.stringify({
			conversationId: params.conversationId,
			messages: params.messages,
			containerTags: params.containerTags,
			metadata: params.metadata,
		}),
		redirect: "error",
		signal: AbortSignal.timeout(CONVERSATION_REQUEST_TIMEOUT_MS),
	})

	if (!response.ok) {
		const errorText = await response.text().catch(() => "Unknown error")
		throw new Error(
			`Failed to add conversation: ${response.status} ${response.statusText}. ${errorText}`,
		)
	}

	return await response.json()
}
