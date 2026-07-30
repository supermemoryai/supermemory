import type { ChatGptHostApi } from "./openaiHost"
import { getChatGptHostApi } from "./openaiHost"

interface ModelHandoffApp {
	updateModelContext(params: {
		content?: Array<{ type: "text"; text: string }>
		structuredContent?: Record<string, unknown>
	}): Promise<unknown>
	sendMessage(params: {
		role: "user"
		content: Array<{ type: "text"; text: string }>
	}): Promise<{ isError?: boolean }>
}

export interface HandoffStepResult {
	ok: boolean
	error?: string
}

export interface ModelHandoffResult {
	ok: boolean
	contextUpdate: HandoffStepResult
	conversationMessage: HandoffStepResult
}

export interface ModelHandoffRequest {
	context: string
	message: string
	structuredContent?: Record<string, unknown>
}

async function updateContext(
	app: ModelHandoffApp,
	request: ModelHandoffRequest,
): Promise<HandoffStepResult> {
	try {
		await app.updateModelContext({
			content: [{ type: "text", text: request.context }],
			structuredContent: request.structuredContent,
		})
		return { ok: true }
	} catch (error) {
		return { ok: false, error: String(error) }
	}
}

async function sendConversationMessage(
	app: ModelHandoffApp,
	message: string,
	chatGptHost: ChatGptHostApi | undefined,
): Promise<HandoffStepResult> {
	let chatGptError: string | undefined

	if (chatGptHost?.sendFollowUpMessage) {
		try {
			await chatGptHost.sendFollowUpMessage({
				prompt: message,
				scrollToBottom: true,
			})
			return { ok: true }
		} catch (error) {
			// Match OpenAI's own example: fall back to the portable MCP Apps
			// message method when the ChatGPT-specific helper rejects.
			chatGptError = String(error)
		}
	}

	try {
		const result = await app.sendMessage({
			role: "user",
			content: [{ type: "text", text: message }],
		})
		if (result.isError) {
			return {
				ok: false,
				error: chatGptError
					? `ChatGPT follow-up failed (${chatGptError}); host rejected the MCP Apps message`
					: "Host rejected the MCP Apps message",
			}
		}
		return { ok: true }
	} catch (error) {
		const mcpError = String(error)
		return {
			ok: false,
			error: chatGptError
				? `ChatGPT follow-up failed (${chatGptError}); MCP Apps message failed (${mcpError})`
				: mcpError,
		}
	}
}

/**
 * Keep the silent context snapshot and the explicit conversation turn as two
 * separate operations. An accepted context update is not proof that a host
 * attached it to a model turn, so the message is always attempted.
 */
export async function handoffToModel(
	app: ModelHandoffApp,
	request: ModelHandoffRequest,
	chatGptHost: ChatGptHostApi | undefined = getChatGptHostApi(),
): Promise<ModelHandoffResult> {
	const contextUpdate = await updateContext(app, request)
	const conversationMessage = await sendConversationMessage(
		app,
		request.message,
		chatGptHost,
	)

	return {
		ok: conversationMessage.ok,
		contextUpdate,
		conversationMessage,
	}
}
