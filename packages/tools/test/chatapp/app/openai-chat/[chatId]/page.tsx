"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import type { OpenAI as OpenAIType } from "openai"

type ChatMessage = OpenAIType.Chat.Completions.ChatCompletionMessageParam

export default function ChatPage() {
	const { chatId } = useParams() as { chatId: string }
	const router = useRouter()
	const [input, setInput] = useState("")
	const [messages, setMessages] = useState<ChatMessage[]>([
		{ role: "system", content: "You are a helpful assistant." },
	])
	const [isLoading, setIsLoading] = useState(false)

	async function send() {
		if (!input.trim() || isLoading) return

		const userMessage: ChatMessage = { role: "user", content: input }
		setMessages((prev) => [...prev, userMessage])
		setInput("")
		setIsLoading(true)

		try {
			const res = await fetch("/api/openai-chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [...messages, userMessage],
					conversationId: chatId,
				}),
			})
			const data = await res.json()
			const assistant = data.message as ChatMessage | undefined
			if (assistant) {
				setMessages((prev) => [...prev, assistant])
			}
		} catch (error) {
			console.error("Error sending message:", error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-4xl mx-auto p-4 h-screen flex flex-col">
				<div className="mb-6 flex items-center justify-between">
					<h1 className="text-2xl font-bold text-foreground">
						OpenAI + SuperMemory
					</h1>
					<button
						type="button"
						onClick={() => router.push("/openai-chat/new")}
						className="text-sm underline"
					>
						New Chat
					</button>
				</div>

				<div className="flex-1 overflow-y-auto space-y-4 mb-4">
					{messages.map((message, index) => (
						<div
							key={`${message.role}-${index}`}
							className={message.role === "user" ? "text-right" : "text-left"}
						>
							<span className="inline-block rounded px-3 py-2 bg-gray-100 dark:bg-gray-800">
								{typeof message.content === "string" ? message.content : ""}
							</span>
						</div>
					))}
					{isLoading && (
						<div className="text-left">
							<span className="inline-block rounded px-3 py-2 bg-gray-100 dark:bg-gray-800">
								Thinking...
							</span>
						</div>
					)}
				</div>

				<div className="flex gap-2">
					<input
						className="flex-1 border px-3 py-2"
						placeholder="Type a message"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault()
								send()
							}
						}}
						disabled={isLoading}
					/>
					<button
						type="button"
						className="border px-3 py-2"
						onClick={send}
						disabled={!input.trim() || isLoading}
					>
						{isLoading ? "Sending..." : "Send"}
					</button>
				</div>
			</div>
		</div>
	)
}
