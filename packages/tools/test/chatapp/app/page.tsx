"use client"

import type { ModelMessage } from "ai"
import { useState } from "react"

export default function Page() {
	const [input, setInput] = useState("")
	const [messages, setMessages] = useState<ModelMessage[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const handleSendMessage = async () => {
		if (!input.trim() || isLoading) return

		const userMessage = { role: "user" as const, content: input }
		setMessages((currentMessages) => [...currentMessages, userMessage])
		setInput("")
		setIsLoading(true)

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					messages: [...messages, userMessage],
				}),
			})

			const { messages: newMessages } = await response.json()
			setMessages((currentMessages) => [...currentMessages, ...newMessages])
		} catch (error) {
			console.error("Error sending message:", error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-4xl mx-auto p-4 h-screen flex flex-col">
				{/* Header */}
				<div className="mb-6">
					<h1 className="text-2xl font-bold text-foreground">Chat App</h1>
					<p className="text-muted-foreground">
						Chat with AI using Supermemory
					</p>
				</div>

				{/* Messages Container */}
				<div className="flex-1 overflow-y-auto space-y-4 mb-4">
					{messages.length === 0 && (
						<div className="text-center text-muted-foreground py-8">
							Start a conversation by typing a message below
						</div>
					)}
					{messages.map((message, index) => (
						<div
							key={`${message.role}-${index}`}
							className={`flex ${
								message.role === "user" ? "justify-end" : "justify-start"
							}`}
						>
							<div
								className={`max-w-[80%] rounded-lg px-4 py-2 ${
									message.role === "user"
										? "bg-blue-500 text-white"
										: "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
								}`}
							>
								<div className="text-sm font-medium mb-1 capitalize">
									{message.role}
								</div>
								<div>
									{typeof message.content === "string"
										? message.content
										: message.content
												.filter((part) => part.type === "text")
												.map((part, partIndex) => (
													<div key={`${message.role}-${partIndex}`}>
														{part.text}
													</div>
												))}
								</div>
							</div>
						</div>
					))}
					{isLoading && (
						<div className="flex justify-start">
							<div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
								<div className="flex items-center space-x-2">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
									<span className="text-sm text-muted-foreground">
										AI is thinking...
									</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Input Container */}
				<div className="flex gap-2">
					<input
						value={input}
						onChange={(event) => setInput(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault()
								handleSendMessage()
							}
						}}
						placeholder="Type your message here..."
						disabled={isLoading}
						className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
					/>
					<button
						type="button"
						onClick={handleSendMessage}
						disabled={!input.trim() || isLoading}
						className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Send
					</button>
				</div>
			</div>
		</div>
	)
}
