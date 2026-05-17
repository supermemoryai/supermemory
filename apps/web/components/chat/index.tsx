"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useQueryState } from "nuqs"
import type { UIMessage } from "@ai-sdk/react"
import { motion } from "motion/react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import NovaOrb from "@/components/nova/nova-orb"
import { Button } from "@ui/components/button"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet"
import { ScrollArea } from "@ui/components/scroll-area"
import {
	ArrowLeft,
	Check,
	ChevronDownIcon,
	HistoryIcon,
	Plus,
	SquarePenIcon,
	Trash2,
	XIcon,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import ChatInput from "./input"
import ChatModelSelector from "./model-selector"
import { getNovaChatErrorCopy } from "@/lib/chat-stream-error"
import { useProject } from "@/stores"
import { useContainerTags } from "@/hooks/use-container-tags"
import { getChatSpaceDisplayLabel } from "@/lib/chat-space-label"
import { modelNames, type ModelId } from "@/lib/models"
import { SpaceSelector } from "@/components/space-selector"
import { SuperLoader } from "../superloader"
import { UserMessage } from "./message/user-message"
import { AgentMessage } from "./message/agent-message"
import { ChatGraphContextRail } from "./chat-graph-context-rail"
import { ChainOfThought } from "./input/chain-of-thought"
import { useIsMobile } from "@hooks/use-mobile"
import { useAuth } from "@lib/auth-context"
import { analytics } from "@/lib/analytics"
import { generateId } from "@lib/generate-id"
import { useViewMode } from "@/lib/view-mode-context"
import { threadParam } from "@/lib/search-params"
import { AUTO_CHAT_SPACE_ID } from "@/lib/chat-auto-space"

const DEFAULT_CHAT_PROMPTS = [
	"What do you know about me?",
	"What have I been working on lately?",
	"What themes keep showing up in my memories?",
]

const chatEmptyCardClass = cn(
	"flex min-h-[76px] flex-col justify-between rounded-lg border border-[#2B3038] bg-[#14161A]/95 p-3 text-left md:min-h-[88px]",
	"shadow-[0_18px_50px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.04)]",
	"transition-colors hover:border-[#3374FF]/55 hover:bg-[#1A1F26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3374FF]/70",
)

function ChatEmptyStatePlaceholder({
	onSuggestionClick,
	suggestions = DEFAULT_CHAT_PROMPTS,
}: {
	onSuggestionClick: (suggestion: string) => void
	suggestions?: string[]
}) {
	const promptCards = suggestions.slice(0, 3)

	return (
		<div
			id="chat-empty-state"
			className="relative flex min-h-full items-center justify-center overflow-hidden px-0 py-6 md:px-3"
		>
			<div
				className="pointer-events-none absolute inset-x-[-1rem] inset-y-0 bg-[radial-gradient(circle_at_center,rgba(105,167,240,0.28)_1px,transparent_1px)] bg-size-[32px_32px] opacity-80 mask-[radial-gradient(ellipse_at_center,black_52%,transparent_100%)]"
				aria-hidden
			/>
			<div
				className="pointer-events-none absolute inset-x-[-1rem] bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_bottom,rgba(20,65,255,0.42),transparent_68%)]"
				aria-hidden
			/>
			<div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
				<NovaOrb size={52} className="mb-3 blur-[1.5px]!" />
				<h2
					className={cn(
						"mb-1 max-w-[420px] text-[24px] font-medium leading-[1.12] tracking-normal text-white md:text-[30px]",
						dmSansClassName(),
					)}
				>
					Nova knows you.
				</h2>
				<p
					className={cn(
						"mb-4 max-w-[420px] text-[14px] leading-5 text-[#8B8B8B] md:text-[15px]",
						dmSansClassName(),
					)}
				>
					<span className="text-[#FAFAFA]">
						Your personal memories are all here.
					</span>{" "}
					Chat with supermemory and ask about...
				</p>
				<div className="mb-3 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3">
					{promptCards.map((suggestion, index) => (
						<button
							key={suggestion}
							type="button"
							onClick={() => onSuggestionClick(suggestion)}
							className={chatEmptyCardClass}
						>
							<span className="flex size-5 items-center justify-center rounded-full border border-[#3374FF]/35 bg-[#071B3A] text-[11px] font-medium text-[#4BA0FA]">
								{index + 1}
							</span>
							<span className="mt-2 line-clamp-3 text-[13px] font-medium leading-[18px] text-white md:text-[14px] md:leading-5">
								{suggestion}
							</span>
						</button>
					))}
				</div>
			</div>
		</div>
	)
}

export function ChatLaunchFab({
	onOpen,
	isMobile,
}: {
	onOpen: () => void
	isMobile: boolean
}) {
	return (
		<motion.div
			className={cn(
				"flex items-start justify-start pointer-events-none",
				isMobile
					? "fixed bottom-5 right-0 left-0 z-50 justify-center items-center"
					: "fixed z-20 top-24 right-4 md:right-6",
				dmSansClassName(),
			)}
			layoutId="chat-toggle-button"
		>
			<motion.button
				type="button"
				onClick={onOpen}
				className={cn(
					"pointer-events-auto flex items-center gap-3 rounded-full px-3 py-1.5 text-sm font-medium border text-white cursor-pointer whitespace-nowrap",
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
				<span className={cn(isMobile && "font-medium")}>Chat with Nova</span>
			</motion.button>
		</motion.div>
	)
}

export function ChatSidebar({
	isChatOpen,
	setIsChatOpen,
	queuedMessage,
	queuedHighlightContent,
	onConsumeQueuedMessage,
	queuedMessageSource = "highlight",
	initialSelectedModel = null,
	initialChatProject = null,
	emptyStateSuggestions,
	layout = "sidebar",
}: {
	isChatOpen: boolean
	setIsChatOpen: (open: boolean) => void
	queuedMessage?: string | null
	queuedHighlightContent?: string | null
	onConsumeQueuedMessage?: () => void
	queuedMessageSource?: "highlight" | "home"
	initialSelectedModel?: ModelId | null
	initialChatProject?: string | null
	emptyStateSuggestions?: string[]
	layout?: "sidebar" | "page"
}) {
	const isMobile = useIsMobile()
	const isPageDesktop = layout === "page" && !isMobile
	const [input, setInput] = useState("")
	const [selectedModel, setSelectedModel] = useState<ModelId>(
		initialSelectedModel ?? "claude-sonnet-4.6",
	)
	const selectedModelRef = useRef(selectedModel)
	selectedModelRef.current = selectedModel
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
	const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
	const [messageFeedback, setMessageFeedback] = useState<
		Record<string, "like" | "dislike" | null>
	>({})
	const [expandedMemories, setExpandedMemories] = useState<string | null>(null)
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
	const messagesContainerRef = useRef<HTMLDivElement>(null)
	const isScrolledToBottomRef = useRef(true)
	const sentQueuedMessageRef = useRef<string | null>(null)
	const pendingHighlightReplyRef = useRef<string | null>(null)
	const awaitingHighlightInjectionRef = useRef(false)
	const pendingHighlightMessageRef = useRef<UIMessage[] | null>(null)
	const targetHighlightChatIdRef = useRef<string | null>(null)
	const { selectedProject } = useProject()
	const [chatSpaceProjects, setChatSpaceProjects] = useState<string[]>([
		initialChatProject ?? selectedProject,
	])
	const chatProject = chatSpaceProjects[0] ?? selectedProject
	const { allProjects } = useContainerTags()
	const selectedProjectRef = useRef(chatProject)
	selectedProjectRef.current = chatProject
	const chatSpaceLabel = useMemo(
		() =>
			chatProject === AUTO_CHAT_SPACE_ID
				? "Auto"
				: getChatSpaceDisplayLabel({
						selectedProject: chatProject,
						allProjects,
					}),
		[chatProject, allProjects],
	)
	const { viewMode } = useViewMode()
	const { user: _user } = useAuth()
	const [threadId, setThreadId] = useQueryState("thread", threadParam)
	const [fallbackChatId, setFallbackChatId] = useState(() => generateId())
	const currentChatId = threadId ?? fallbackChatId
	const chatIdRef = useRef(currentChatId)
	chatIdRef.current = currentChatId
	const _setCurrentChatId = useCallback(
		(id: string) => setThreadId(id),
		[setThreadId],
	)
	const chatApiBase =
		process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

	const chatTransport = useMemo(
		() =>
			new DefaultChatTransport({
				api: `${chatApiBase}/chat`,
				credentials: "include",
				prepareSendMessagesRequest: ({ messages }) => ({
					body: {
						messages,
						metadata: {
							chatId: chatIdRef.current,
							projectId: selectedProjectRef.current,
							spaceMode:
								selectedProjectRef.current === AUTO_CHAT_SPACE_ID
									? "auto"
									: "manual",
							enableSpaceDiscovery:
								selectedProjectRef.current === AUTO_CHAT_SPACE_ID,
							model: selectedModelRef.current,
						},
					},
				}),
			}),
		[chatApiBase],
	)
	const [pendingThreadLoad, setPendingThreadLoad] = useState<{
		id: string
		messages: UIMessage[]
	} | null>(null)

	// Adjust chat height based on scroll position (desktop only, grid mode only)
	useEffect(() => {
		if (isMobile) return
		if (viewMode === "graph") return
		if (layout === "page") return

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
	}, [isMobile, viewMode, layout])

	const {
		messages,
		sendMessage,
		status,
		setMessages,
		stop,
		error,
		clearError,
	} = useChat({
		id: currentChatId ?? undefined,
		transport: chatTransport,
	})

	const chatStreamError = useMemo(
		() => (error ? getNovaChatErrorCopy(error, selectedModel) : null),
		[error, selectedModel],
	)

	const handleModelChange = useCallback(
		(modelId: ModelId) => {
			setSelectedModel(modelId)
			clearError()
		},
		[clearError],
	)

	useEffect(() => {
		if (pendingThreadLoad && currentChatId === pendingThreadLoad.id) {
			setMessages(pendingThreadLoad.messages)
			setPendingThreadLoad(null)
		}
	}, [currentChatId, pendingThreadLoad, setMessages])

	const checkIfScrolledToBottom = useCallback(() => {
		if (!messagesContainerRef.current) return
		const container = messagesContainerRef.current
		const { scrollTop, scrollHeight, clientHeight } = container
		const distanceFromBottom = scrollHeight - scrollTop - clientHeight
		const isAtBottom = distanceFromBottom <= 20
		isScrolledToBottomRef.current = isAtBottom
		setIsScrolledToBottom(isAtBottom)
	}, [])

	const scrollToBottom = useCallback(() => {
		if (messagesContainerRef.current) {
			messagesContainerRef.current.scrollTop =
				messagesContainerRef.current.scrollHeight
			isScrolledToBottomRef.current = true
			setIsScrolledToBottom(true)
		}
	}, [])

	const handleSend = () => {
		if (!input.trim() || status === "submitted" || status === "streaming")
			return
		if (!threadId) setThreadId(fallbackChatId)
		analytics.chatMessageSent({ source: "typed" })
		sendMessage({ text: input })
		setInput("")
		scrollToBottom()
	}

	const handleSuggestedQuestion = useCallback(
		(suggestion: string) => {
			if (status === "submitted" || status === "streaming") return
			if (!threadId) setThreadId(fallbackChatId)
			analytics.chatSuggestedQuestionClicked()
			analytics.chatMessageSent({ source: "suggested" })
			sendMessage({ text: suggestion })
			scrollToBottom()
		},
		[
			fallbackChatId,
			sendMessage,
			setThreadId,
			status,
			threadId,
			scrollToBottom,
		],
	)

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
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
		const newChatId = generateId()
		chatIdRef.current = newChatId
		setMessages([])
		setThreadId(null)
		setFallbackChatId(newChatId)
		setInput("")
	}, [setThreadId, setMessages])

	const fetchThreads = useCallback(async () => {
		setIsLoadingThreads(true)
		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/threads?projectId=${chatProject}`,
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
	}, [chatProject])

	useEffect(() => {
		if (!isHistoryOpen) return
		fetchThreads()
		analytics.chatHistoryViewed?.()
	}, [isHistoryOpen, fetchThreads])

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
							parts: Array<{ type: string }>
							createdAt: string
						}) => ({
							id: m.id,
							role: m.role,
							// Strip tool parts — persisted format doesn't round-trip through
							// convertToModelMessages correctly and causes tool_use/tool_result
							// mismatch errors. Text history is sufficient for context.
							parts: (m.parts || []).filter(
								(p) => p.type === "text" || p.type === "reasoning",
							),
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

	// Auto-restore thread from URL on mount (e.g. reload or direct link)
	const didAutoLoadRef = useRef(false)
	const initialThreadIdRef = useRef(threadId)
	useEffect(() => {
		if (didAutoLoadRef.current) return
		const initialThreadId = initialThreadIdRef.current
		if (!initialThreadId) return
		didAutoLoadRef.current = true
		loadThread(initialThreadId)
	}, [loadThread])

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
			status !== "streaming" &&
			sentQueuedMessageRef.current !== queuedMessage
		) {
			if (initialSelectedModel && selectedModel !== initialSelectedModel) {
				setSelectedModel(initialSelectedModel)
				return
			}
			sentQueuedMessageRef.current = queuedMessage
			analytics.chatMessageSent({ source: queuedMessageSource })

			if (queuedHighlightContent) {
				// Start a fresh thread for highlight-based chats to avoid overwriting existing conversations
				const newChatId = generateId()
				chatIdRef.current = newChatId
				setThreadId(null)
				setFallbackChatId(newChatId)

				// Store the highlight message and user reply in refs.
				// We cannot call setMessages here because setFallbackChatId above triggers
				// useChat to recreate its internal Chat object (new id → new Chat), which
				// resets messages to []. Instead, pendingHighlightMessageRef is read by a
				// separate useEffect that fires after currentChatId has settled, ensuring
				// setMessages is called on the correct, freshly-created Chat instance.
				// targetHighlightChatIdRef ensures we only call setMessages once the new
				// Chat instance (with id=newChatId) is active, not the old one.
				pendingHighlightReplyRef.current = queuedMessage
				awaitingHighlightInjectionRef.current = true
				targetHighlightChatIdRef.current = newChatId
				pendingHighlightMessageRef.current = [
					{
						id: generateId(),
						role: "assistant" as const,
						parts: [
							{
								type: "text" as const,
								text: `Here is a highlight from your memories:\n\n${queuedHighlightContent}`,
							},
						],
					},
				]
			} else {
				if (!threadId) setThreadId(fallbackChatId)
				sendMessage({ text: queuedMessage })
			}
			onConsumeQueuedMessage?.()
		}
	}, [
		isChatOpen,
		queuedMessage,
		queuedHighlightContent,
		queuedMessageSource,
		initialSelectedModel,
		selectedModel,
		status,
		sendMessage,
		onConsumeQueuedMessage,
		fallbackChatId,
		setThreadId,
		threadId,
	])

	// Inject the pending highlight assistant message once the new Chat instance is ready.
	// This effect must run AFTER the currentChatId change has been committed and useChat
	// has recreated its internal Chat object, so that setMessages targets the correct instance.
	// We gate on currentChatId === targetHighlightChatIdRef to ensure we call setMessages
	// only when useChat's internal Chat has the new id (not the old one from before setFallbackChatId).
	useEffect(() => {
		if (
			awaitingHighlightInjectionRef.current &&
			pendingHighlightMessageRef.current &&
			targetHighlightChatIdRef.current &&
			currentChatId === targetHighlightChatIdRef.current
		) {
			const msgs = pendingHighlightMessageRef.current
			pendingHighlightMessageRef.current = null
			targetHighlightChatIdRef.current = null
			setMessages(msgs)
		}
	}, [currentChatId, setMessages])

	// Send pending highlight reply once the injected assistant message is committed
	useEffect(() => {
		if (
			awaitingHighlightInjectionRef.current &&
			pendingHighlightReplyRef.current &&
			messages.length >= 1 &&
			messages[0]?.role === "assistant" &&
			status === "ready"
		) {
			awaitingHighlightInjectionRef.current = false
			const reply = pendingHighlightReplyRef.current
			pendingHighlightReplyRef.current = null
			sendMessage({ text: reply })
		}
	}, [messages, sendMessage, status])

	// Reset the sent message ref when queued message is consumed
	useEffect(() => {
		if (!queuedMessage) {
			sentQueuedMessageRef.current = null
		}
	}, [queuedMessage])

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

	useEffect(() => {
		const isStreaming = status === "streaming"
		const lastMessage = messages[messages.length - 1]
		const isLastMessageFromAssistant = lastMessage?.role === "assistant"

		if (
			isStreaming &&
			isLastMessageFromAssistant &&
			isScrolledToBottomRef.current
		) {
			scrollToBottom()
		}
	}, [status, messages, scrollToBottom])

	useEffect(() => {
		const container = messagesContainerRef.current
		if (!container) return

		const isStreaming = status === "streaming"
		if (!isStreaming) return

		const mutationObserver = new MutationObserver(() => {
			if (isScrolledToBottomRef.current) {
				requestAnimationFrame(() => {
					scrollToBottom()
				})
			}
		})

		mutationObserver.observe(container, {
			childList: true,
			subtree: true,
			characterData: true,
		})

		return () => {
			mutationObserver.disconnect()
		}
	}, [status, scrollToBottom])

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

	if (!isChatOpen) {
		return null
	}

	const isStackedInput = layout === "page"
	const showHeaderRow = !isPageDesktop || isMobile || !isStackedInput

	const chatHistorySheet = (
		<Sheet
			open={isHistoryOpen}
			onOpenChange={(open) => {
				setIsHistoryOpen(open)
				if (!open) {
					setConfirmingDeleteId(null)
				}
			}}
		>
			<SheetContent
				side="right"
				className={cn(
					"flex h-full max-h-dvh w-full flex-col gap-0 overflow-hidden border-[#17181AB2] bg-[#0A0E14] p-0 text-white sm:max-w-md",
					"[&>button]:text-[#FAFAFA]",
					dmSansClassName(),
				)}
			>
				<SheetHeader className="shrink-0 space-y-1 border-[#17181AB2] border-b px-6 pt-6 pb-4">
					<SheetTitle>Chat History</SheetTitle>
					<SheetDescription className="text-[#737373]">
						Space: {chatSpaceLabel}
					</SheetDescription>
				</SheetHeader>
				<ScrollArea className="min-h-0 flex-1 px-6">
					<div className="py-4">
						{isLoadingThreads ? (
							<div className="flex items-center justify-center py-8">
								<SuperLoader label="Loading…" />
							</div>
						) : threads.length === 0 ? (
							<div className="py-8 text-center text-sm text-[#737373]">
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
												"flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors",
												isActive ? "bg-[#267BF1]/10" : "hover:bg-[#17181A]",
											)}
										>
											<div className="min-w-0 flex-1">
												<div className="truncate text-sm font-medium">
													{thread.title || "Untitled Chat"}
												</div>
												<div className="text-xs text-[#737373]">
													{formatRelativeTime(thread.updatedAt)}
												</div>
											</div>
											{confirmingDeleteId === thread.id ? (
												<div className="ml-2 flex items-center gap-1">
													<Button
														type="button"
														size="icon"
														onClick={(e) => {
															e.stopPropagation()
															deleteThread(thread.id)
														}}
														className="size-7 bg-red-500 text-white hover:bg-red-600"
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
														className="size-7"
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
													className="ml-2 size-7"
												>
													<Trash2 className="size-3 text-[#737373]" />
												</Button>
											)}
										</button>
									)
								})}
							</div>
						)}
					</div>
				</ScrollArea>
				<div className="shrink-0 border-[#17181AB2] border-t p-4">
					<Button
						variant="outline"
						className="w-full border-[#161F2C] border-dashed bg-transparent hover:bg-[#17181A]"
						onClick={() => {
							handleNewChat()
							setIsHistoryOpen(false)
						}}
					>
						<Plus className="mr-1 size-4" /> New Conversation
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)

	const chatToolbarActions = (
		<div className="flex shrink-0 items-center gap-2">
			<button
				type="button"
				onClick={() => setIsHistoryOpen(true)}
				className={cn(
					"flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#161F2C] bg-[#000000] transition-colors hover:bg-[#161F2C]",
					dmSansClassName(),
				)}
				aria-label="Chat history"
			>
				<HistoryIcon className="size-4 text-[#FAFAFA]" />
			</button>
			<button
				type="button"
				onClick={handleNewChat}
				title="New chat (T)"
				className={cn(
					"flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#161F2C] bg-[#000000] transition-colors hover:bg-[#161F2C]",
					dmSansClassName(),
				)}
				aria-label="New chat"
			>
				<SquarePenIcon className="size-4 text-[#FAFAFA]" />
			</button>
		</div>
	)

	const pageDesktopToolbarRow = isPageDesktop ? (
		<div
			className={cn(
				"flex w-full shrink-0 items-center justify-end gap-2 px-4 pt-2 pb-1 z-10",
				dmSansClassName(),
			)}
		>
			{chatToolbarActions}
		</div>
	) : null

	const shell = (
		<>
			{showHeaderRow ? (
				<div
					className={cn(
						"flex items-center justify-between px-0 z-10",
						isPageDesktop
							? "relative shrink-0 pt-2 pb-1"
							: "absolute top-0 right-0 left-0 pt-4 px-4",
						!isMobile && !isPageDesktop && "rounded-t-2xl",
					)}
				>
					<div className="mr-2 flex min-w-0 flex-1 items-center gap-2">
						{layout === "page" && isMobile && (
							<Button
								type="button"
								variant="headers"
								className="h-10! w-10! shrink-0 cursor-pointer rounded-full border-[#73737333] bg-[#0D121A] p-0!"
								style={{
									boxShadow: "1.5px 1.5px 4.5px 0 rgba(0, 0, 0, 0.70) inset",
								}}
								onClick={() => setIsChatOpen(false)}
								aria-label="Back to memories"
							>
								<ArrowLeft className="size-4 text-[#737373]" />
							</Button>
						)}
						{!isStackedInput && (
							<>
								<ChatModelSelector
									selectedModel={selectedModel}
									onModelChange={handleModelChange}
								/>
								<SpaceSelector
									selectedProjects={chatSpaceProjects}
									onValueChange={setChatSpaceProjects}
									variant="insideOut"
									includeAuto
									triggerClassName="h-10 min-h-10 max-w-[min(192px,42vw)] border border-[#73737333] bg-[#0D121A] shadow-[1.5px_1.5px_4.5px_0_rgba(0,0,0,0.70)_inset]"
								/>
							</>
						)}
					</div>
					{chatToolbarActions}
				</div>
			) : null}
			<div
				ref={messagesContainerRef}
				className={cn(
					"relative flex-1 overflow-y-auto scrollbar-thin",
					isPageDesktop && "min-h-0",
					"px-4",
					dmSansClassName(),
				)}
			>
				{isInputExpanded && (
					<div
						className={cn(
							"absolute inset-0 z-10! pointer-events-none",
							isPageDesktop ? "rounded-none" : "rounded-2xl",
						)}
						style={{ backgroundColor: "#000000E5" }}
					/>
				)}
				{messages.length === 0 && (
					<ChatEmptyStatePlaceholder
						onSuggestionClick={handleSuggestedQuestion}
						suggestions={emptyStateSuggestions}
					/>
				)}
				<div
					className={
						messages.length > 0
							? cn(
									"flex flex-col space-y-3 min-h-full justify-end",
									isPageDesktop ? "pt-2" : "pt-14",
								)
							: ""
					}
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
								message.role === "assistant" && setHoveredMessageId(message.id)
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
					{(status === "submitted" || status === "streaming") && (
						<div className="flex gap-2">
							<SuperLoader label="Thinking…" />
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

			{chatStreamError && (
				<div
					role="alert"
					className={cn(
						"mb-2 rounded-lg bg-amber-950/40 px-3 py-2 text-sm text-amber-50/95",
						isPageDesktop ? "mx-0" : "mx-4",
						dmSansClassName(),
					)}
				>
					<div className="flex justify-between gap-2 items-start">
						<div className="min-w-0">
							<p className="font-medium leading-snug">
								{chatStreamError.title}
							</p>
							<p className="text-xs text-amber-100/70 mt-1 leading-snug">
								{chatStreamError.body}
							</p>
							{chatStreamError.otherModels.length > 0 && (
								<div className="flex flex-wrap gap-2 mt-2">
									{chatStreamError.otherModels.map((id) => {
										const m = modelNames[id]
										return (
											<Button
												key={id}
												type="button"
												size="sm"
												variant="secondary"
												className="h-8 text-xs rounded-full bg-[#141922] border-[#73737333] hover:bg-[#1a2230] text-white/90"
												onClick={() => {
													handleModelChange(id)
													analytics.modelChanged({ model: id })
												}}
											>
												Switch to {m.name} {m.version}
											</Button>
										)
									})}
								</div>
							)}
						</div>
						<button
							type="button"
							onClick={clearError}
							className="shrink-0 p-1 rounded-md text-amber-200/50 hover:text-amber-100/90 hover:bg-white/5"
							aria-label="Dismiss error"
						>
							<XIcon className="size-4" />
						</button>
					</div>
				</div>
			)}

			<div className="shrink-0">
				<ChatInput
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onSend={handleSend}
					onStop={stop}
					onKeyDown={handleKeyDown}
					isResponding={status === "submitted" || status === "streaming"}
					activeStatus={
						status === "submitted"
							? "Thinking…"
							: status === "streaming"
								? "Structuring response…"
								: "Waiting for input…"
					}
					onExpandedChange={setIsInputExpanded}
					chainOfThoughtComponent={
						messages.length > 0 ? <ChainOfThought messages={messages} /> : null
					}
					stackedToolbar={
						isStackedInput ? (
							<>
								<ChatModelSelector
									selectedModel={selectedModel}
									onModelChange={handleModelChange}
									minimal
								/>
								<SpaceSelector
									selectedProjects={chatSpaceProjects}
									onValueChange={setChatSpaceProjects}
									variant="insideOut"
									includeAuto
									triggerClassName="h-auto min-h-0 max-w-[min(160px,35vw)] rounded-full border border-[#161F2C] bg-[#000000] px-3 py-1.5 shadow-none hover:bg-[#05080D]"
								/>
							</>
						) : undefined
					}
				/>
			</div>
		</>
	)

	return (
		<motion.div
			key="open"
			className={cn(
				"relative flex flex-col backdrop-blur-md",
				isMobile
					? "fixed inset-0 z-50 m-0 h-dvh w-full rounded-none"
					: isPageDesktop
						? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col basis-0 rounded-none border-x-0"
						: "m-4 mt-2 w-[450px] rounded-2xl",
				dmSansClassName(),
			)}
			style={
				isMobile
					? undefined
					: isPageDesktop
						? undefined
						: {
								height: `calc(100vh - ${heightOffset}px)`,
							}
			}
			initial={
				isMobile
					? { y: "100%", opacity: 0 }
					: layout === "page"
						? { opacity: 0, y: 20 }
						: { x: "100px", opacity: 0 }
			}
			animate={{ x: 0, y: 0, opacity: 1 }}
			exit={
				isMobile
					? { y: "100%", opacity: 0 }
					: layout === "page"
						? { opacity: 0, y: 12 }
						: { x: "100px", opacity: 0 }
			}
			transition={{ duration: 0.3, ease: "easeOut", bounce: 0 }}
		>
			{chatHistorySheet}
			{isPageDesktop ? (
				<div className="flex h-full min-h-0 w-full flex-1 flex-row">
					<ChatGraphContextRail
						messages={messages}
						containerTags={
							chatProject === AUTO_CHAT_SPACE_ID ? null : [chatProject]
						}
					/>
					<div className="flex h-full min-h-0 w-full min-w-0 max-w-[720px] shrink-0 basis-[min(720px,50vw)] flex-col">
						{pageDesktopToolbarRow}
						<div className="relative mx-auto flex h-full min-h-0 w-full min-w-0 max-w-[720px] flex-1 flex-col">
							{shell}
						</div>
					</div>
				</div>
			) : (
				shell
			)}
		</motion.div>
	)
}

export { HomeChatComposer } from "./home-chat-composer"
