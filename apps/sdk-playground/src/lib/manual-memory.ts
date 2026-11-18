import { createHash } from "node:crypto"

export type MemoryMessage = {
	role: "user" | "assistant" | "system"
	content: string
}

export type MemorySelection =
	| { kind: "chat" }
	| { kind: "message"; index: number }

export function manualMemoryId(
	namespace: string,
	conversationId: string,
	selection: MemorySelection,
): string {
	// Middleware integrations already use the conversation ID for this source.
	if (selection.kind === "chat") return conversationId
	const source = JSON.stringify([namespace, conversationId, selection.index])
	return `playground-message-${createHash("sha256").update(source).digest("hex")}`
}

export function manualMemoryDocument(
	namespace: string,
	conversationId: string,
	messages: MemoryMessage[],
	selection: MemorySelection,
) {
	const selected =
		selection.kind === "chat"
			? messages.filter((message) => message.content.trim())
			: [messages[selection.index]].filter(
					(message): message is MemoryMessage =>
						Boolean(message?.content.trim()),
				)
	if (selected.length === 0) {
		throw new Error("The selected message has no text to save")
	}
	const source =
		selection.kind === "chat"
			? `SDK playground conversation ${conversationId}`
			: `SDK playground conversation ${conversationId}, message ${selection.index + 1}`
	return {
		id: manualMemoryId(namespace, conversationId, selection),
		content: [
			`Source: ${source}`,
			...selected.map(
				(message) =>
					`${message.role[0].toUpperCase()}${message.role.slice(1)}: ${message.content}`,
			),
		].join("\n\n"),
		metadata: {
			source: "sdk-playground",
			conversationId,
			selection: selection.kind,
			...(selection.kind === "message"
				? { messageIndex: selection.index }
				: {}),
		},
	}
}
