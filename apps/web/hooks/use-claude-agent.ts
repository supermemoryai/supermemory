"use client"

import { useState, useCallback, useRef } from "react"
import type {
	AgentMessage,
	AgentMessagePart,
	ClaudeAgentStatus,
	ChatMetadata,
} from "@/lib/agent/types"
import { generateId } from "@lib/generate-id"

interface UseClaudeAgentOptions {
	id?: string
	metadata: ChatMetadata
	onFinish?: (result: { message: AgentMessage }) => void
	onError?: (error: Error) => void
}

interface UseClaudeAgentReturn {
	messages: AgentMessage[]
	sendMessage: (options: { text: string }) => void
	status: ClaudeAgentStatus
	setMessages: (messages: AgentMessage[]) => void
	stop: () => void
}

export function useClaudeAgent(options: UseClaudeAgentOptions): UseClaudeAgentReturn {
	const { metadata, onFinish, onError } = options
	const [messages, setMessages] = useState<AgentMessage[]>([])
	const [status, setStatus] = useState<ClaudeAgentStatus>("idle")
	const abortControllerRef = useRef<AbortController | null>(null)
	const currentAssistantMessageRef = useRef<AgentMessage | null>(null)

	const sendMessage = useCallback(
		async (messageOptions: { text: string }) => {
			const { text } = messageOptions

			const userMessage: AgentMessage = {
				id: generateId(),
				role: "user",
				content: text,
				parts: [{ type: "text", text }],
				createdAt: new Date(),
			}

			setMessages((prev) => [...prev, userMessage])
			setStatus("submitted")

			abortControllerRef.current = new AbortController()

			try {
				const allMessages = [...messages, userMessage]
				const requestMessages = allMessages.map((msg) => ({
					role: msg.role,
					content: msg.content,
				}))

				const response = await fetch("/api/agent/chat", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						messages: requestMessages,
						metadata,
					}),
					signal: abortControllerRef.current.signal,
				})

				if (!response.ok) {
					throw new Error(`HTTP error: ${response.status}`)
				}

				const reader = response.body?.getReader()
				if (!reader) {
					throw new Error("No response body")
				}

				const decoder = new TextDecoder()
				let buffer = ""

				currentAssistantMessageRef.current = {
					id: generateId(),
					role: "assistant",
					content: "",
					parts: [],
					createdAt: new Date(),
				}

				setMessages((prev) => [...prev, currentAssistantMessageRef.current!])
				setStatus("streaming")

				while (true) {
					const { done, value } = await reader.read()
					if (done) break

					buffer += decoder.decode(value, { stream: true })
					const lines = buffer.split("\n")
					buffer = lines.pop() ?? ""

					for (const line of lines) {
						if (line.startsWith("data: ")) {
							const data = line.slice(6)

							if (data === "[DONE]") {
								setStatus("idle")
								if (currentAssistantMessageRef.current && onFinish) {
									onFinish({ message: currentAssistantMessageRef.current })
								}
								continue
							}

							try {
								const event = JSON.parse(data)
								handleStreamEvent(event)
							} catch {
								// Ignore JSON parse errors
							}
						}
					}
				}
			} catch (error) {
				if ((error as Error).name === "AbortError") {
					setStatus("idle")
					return
				}

				console.error("Claude agent error:", error)
				setStatus("error")
				onError?.(error instanceof Error ? error : new Error(String(error)))
			}
		},
		[messages, metadata, onFinish, onError]
	)

	const handleStreamEvent = useCallback(
		(event: { type: string; parts?: AgentMessagePart[]; id?: string; error?: string }) => {
			if (!currentAssistantMessageRef.current) return

			if (event.type === "error") {
				setStatus("error")
				onError?.(new Error(event.error ?? "Unknown error"))
				return
			}

			if (event.type === "assistant" && event.parts) {
				const textParts = event.parts.filter(
					(p): p is { type: "text"; text: string } => p.type === "text"
				)

				if (textParts.length > 0) {
					const newText = textParts.map((p) => p.text).join("")
					currentAssistantMessageRef.current.content += newText
					currentAssistantMessageRef.current.parts = [
						...currentAssistantMessageRef.current.parts.filter((p) => p.type !== "text"),
						{ type: "text", text: currentAssistantMessageRef.current.content },
					]
				}
			}

			if ((event.type === "tool_use" || event.type === "tool_result") && event.parts) {
				currentAssistantMessageRef.current.parts = [
					...currentAssistantMessageRef.current.parts,
					...event.parts,
				]
			}

			setMessages((prev) => {
				const newMessages = [...prev]
				const lastIndex = newMessages.length - 1
				if (lastIndex >= 0 && newMessages[lastIndex]?.role === "assistant") {
					newMessages[lastIndex] = { ...currentAssistantMessageRef.current! }
				}
				return newMessages
			})
		},
		[onError]
	)

	const stop = useCallback(() => {
		abortControllerRef.current?.abort()
		setStatus("idle")
	}, [])

	return {
		messages,
		sendMessage,
		status,
		setMessages,
		stop,
	}
}

export async function generateFollowUpQuestions(
	messages: Array<{ role: string; content: string }>
): Promise<string[]> {
	try {
		const response = await fetch("/api/agent/follow-ups", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ messages }),
		})

		if (!response.ok) {
			return []
		}

		const data = await response.json()
		return data.questions ?? []
	} catch {
		return []
	}
}

export async function generateChatTitle(
	messages: Array<{ role: string; content: string }>
): Promise<string> {
	try {
		const response = await fetch("/api/agent/title", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ messages }),
		})

		if (!response.ok) {
			return "New Chat"
		}

		const data = await response.json()
		return data.title ?? "New Chat"
	} catch {
		return "New Chat"
	}
}
