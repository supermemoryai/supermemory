"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useQueryState } from "nuqs"
import type { UIMessage } from "@ai-sdk/react"
import { motion, AnimatePresence } from "motion/react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import NovaOrb from "@/components/nova/nova-orb"
import { Button } from "@ui/components/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@ui/components/dialog"
import { ScrollArea } from "@ui/components/scroll-area"
import {
	Check,
	ChevronDownIcon,
	HistoryIcon,
	PanelRightCloseIcon,
	Plus,
	SearchIcon,
	SquarePenIcon,
	Trash2,
	XIcon,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import ChatInput from "./input"
import ChatModelSelector from "./model-selector"
import { GradientLogo, LogoBgGradient } from "@ui/assets/Logo"
import { useProject } from "@/stores"
import type { ModelId } from "@/lib/models"
import { SuperLoader } from "../../superloader"
import { UserMessage } from "./message/user-message"
import { AgentMessage } from "./message/agent-message"
import { ChainOfThought } from "./input/chain-of-thought"
import { useIsMobile } from "@hooks/use-mobile"
import { useAuth } from "@lib/auth-context"
import { analytics } from "@/lib/analytics"
import { generateId } from "@lib/generate-id"
import { useViewMode } from "@/lib/view-mode-context"
import { threadParam } from "@/lib/search-params"

const DEFAULT_SUGGESTIONS = [
	"Show me all content related to Supermemory.",
	"Summarize the key ideas from My Gita.",
	"Which memories connect design and AI?",
	"What are the main themes across my memories?",
]

function ChatEmptyStatePlaceholder({
	onSuggestionClick,
	suggestions = DEFAULT_SUGGESTIONS,
}: {
	onSuggestionClick: (suggestion: string) => void
	suggestions?: string[]
}) {
	return (
		<div
			id="chat-empty-state"
			className="flex flex-col items-center justify-center h-full"
		>
			<div className="relative w-32 h-32">
				<GradientLogo className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16" />
				<LogoBgGradient className="w-full h-full" />
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
							className="rounded-full text-base gap-1 h-10! border-[#2261CA33] bg-[#041127] border w-fit max-w-[400px] py-[4px] pl-[8px] pr-[12px] hover:bg-[#0A1A3A] hover:[&_span]:text-white hover:[&_svg]:text-white transition-colors cursor-pointer"
							onClick={() => onSuggestionClick(suggestion)}
						>
							<SearchIcon className="size-4 text-[#267BF1] shrink-0" />
							<span className="text-[#267BF1] text-[12px] truncate">
								{suggestion}
							</span>
						</Button>
					))}
				</div>
			</div>
		</div>
	)
}

