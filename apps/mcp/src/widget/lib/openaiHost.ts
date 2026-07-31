export interface ChatGptHostApi {
	sendFollowUpMessage?: (args: {
		prompt: string
		scrollToBottom?: boolean
	}) => Promise<unknown>
	setWidgetState?: (state: unknown) => unknown
	widgetState?: unknown
}

/**
 * Optional ChatGPT host extensions. Shared MCP Apps methods remain the
 * cross-host fallback; this bridge is used where ChatGPT provides a stronger
 * follow-up or widget-state primitive.
 */
export function getChatGptHostApi(): ChatGptHostApi | undefined {
	if (typeof window === "undefined") return undefined
	return (window as Window & { openai?: ChatGptHostApi }).openai
}
