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

export interface ContentPart {
	type: "text" | "image_url"
	text?: string
	image_url?: { url: string }
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
	})

	if (!response.ok) {
		const errorText = await response.text().catch(() => "Unknown error")
		throw new Error(
			`Failed to add conversation: ${response.status} ${response.statusText}. ${errorText}`,
		)
	}

	return await response.json()
}