export function ChatSidebar({
	isChatOpen,
	setIsChatOpen,
	queuedMessage,
	onConsumeQueuedMessage,
	emptyStateSuggestions,
}: {
	isChatOpen: boolean
	setIsChatOpen: (open: boolean) => void
	queuedMessage?: string | null
	onConsumeQueuedMessage?: () => void
	emptyStateSuggestions?: string[]
}) {
	const isMobile = useIsMobile()
	const [input, setInput] = useState("")
	const [selectedModel, setSelectedModel] = useState<ModelId>("gemini-2.5-pro")
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
	const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
	const [messageFeedback, setMessageFeedback] = useState<
		Record<string, "like" | "dislike" | null>
	>({})
	const [expandedMemories, setExpandedMemories] = useState<string | null>(null)
	const [followUpQuestions, setFollowUpQuestions] = useState<
		Record<string, string[]>
	>({})
	const [loadingFollowUps, setLoadingFollowUps] = useState<
		Record<string, boolean>
	>({})
	const [isInputExpanded, setIsInputExpanded] = useState(false)
	const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)
	const [heightOffset, setHeightOffset] = useState(95)
	const [isHistoryOpen, setIsHistoryOpen] = useState(false)
	const [threads, setThreads] = useState<
		Array<{ id: string; title: string; createdAt: string; updatedAt: string }>
	>([])
	const [isLoadingThreads, setIsLoadingThreads] = useState(false)
	const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
		null,
	)
	const pendingFollowUpGenerations = useRef<Set<string>>(new Set())
	const messagesContainerRef = useRef<HTMLDivElement>(null)
	const { selectedProject } = useProject()
	const { viewMode } = useViewMode()
	const { user } = useAuth()
	const [threadId, setThreadId] = useQueryState("thread", threadParam)
	const fallbackChatId = useMemo(() => generateId(), [])
	const currentChatId = threadId ?? fallbackChatId
	const setCurrentChatId = useCallback(
		(id: string) => setThreadId(id),
		[setThreadId],
	)
	const [pendingThreadLoad, setPendingThreadLoad] = useState<{
		id: string
		messages: UIMessage[]
	} | null>(null)

	// Adjust chat height based on scroll position (desktop only, grid mode only)
	useEffect(() => {
		if (isMobile) return
		if (viewMode === "graph") return

		const handleWindowScroll = () => {
			const scrollThreshold = 80
			const scrollY = window.scrollY
			const progress = Math.min(scrollY / scrollThreshold, 1)
			const newOffset = 95 - progress * (95 - 15)
			setHeightOffset(newOffset)
		}

		window.addEventListener("scroll", handleWindowScroll, { passive: true })
		handleWindowScroll()

		return () => window.removeEventListener("scroll", handleWindowScroll)
	}, [isMobile, viewMode])

	const { messages, sendMessage, status, setMessages, stop } = useChat({
		id: currentChatId ?? undefined,
		transport: new DefaultChatTransport({
			api: `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/v2`,
			credentials: "include",
			body: {
				metadata: {
					chatId: currentChatId,
					projectId: selectedProject,
					model: selectedModel,
				},
			},
		}),
		onFinish: async (result) => {
			if (result.message.role !== "assistant") return

			// Mark this message as needing follow-up generation
			// We'll generate it after the message is fully in the messages array
			if (result.message.id) {
				pendingFollowUpGenerations.current.add(result.message.id)
			}
		},
	})

	useEffect(() => {
		if (pendingThreadLoad && currentChatId === pendingThreadLoad.id) {
			setMessages(pendingThreadLoad.messages)
			setPendingThreadLoad(null)
		}
	}, [currentChatId, pendingThreadLoad, setMessages])

	// Generate follow-up questions after assistant messages are complete
	useEffect(() => {
		const generateFollowUps = async () => {
			// Find assistant messages that need follow-up generation
			const messagesToProcess = messages.filter(
				(msg) =>
					msg.role === "assistant" &&
					pendingFollowUpGenerations.current.has(msg.id) &&
					!followUpQuestions[msg.id] &&
					!loadingFollowUps[msg.id],
			)

			for (const message of messagesToProcess) {
				// Get complete text from the message
				const assistantText = message.parts
					.filter((p) => p.type === "text")
					.map((p) => p.text)
					.join(" ")
					.trim()

				// Only generate if we have substantial text (at least 50 chars)
				// This ensures the message is complete, not just the first chunk
				// Also check if status is idle to ensure streaming is complete
				if (
					assistantText.length < 50 ||
					status === "streaming" ||
					status === "submitted"
				) {
					continue
				}

				// Mark as processing
				pendingFollowUpGenerations.current.delete(message.id)
				setLoadingFollowUps((prev) => ({
					...prev,
					[message.id]: true,
				}))

				try {
					// Get recent messages for context
					const recentMessages = messages.slice(-5).map((msg) => ({
						role: msg.role,
						content: msg.parts
							.filter((p) => p.type === "text")
							.map((p) => p.text)
							.join(" "),
					}))

					const response = await fetch(
						`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/follow-ups`,
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							credentials: "include",
							body: JSON.stringify({
								messages: recentMessages,
								assistantResponse: assistantText,
							}),
						},
					)

					if (response.ok) {
						const data = await response.json()
						if (data.questions && Array.isArray(data.questions)) {
							setFollowUpQuestions((prev) => ({
								...prev,
								[message.id]: data.questions,
							}))
						}
					}
				} catch (error) {
					console.error("Failed to generate follow-up questions:", error)
				} finally {
					setLoadingFollowUps((prev) => ({
						...prev,
						[message.id]: false,
					}))
				}
			}
		}

		// Only generate if not currently streaming or submitted
		// Small delay to ensure message is fully processed
		if (status !== "streaming" && status !== "submitted") {
			const timeoutId = setTimeout(() => {
				generateFollowUps()
			}, 300)

			return () => clearTimeout(timeoutId)
		}
	}, [messages, followUpQuestions, loadingFollowUps, status])

	const checkIfScrolledToBottom = useCallback(() => {
		if (!messagesContainerRef.current) return
		const container = messagesContainerRef.current
		const { scrollTop, scrollHeight, clientHeight } = container
		const distanceFromBottom = scrollHeight - scrollTop - clientHeight
		const isAtBottom = distanceFromBottom <= 20
		setIsScrolledToBottom(isAtBottom)
	}, [])

	const scrollToBottom = useCallback(() => {
		if (messagesContainerRef.current) {
			messagesContainerRef.current.scrollTop =
				messagesContainerRef.current.scrollHeight
			setIsScrolledToBottom(true)
		}
	}, [])

	const handleSend = () => {
		if (!input.trim() || status === "submitted" || status === "streaming")
			return
		analytics.chatMessageSent({ source: "typed" })
		sendMessage({ text: input })
		setInput("")
		scrollToBottom()
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
		analytics.chatMessageCopied({ message_id: messageId })
		navigator.clipboard.writeText(text)
		setCopiedMessageId(messageId)
		setTimeout(() => setCopiedMessageId(null), 2000)
	}, [])

	const handleLikeMessage = useCallback(
		(messageId: string) => {
			const wasLiked = messageFeedback[messageId] === "like"
			setMessageFeedback((prev) => ({
				...prev,
				[messageId]: prev[messageId] === "like" ? null : "like",
			}))
			if (!wasLiked) {
				analytics.chatMessageLiked({ message_id: messageId })
			}
		},
		[messageFeedback],
	)

	const handleDislikeMessage = useCallback(
		(messageId: string) => {
			const wasDisliked = messageFeedback[messageId] === "dislike"
			setMessageFeedback((prev) => ({
				...prev,
				[messageId]: prev[messageId] === "dislike" ? null : "dislike",
			}))
			if (!wasDisliked) {
				analytics.chatMessageDisliked({ message_id: messageId })
			}
		},
		[messageFeedback],
	)

	const handleToggleMemories = useCallback((messageId: string) => {
		setExpandedMemories((prev) => {
			const isExpanding = prev !== messageId
			if (isExpanding) {
				analytics.chatMemoryExpanded({ message_id: messageId })
			} else {
				analytics.chatMemoryCollapsed({ message_id: messageId })
			}
			return prev === messageId ? null : messageId
		})
	}, [])

	const handleNewChat = useCallback(() => {
		analytics.newChatCreated()
		setThreadId(null)
		setInput("")
	}, [setThreadId])

	const fetchThreads = useCallback(async () => {
		setIsLoadingThreads(true)
		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/threads?projectId=${selectedProject}`,
				{ credentials: "include" },
			)
			if (response.ok) {
				const data = await response.json()
				setThreads(data.threads || [])
			}
		} catch (error) {
			console.error("Failed to fetch threads:", error)
		} finally {
			setIsLoadingThreads(false)
		}
	}, [selectedProject])

	const loadThread = useCallback(
		async (id: string) => {
			try {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/threads/${id}`,
					{ credentials: "include" },
				)
				if (response.ok) {
					const data = await response.json()
					const uiMessages = data.messages.map(
						(m: {
							id: string
							role: string
							parts: unknown
							createdAt: string
						}) => ({
							id: m.id,
							role: m.role,
							parts: m.parts || [],
							createdAt: new Date(m.createdAt),
						}),
					)
					setThreadId(id)
					setPendingThreadLoad({ id, messages: uiMessages })
					analytics.chatThreadLoaded({ thread_id: id })
					setIsHistoryOpen(false)
					setConfirmingDeleteId(null)
				}
			} catch (error) {
				console.error("Failed to load thread:", error)
			}
		},
		[setThreadId],
	)

	const deleteThread = useCallback(
		async (threadId: string) => {
			try {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/threads/${threadId}`,
					{ method: "DELETE", credentials: "include" },
				)
				if (response.ok) {
					analytics.chatThreadDeleted({ thread_id: threadId })
					setThreads((prev) => prev.filter((t) => t.id !== threadId))
					if (currentChatId === threadId) {
						handleNewChat()
					}
				}
			} catch (error) {
				console.error("Failed to delete thread:", error)
			} finally {
				setConfirmingDeleteId(null)
			}
		},
		[currentChatId, handleNewChat],
	)

	const formatRelativeTime = (isoString: string): string => {
		return formatDistanceToNow(new Date(isoString), { addSuffix: true })
	}

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const activeElement = document.activeElement as HTMLElement | null
			const isInEditableContext =
				activeElement?.tagName === "INPUT" ||
				activeElement?.tagName === "TEXTAREA" ||
				activeElement?.isContentEditable ||
				activeElement?.closest('[contenteditable="true"]')

			if (
				e.key.toLowerCase() === "t" &&
				!e.metaKey &&
				!e.ctrlKey &&
				!e.altKey &&
				isChatOpen &&
				!isInEditableContext
			) {
				e.preventDefault()
				handleNewChat()
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [isChatOpen, handleNewChat])

	// Send queued message when chat opens
	useEffect(() => {
		if (
			isChatOpen &&
			queuedMessage &&
			status !== "submitted" &&
			status !== "streaming"
		) {
			analytics.chatMessageSent({ source: "highlight" })
			sendMessage({ text: queuedMessage })
			onConsumeQueuedMessage?.()
		}
	}, [isChatOpen, queuedMessage, status, sendMessage, onConsumeQueuedMessage])

	// Scroll to bottom when a new user message is added
	useEffect(() => {
		const lastMessage = messages[messages.length - 1]
		if (lastMessage?.role === "user" && messagesContainerRef.current) {
			messagesContainerRef.current.scrollTop =
				messagesContainerRef.current.scrollHeight
			setIsScrolledToBottom(true)
		}
		// Always check scroll position when messages change
		checkIfScrolledToBottom()
	}, [messages, checkIfScrolledToBottom])

	// Add scroll event listener to track scroll position
	useEffect(() => {
		const container = messagesContainerRef.current
		if (!container) return

		const handleScroll = () => {
			requestAnimationFrame(() => {
				checkIfScrolledToBottom()
			})
		}

		container.addEventListener("scroll", handleScroll, { passive: true })
		// Initial check with a small delay to ensure DOM is ready
		setTimeout(() => {
			checkIfScrolledToBottom()
		}, 100)

		// Also observe resize to detect content height changes
		const resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				checkIfScrolledToBottom()
			})
		})
		resizeObserver.observe(container)

		return () => {
			container.removeEventListener("scroll", handleScroll)
			resizeObserver.disconnect()
		}
	}, [checkIfScrolledToBottom])

	return (
		<AnimatePresence mode="wait">
			{!isChatOpen ? (
				<motion.div
					key="closed"
					className={cn(
						"flex items-start justify-start",
						isMobile
							? "fixed bottom-5 right-0 left-0 z-50 justify-center items-center"
							: "absolute top-[-10px] right-0 m-4",
						dmSansClassName(),
					)}
					layoutId="chat-toggle-button"
				>
					<motion.button
						onClick={toggleChat}
						className={cn(
							"flex items-center gap-3 rounded-full px-3 py-1.5 text-sm font-medium border text-white cursor-pointer whitespace-nowrap",
							isMobile
								? "gap-2.5 px-5 py-3 text-[15px] border-[#1E2128] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)]"
								: "border-[#17181A] shadow-lg",
						)}
						style={{
							background: isMobile
								? "linear-gradient(135deg, #12161C 0%, #0A0D12 100%)"
								: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
						}}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						<NovaOrb size={isMobile ? 26 : 24} className="blur-[0.6px]! z-10" />
						<span className={cn(isMobile && "font-medium")}>
							Chat with Nova
						</span>
					</motion.button>
				</motion.div>
			) : (
				<motion.div
					key="open"
					className={cn(
						"bg-[#05070A] backdrop-blur-md flex flex-col border border-[#17181AB2] relative pt-4",
						isMobile
							? "fixed inset-0 z-50 w-full h-dvh rounded-none m-0"
							: "w-[450px] rounded-2xl m-4 mt-2",
						dmSansClassName(),
					)}
					style={
						isMobile
							? undefined
							: {
									height: `calc(100vh - ${heightOffset}px)`,
								}
					}
					initial={
						isMobile ? { y: "100%", opacity: 0 } : { x: "100px", opacity: 0 }
					}
					animate={{ x: 0, y: 0, opacity: 1 }}
					exit={
						isMobile ? { y: "100%", opacity: 0 } : { x: "100px", opacity: 0 }
					}
					transition={{ duration: 0.3, ease: "easeOut", bounce: 0 }}
				>
					<div
						className={cn(
							"absolute top-0 left-0 right-0 flex items-center justify-between pt-4 px-4",
							!isMobile && "rounded-t-2xl",
						)}
						style={{
							background:
								"linear-gradient(180deg, #0A0E14 40.49%, rgba(10, 14, 20, 0.00) 100%)",
						}}
					>
						<ChatModelSelector
							selectedModel={selectedModel}
							onModelChange={setSelectedModel}
						/>
						<div className="flex items-center gap-2">
							{!isMobile && (
								<Dialog
									open={isHistoryOpen}
									onOpenChange={(open) => {
										setIsHistoryOpen(open)
										if (open) {
											fetchThreads()
											analytics.chatHistoryViewed?.()
										} else {
											setConfirmingDeleteId(null)
										}
									}}
								>
									<DialogTrigger asChild>
										<Button
											variant="headers"
											className="rounded-full text-base gap-2 h-10! border-[#73737333] bg-[#0D121A] cursor-pointer"
											style={{
												boxShadow:
													"1.5px 1.5px 4.5px 0 rgba(0, 0, 0, 0.70) inset",
											}}
										>
											<HistoryIcon className="size-4 text-[#737373]" />
										</Button>
									</DialogTrigger>
									<DialogContent className="sm:max-w-lg bg-[#0A0E14] border-[#17181AB2] text-white">
										<DialogHeader className="pb-4 border-b border-[#17181AB2]">
											<DialogTitle>Chat History</DialogTitle>
											<DialogDescription className="text-[#737373]">
												Project: {selectedProject}
											</DialogDescription>
										</DialogHeader>
										<ScrollArea className="max-h-96">
											{isLoadingThreads ? (
												<div className="flex items-center justify-center py-8">
													<SuperLoader label="Loading..." />
												</div>
											) : threads.length === 0 ? (
												<div className="text-sm text-[#737373] text-center py-8">
													No conversations yet
												</div>
											) : (
												<div className="flex flex-col gap-1">
													{threads.map((thread) => {
														const isActive = thread.id === currentChatId
														return (
															<button
																key={thread.id}
																type="button"
																onClick={() => loadThread(thread.id)}
																className={cn(
																	"flex items-center justify-between rounded-md px-3 py-2 w-full text-left transition-colors",
																	isActive
																		? "bg-[#267BF1]/10"
																		: "hover:bg-[#17181A]",
																)}
															>
																<div className="min-w-0 flex-1">
																	<div className="text-sm font-medium truncate">
																		{thread.title || "Untitled Chat"}
																	</div>
																	<div className="text-xs text-[#737373]">
																		{formatRelativeTime(thread.updatedAt)}
																	</div>
																</div>
																{confirmingDeleteId === thread.id ? (
																	<div className="flex items-center gap-1 ml-2">
																		<Button
																			type="button"
																			size="icon"
																			onClick={(e) => {
																				e.stopPropagation()
																				deleteThread(thread.id)
																			}}
																			className="bg-red-500 text-white hover:bg-red-600 h-7 w-7"
																		>
																			<Check className="size-3" />
																		</Button>
																		<Button
																			type="button"
																			variant="ghost"
																			size="icon"
																			onClick={(e) => {
																				e.stopPropagation()
																				setConfirmingDeleteId(null)
																			}}
																			className="h-7 w-7"
																		>
																			<XIcon className="size-3 text-[#737373]" />
																		</Button>
																	</div>
																) : (
																	<Button
																		type="button"
																		variant="ghost"
																		size="icon"
																		onClick={(e) => {
																			e.stopPropagation()
																			setConfirmingDeleteId(thread.id)
																		}}
																		className="h-7 w-7 ml-2"
																	>
																		<Trash2 className="size-3 text-[#737373]" />
																	</Button>
																)}
															</button>
														)
													})}
												</div>
											)}
										</ScrollArea>
										<Button
											variant="outline"
											className="w-full border-dashed border-[#73737333] bg-transparent hover:bg-[#17181A]"
											onClick={() => {
												handleNewChat()
												setIsHistoryOpen(false)
											}}
										>
											<Plus className="size-4 mr-1" /> New Conversation
										</Button>
									</DialogContent>
								</Dialog>
							)}
							<Button
								variant="headers"
								className="rounded-full text-base gap-3 h-10! border-[#73737333] bg-[#0D121A] cursor-pointer"
								style={{
									boxShadow: "1.5px 1.5px 4.5px 0 rgba(0, 0, 0, 0.70) inset",
								}}
								onClick={handleNewChat}
								title="New chat (T)"
							>
								<SquarePenIcon className="size-4 text-[#737373]" />
								{!isMobile && (
									<span
										className={cn(
											"bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm size-4 text-[10px] flex items-center justify-center",
											dmSansClassName(),
										)}
									>
										T
									</span>
								)}
							</Button>
							<motion.button
								onClick={toggleChat}
								className={cn(
									"flex items-center gap-2 rounded-full p-2 text-xs text-white cursor-pointer",
									isMobile && "bg-[#0D121A] border border-[#73737333]",
								)}
								style={
									isMobile
										? {
												boxShadow:
													"1.5px 1.5px 4.5px 0 rgba(0, 0, 0, 0.70) inset",
											}
										: undefined
								}
								layoutId="chat-toggle-button"
							>
								{isMobile ? (
									<XIcon className="size-4" />
								) : (
									<PanelRightCloseIcon className="size-4" />
								)}
							</motion.button>
						</div>
					</div>
					<div
						ref={messagesContainerRef}
						className={cn(
							"flex-1 overflow-y-auto px-4 scrollbar-thin",
							dmSansClassName(),
						)}
					>
						{isInputExpanded && (
							<div
								className="absolute inset-0 z-10! rounded-2xl pointer-events-none"
								style={{ backgroundColor: "#000000E5" }}
							/>
						)}
						{messages.length === 0 && (
							<ChatEmptyStatePlaceholder
								onSuggestionClick={(suggestion) => {
									analytics.chatSuggestedQuestionClicked()
									analytics.chatMessageSent({ source: "suggested" })
									sendMessage({ text: suggestion })
								}}
								suggestions={emptyStateSuggestions}
							/>
						)}
						<div
							className={cn(
								messages.length > 0
									? "flex flex-col space-y-3 min-h-full justify-end pt-14"
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
											followUpQuestions={followUpQuestions[message.id] || []}
											isLoadingFollowUps={loadingFollowUps[message.id] || false}
											onCopy={handleCopyMessage}
											onLike={handleLikeMessage}
											onDislike={handleDislikeMessage}
											onToggleMemories={handleToggleMemories}
											onQuestionClick={(question) => {
												analytics.chatFollowUpClicked({
													thread_id: currentChatId || undefined,
												})
												analytics.chatMessageSent({ source: "follow_up" })
												setInput(question)
											}}
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

					{!isScrolledToBottom && messages.length > 0 && (
						<div className="absolute bottom-24 left-0 right-0 flex justify-center z-50 pointer-events-none">
							<button
								type="button"
								className="cursor-pointer pointer-events-auto"
								onClick={scrollToBottom}
							>
								<div className="rounded-full p-2 bg-[#0D121A] shadow-[1.5px_1.5px_4.5px_0_rgba(0,0,0,0.70)_inset] hover:bg-[#0F1620] transition-colors">
									<ChevronDownIcon className="size-4 text-white" />
								</div>
							</button>
						</div>
					)}

					<ChatInput
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onSend={handleSend}
						onStop={stop}
						onKeyDown={handleKeyDown}
						isResponding={status === "submitted" || status === "streaming"}
						activeStatus={
							status === "submitted"
								? "Thinking..."
								: status === "streaming"
									? "Structuring response..."
									: "Waiting for input..."
						}
						onExpandedChange={setIsInputExpanded}
						chainOfThoughtComponent={
							messages.length > 0 ? (
								<ChainOfThought messages={messages} />
							) : null
						}
					/>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
