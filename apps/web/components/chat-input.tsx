"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { generateId } from "@lib/generate-id"
import { usePersistentChat } from "@/stores/chat"
import { ArrowUp } from "lucide-react"
import { Button } from "@ui/components/button"
import { ProjectSelector } from "./project-selector"

export function ChatInput() {
	const [message, setMessage] = useState("")
	const router = useRouter()
	const { setCurrentChatId } = usePersistentChat()

	const handleSend = () => {
		if (!message.trim()) return

		const newChatId = generateId()

		setCurrentChatId(newChatId)

		// Store the initial message in sessionStorage for the chat page to pick up
		sessionStorage.setItem(`chat-initial-${newChatId}`, message.trim())

		router.push(`/chat/${newChatId}`)

		setMessage("")
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	return (
		<div className="flex-1 flex items-center justify-center px-4">
			<div className="w-full max-w-4xl">
				<div className="text-start mb-4">
					<h2 className="text-3xl font-bold text-foreground">
						Good evening, <span className="text-primary">Mahesh</span>
					</h2>
				</div>
				<div className="relative">
					<form
						className="flex flex-col items-end bg-card border border-border rounded-[14px] shadow-lg"
						onSubmit={(e) => {
							e.preventDefault()
							if (!message.trim()) return
							handleSend()
						}}
					>
						<textarea
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Ask your supermemory..."
							className="w-full text-foreground placeholder-muted-foreground rounded-md outline-none resize-none text-base leading-relaxed px-6 py-4 bg-transparent"
							rows={2}
						/>
						<div className="flex items-center gap-2 w-full justify-between bg-accent py-2 px-3 rounded-b-[14px]">
							<ProjectSelector />
							<Button
								onClick={handleSend}
								disabled={!message.trim()}
								className="text-primary-foreground border-0 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed !bg-primary h-8 w-8"
								variant="outline"
								size="icon"
							>
								<ArrowUp className="size-3.5" />
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}
