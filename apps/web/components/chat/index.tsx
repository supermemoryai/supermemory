"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import NovaOrb from "@/components/nova/nova-orb"
import { Button } from "@ui/components/button"
import {
	HistoryIcon,
	PanelRightCloseIcon,
	SearchIcon,
	SquarePenIcon,
} from "lucide-react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"
import ChatInput from "./input"
import ChatModelSelector from "./model-selector"
import { GradientLogo, LogoBgGradient } from "@ui/assets/Logo"
import { useProject, usePersistentChat } from "@/stores"
import type { ModelId } from "@/lib/models"
import { SuperLoader } from "../superloader"
import { UserMessage } from "./message/user-message"
import { AgentMessage } from "./message/agent-message"

export function ChatSidebar() {
	const [input, setInput] = useState("")
	const [isChatOpen, setIsChatOpen] = useState(true)
	const [selectedModel, setSelectedModel] = useState<ModelId>("gemini-2.5-pro")
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
	const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
	const [messageFeedback, setMessageFeedback] = useState<
		Record<string, "like" | "dislike" | null>
	>({})
	const [expandedMemories, setExpandedMemories] = useState<string | null>(null)
	const { selectedProject } = useProject()
	const { setCurrentChatId } = usePersistentChat()

	const { messages, sendMessage, status, setMessages, stop } = useChat({
		transport: new DefaultChatTransport({
			api: `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`,
			credentials: "include",
			body: {
				metadata: {
					projectId: selectedProject,
					model: selectedModel,
				},
			},
		}),
		maxSteps: 10,
	})

	const handleSend = () => {
		if (!input.trim() || status === "submitted" || status === "streaming")
			return
		sendMessage({ text: input })
		setInput("")
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

	const handleCopyMessage = useCallback((messageId: string, text: string) => {
		navigator.clipboard.writeText(text)
		setCopiedMessageId(messageId)
		setTimeout(() => setCopiedMessageId(null), 2000)
	}, [])

	const handleLikeMessage = useCallback((messageId: string) => {
		setMessageFeedback((prev) => ({
			...prev,
			[messageId]: prev[messageId] === "like" ? null : "like",
		}))
	}, [])

	const handleDislikeMessage = useCallback((messageId: string) => {
		setMessageFeedback((prev) => ({
			...prev,
			[messageId]: prev[messageId] === "dislike" ? null : "dislike",
		}))
	}, [])

	const handleToggleMemories = useCallback((messageId: string) => {
		setExpandedMemories((prev) => (prev === messageId ? null : messageId))
	}, [])

	const handleNewChat = useCallback(() => {
		console.log("handleNewChat")
		const newId = crypto.randomUUID()
		setCurrentChatId(newId)
		setMessages([])
		setInput("")
	}, [setCurrentChatId, setMessages])

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.key.toLowerCase() === "t" &&
				!e.metaKey &&
				!e.ctrlKey &&
				!e.altKey &&
				isChatOpen &&
				document.activeElement?.tagName !== "INPUT" &&
				document.activeElement?.tagName !== "TEXTAREA"
			) {
				e.preventDefault()
				handleNewChat()
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [isChatOpen, handleNewChat])

	return (
		<AnimatePresence mode="wait">
			{!isChatOpen ? (
				<motion.div
					key="closed"
					className={cn(
						"absolute top-0 right-0 flex items-start justify-start m-4",
						dmSansClassName(),
					)}
					layoutId="chat-toggle-button"
				>
					<motion.button
						onClick={toggleChat}
						className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border-[1px] border-[#17181A] text-white cursor-pointer"
						style={{
							background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
						}}
					>
						<NovaOrb size={24} className="!blur-none z-10" />
						Chat with Nova
					</motion.button>
				</motion.div>
			) : (
				<motion.div
					key="open"
					className={cn(
						"w-[450px] h-[calc(100vh-95px)] bg-[#05070A] backdrop-blur-md flex flex-col rounded-2xl m-4 border border-[#17181AB2] relative",
						dmSansClassName(),
					)}
					initial={{ x: "100px", opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					exit={{ x: "100px", opacity: 0 }}
					transition={{ duration: 0.3, ease: "easeOut", bounce: 0 }}
				>
					<div className="flex items-center justify-between pt-4 px-6 pb-3 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.4)]">
						<ChatModelSelector
							selectedModel={selectedModel}
							onModelChange={setSelectedModel}
						/>
						<div className="flex items-center gap-2">
							<Button
								variant="headers"
								className="rounded-full text-base gap-2 !h-10 border-[#73737333] bg-[#0D121A]"
								style={{
									boxShadow: "1.5px 1.5px 4.5px 0 rgba(0, 0, 0, 0.70) inset",
								}}
							>
								<HistoryIcon className="size-4 text-[#737373]" />
							</Button>
							<Button
								variant="headers"
								className="rounded-full text-base gap-3 !h-10 border-[#73737333] bg-[#0D121A] cursor-pointer"
								style={{
									boxShadow: "1.5px 1.5px 4.5px 0 rgba(0, 0, 0, 0.70) inset",
								}}
								onClick={handleNewChat}
								title="New chat (T)"
							>
								<SquarePenIcon className="size-4 text-[#737373]" />
								<span
									className={cn(
										"bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm size-4 text-[10px] flex items-center justify-center",
										dmSansClassName(),
									)}
								>
									T
								</span>
							</Button>
							<motion.button
								onClick={toggleChat}
								className="flex items-center gap-2 rounded-full p-2 text-xs text-white cursor-pointer"
								layoutId="chat-toggle-button"
							>
								<PanelRightCloseIcon className="size-4" />
							</motion.button>
						</div>
					</div>
					<div className="flex-1 overflow-y-auto px-4 scrollbar-thin">
						{messages.length === 0 && <ChatEmptyStatePlaceholder />}
						<div
							className={cn(
								messages.length > 0
									? "flex flex-col space-y-3 min-h-full justify-end"
									: "",
							)}
						>
							{messages.map((message, index) => (
								// biome-ignore lint/a11y/noStaticElementInteractions: Hover detection for message actions
								<div
									key={message.id}
									className={cn(
										"flex gap-2 w-full",
										message.role === "user" ? "justify-end" : "justify-start",
									)}
									onMouseEnter={() =>
										message.role === "assistant" &&
										setHoveredMessageId(message.id)
									}
									onMouseLeave={() =>
										message.role === "assistant" && setHoveredMessageId(null)
									}
								>
									{message.role === "user" ? (
										<UserMessage
											message={message}
											copiedMessageId={copiedMessageId}
											onCopy={handleCopyMessage}
										/>
									) : (
										<AgentMessage
											message={message}
											index={index}
											messagesLength={messages.length}
											hoveredMessageId={hoveredMessageId}
											copiedMessageId={copiedMessageId}
											messageFeedback={messageFeedback}
											expandedMemories={expandedMemories}
											onCopy={handleCopyMessage}
											onLike={handleLikeMessage}
											onDislike={handleDislikeMessage}
											onToggleMemories={handleToggleMemories}
										/>
									)}
								</div>
							))}
							{(status === "submitted" || status === "streaming") &&
								messages[messages.length - 1]?.role === "user" && (
									<div className="flex gap-2">
										<SuperLoader label="Thinking..." />
									</div>
								)}
						</div>
					</div>

					<div className="px-4 pb-4 pt-2">
						<ChatInput
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onSend={handleSend}
							onStop={stop}
							onKeyDown={handleKeyDown}
							isResponding={status === "submitted" || status === "streaming"}
						/>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

function ChatEmptyStatePlaceholder() {
	const suggestions = [
		"Show me all content related to Supermemory.",
		"Summarize the key ideas from My Gita.",
		"Which memories connect design and AI?",
		"What are the main themes across my memories?",
	]

	return (
		<div className="flex flex-col items-center justify-center h-full">
			<div className="relative">
				<GradientLogo className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
				<LogoBgGradient className="" />
			</div>
			<div className="gap-3 flex flex-col items-center justify-center">
				<p>Ask me anything about your memories...</p>
				<div
					className={cn(
						dmSansClassName(),
						"flex flex-col gap-2 justify-center items-center",
					)}
				>
					{suggestions.map((suggestion) => (
						<Button
							key={suggestion}
							variant="default"
							className="rounded-full text-base gap-1 !h-10 border-[#2261CA33] bg-[#0D121A] border w-fit"
						>
							<SearchIcon className="size-4 text-[#267BF1]" />
							<span className="text-[#267BF1] text-[12px]">{suggestion}</span>
						</Button>
					))}
				</div>
			</div>
		</div>
	)
}
