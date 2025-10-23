"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import NovaOrb from "@/components/nova/nova-orb"
import { Button } from "@ui/components/button"
import { PanelRightCloseIcon, SendIcon } from "lucide-react"
import { collectValidUrls } from "@/utils/url-helpers"

interface ChatSidebarProps {
	formData: {
		twitter: string
		linkedin: string
		description: string
		otherLinks: string[]
	} | null
}

export function ChatSidebar({ formData }: ChatSidebarProps) {
	const [message, setMessage] = useState("")
	const [isChatOpen, setIsChatOpen] = useState(true)
	const [messages, setMessages] = useState<
		{
			url: string
			title?: string
			description: string
			fullContent: string
		}[]
	>([])
	const [isLoading, setIsLoading] = useState(false)

	const handleSend = () => {
		console.log("Message:", message)
		setMessage("")
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	const toggleChat = () => {
		setIsChatOpen(!isChatOpen)
	}

	// Helper function to truncate text to 2 lines
	const truncateText = (text: string, maxLength = 120) => {
		if (text.length <= maxLength) return text
		return text.slice(0, maxLength).trim() + "..."
	}

	// Fetch content when formData is available
	useEffect(() => {
		if (!formData) return

		const fetchContent = async () => {
			setIsLoading(true)
			const urls = collectValidUrls(formData.linkedin, formData.otherLinks)

			if (urls.length > 0) {
				try {
					const response = await fetch("/api/exa/fetch-content", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ urls }),
					})
					const { results } = await response.json()

					const newMessages = results.map(
						(result: {
							url: string
							title?: string
							text?: string
							description?: string
						}) => ({
							url: result.url,
							title: result.title,
							description: result.text || result.description || "",
							fullContent: result.text || result.description || "",
						}),
					)
					setMessages(newMessages)
				} catch (error) {
					console.warn("Error fetching content:", error)
				}
			}
			setIsLoading(false)
		}

		fetchContent()
	}, [formData])

	return (
		<AnimatePresence mode="wait">
			{!isChatOpen ? (
				<motion.div
					key="closed"
					className="absolute top-0 right-0 flex items-start justify-start m-4"
					layoutId="chat-toggle-button"
				>
					<motion.button
						onClick={toggleChat}
						className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium border-[1px] border-[#17181A]"
						style={{
							background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
						}}
					>
						Chat with Nova
					</motion.button>
				</motion.div>
			) : (
				<motion.div
					key="open"
					className="w-[450px] h-[calc(100vh-110px)] bg-[#0A0E14] backdrop-blur-md flex flex-col rounded-2xl m-4"
					initial={{ x: "100px", opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					exit={{ x: "100px", opacity: 0 }}
					transition={{ duration: 0.3, ease: "easeOut", bounce: 0 }}
				>
					<motion.button
						onClick={toggleChat}
						className="absolute top-4 right-4 flex items-center gap-2 rounded-full p-2 text-xs"
						style={{
							background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
						}}
						layoutId="chat-toggle-button"
					>
						<PanelRightCloseIcon className="size-4" />
						Close chat
					</motion.button>
					<div className="flex-1 flex flex-col justify-end px-4 py-6 space-y-3">
						{messages.length === 0 && !isLoading && (
							<div className="flex items-center gap-2 text-foreground/70">
								<NovaOrb size={24} />
								<span className="text-sm">Waiting for your input</span>
							</div>
						)}
						{isLoading && (
							<div className="text-sm text-foreground/50">
								Fetching your memories...
							</div>
						)}
						{messages.map((msg, i) => (
							<div
								key={`message-${i}-${msg.url}`}
								className="bg-[#0D121A] rounded-lg p-4 space-y-2"
							>
								{msg.title && (
									<h3 className="text-sm font-medium text-foreground">
										{msg.title}
									</h3>
								)}
								<a
									href={msg.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs text-blue-400 hover:underline break-all"
								>
									{msg.url}
								</a>
								<p className="text-sm text-foreground/70 line-clamp-2">
									{truncateText(msg.description)}
								</p>
							</div>
						))}
					</div>

					<div className="p-4">
						<form
							className="flex flex-col gap-3 bg-[#0D121A] rounded-xl p-2 relative"
							onSubmit={(e) => {
								e.preventDefault()
								if (message.trim()) {
									handleSend()
								}
							}}
						>
							<input
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Chat with your Supermemory"
								className="w-full text-foreground placeholder:text-foreground/20 rounded-sm outline-none resize-none text-base leading-relaxed bg-transparent px-2 h-10"
							/>
							<div className="flex justify-end absolute bottom-3 right-2">
								<Button
									type="submit"
									disabled={!message.trim()}
									className="text-foreground/20 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
									size="icon"
								>
									<SendIcon className="size-4" />
								</Button>
							</div>
						</form>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
