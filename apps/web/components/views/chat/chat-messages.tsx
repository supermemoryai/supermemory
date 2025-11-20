"use client"

import { useChat, useCompletion, type UIMessage } from "@ai-sdk/react"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { DefaultChatTransport } from "ai"
import {
	ArrowUp,
	Check,
	ChevronDown,
	ChevronRight,
	Copy,
	RotateCcw,
	X,
	Square
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Streamdown } from "streamdown"
import { TextShimmer } from "@/components/text-shimmer"
import { usePersistentChat, useProject } from "@/stores"
import { useGraphHighlights } from "@/stores/highlights"
import { modelNames, ModelIcon } from "@/lib/models"
import { Spinner } from "../../spinner"
import { areUIMessageArraysEqual } from "@/stores/chat"

interface MemoryResult {
	documentId?: string
	title?: string
	content?: string
	url?: string
	score?: number
}

interface ExpandableMemoriesProps {
	foundCount: number
	results: MemoryResult[]
}

interface MessagePart {
	type: string
	state?: string
	text?: string
	output?: {
		count?: number
		results?: Array<{
			documentId?: string
			title?: string
			content?: string
			url?: string
			score?: number
		}>
	}
}

interface ChatMessage {
	id: string
	role: "user" | "assistant"
	parts: MessagePart[]
}

function ExpandableMemories({ foundCount, results }: ExpandableMemoriesProps) {
	const [isExpanded, setIsExpanded] = useState(false)

	if (foundCount === 0) {
		return (
			<div className="text-sm flex items-center gap-2 text-muted-foreground">
				<Check className="size-4" /> No memories found
			</div>
		)
	}

	return (
		<div className="text-sm">
			<button
				className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
				onClick={() => setIsExpanded(!isExpanded)}
				type="button"
			>
				{isExpanded ? (
					<ChevronDown className="size-4" />
				) : (
					<ChevronRight className="size-4" />
				)}
				Related memories
			</button>

			{isExpanded && results.length > 0 && (
				<div className="mt-2 ml-6 space-y-2 max-h-48 overflow-y-auto grid grid-cols-3 gap-2">
					{results.map((result, index) => {
						const isClickable =
							result.url &&
							(result.url.startsWith("http://") ||
								result.url.startsWith("https://"))

						const content = (
							<>
								{result.title && (
									<div className="font-medium text-sm mb-1 text-foreground">
										{result.title}
									</div>
								)}
								{result.content && (
									<div className="text-xs text-muted-foreground line-clamp-2">
										{result.content}
									</div>
								)}
								{result.url && (
									<div className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
										{result.url}
									</div>
								)}
								{result.score && (
									<div className="text-xs text-muted-foreground mt-1">
										Score: {(result.score * 100).toFixed(1)}%
									</div>
								)}
							</>
						)

						if (isClickable) {
							return (
								<a
									className="block p-2 bg-accent/50 rounded-md border border-border hover:bg-accent transition-colors cursor-pointer"
									href={result.url}
									key={result.documentId || index}
									rel="noopener noreferrer"
									target="_blank"
								>
									{content}
								</a>
							)
						}

						return (
							<div
								className="p-2 bg-accent/50 rounded-md border border-border"
								key={result.documentId || index}
							>
								{content}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}

function useStickyAutoScroll(triggerKeys: ReadonlyArray<unknown>) {
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const bottomRef = useRef<HTMLDivElement>(null)
	const [isAutoScroll, setIsAutoScroll] = useState(true)
	const [isFarFromBottom, setIsFarFromBottom] = useState(false)

	const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
		const node = bottomRef.current
		if (node) node.scrollIntoView({ behavior, block: "end" })
	}, [])

	useEffect(function observeBottomVisibility() {
		const container = scrollContainerRef.current
		const sentinel = bottomRef.current
		if (!container || !sentinel) return

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries || entries.length === 0) return
				const isIntersecting = entries.some((e) => e.isIntersecting)
				setIsAutoScroll(isIntersecting)
			},
			{ root: container, rootMargin: "0px 0px 80px 0px", threshold: 0 },
		)
		observer.observe(sentinel)
		return () => observer.disconnect()
	}, [])

	useEffect(
		function observeContentResize() {
			const container = scrollContainerRef.current
			if (!container) return
			const resizeObserver = new ResizeObserver(() => {
				if (isAutoScroll) scrollToBottom("auto")
				const distanceFromBottom =
					container.scrollHeight - container.scrollTop - container.clientHeight
				setIsFarFromBottom(distanceFromBottom > 100)
			})
			resizeObserver.observe(container)
			return () => resizeObserver.disconnect()
		},
		[isAutoScroll, scrollToBottom],
	)

	function enableAutoScroll() {
		setIsAutoScroll(true)
	}

	useEffect(
		function autoScrollOnNewContent() {
			if (isAutoScroll) scrollToBottom("auto")
		},
		[isAutoScroll, scrollToBottom, ...triggerKeys],
	)

	const recomputeDistanceFromBottom = useCallback(() => {
		const container = scrollContainerRef.current
		if (!container) return
		const distanceFromBottom =
			container.scrollHeight - container.scrollTop - container.clientHeight
		setIsFarFromBottom(distanceFromBottom > 100)
	}, [])

	useEffect(() => {
		recomputeDistanceFromBottom()
	}, [recomputeDistanceFromBottom, ...triggerKeys])

	function onScroll() {
		recomputeDistanceFromBottom()
	}

	return {
		scrollContainerRef,
		bottomRef,
		isAutoScroll,
		isFarFromBottom,
		onScroll,
		enableAutoScroll,
		scrollToBottom,
	} as const
}

export function ChatMessages() {
	const { selectedProject } = useProject()
	const {
		currentChatId,
		setCurrentChatId,
		setConversation,
		getCurrentConversation,
		setConversationTitle,
		getCurrentChat,
	} = usePersistentChat()

	const storageKey = `chat-model-${currentChatId}`

	const [input, setInput] = useState("")
	const [selectedModel, setSelectedModel] = useState<
		"gpt-5" | "claude-sonnet-4.5" | "gemini-2.5-pro"
	>("gemini-2.5-pro")
	const activeChatIdRef = useRef<string | null>(null)
	const shouldGenerateTitleRef = useRef<boolean>(false)
	const hasRunInitialMessageRef = useRef<boolean>(false)
	const lastSavedMessagesRef = useRef<UIMessage[] | null>(null)
	const lastSavedActiveIdRef = useRef<string | null>(null)
	const lastLoadedChatIdRef = useRef<string | null>(null)
	const lastLoadedMessagesRef = useRef<UIMessage[] | null>(null)

	const { setDocumentIds } = useGraphHighlights()

	const { messages, sendMessage, status, stop, setMessages, id, regenerate } =
		useChat({
			id: currentChatId ?? undefined,
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
			onFinish: (result) => {
				const activeId = activeChatIdRef.current
				if (!activeId) return
				if (result.message.role !== "assistant") return

				if (shouldGenerateTitleRef.current) {
					const textPart = result.message.parts.find(
						(p: { type?: string; text?: string }) => p?.type === "text",
					) as { text?: string } | undefined
					const text = textPart?.text?.trim()
					if (text) {
						shouldGenerateTitleRef.current = false
						complete(text)
					}
				}
			},
		})

	useEffect(() => {
		lastLoadedMessagesRef.current = messages
	}, [messages])

	useEffect(() => {
		activeChatIdRef.current = currentChatId ?? id ?? null
	}, [currentChatId, id])

	useEffect(() => {
		if (typeof window === "undefined") return
		if (currentChatId) {
			const savedModel = sessionStorage.getItem(storageKey) as
				| "gpt-5"
				| "claude-sonnet-4.5"
				| "gemini-2.5-pro"

			if (
				savedModel &&
				["gpt-5", "claude-sonnet-4.5", "gemini-2.5-pro"].includes(savedModel)
			) {
				setSelectedModel(savedModel)
			}
		}
	}, [currentChatId, storageKey])

	useEffect(() => {
		if (typeof window === "undefined") return
		if (currentChatId && !hasRunInitialMessageRef.current) {
			// Check if there's an initial message from the home page in sessionStorage
			const storageKey = `chat-initial-${currentChatId}`
			const initialMessage = sessionStorage.getItem(storageKey)

			if (initialMessage) {
				// Clean up the storage and send the message
				sessionStorage.removeItem(storageKey)
				sendMessage({ text: initialMessage })
				hasRunInitialMessageRef.current = true
			}
		}
	}, [currentChatId, sendMessage])

	useEffect(() => {
		if (id && id !== currentChatId) {
			setCurrentChatId(id)
		}
	}, [id, currentChatId, setCurrentChatId])

	useEffect(() => {
		if (currentChatId !== lastLoadedChatIdRef.current) {
			lastLoadedMessagesRef.current = null
			lastSavedMessagesRef.current = null
		}

		if (currentChatId === lastLoadedChatIdRef.current) {
			setInput("")
			return
		}

		const msgs = getCurrentConversation()

		if (msgs && msgs.length > 0) {
			const currentMessages = lastLoadedMessagesRef.current
			if (!currentMessages || !areUIMessageArraysEqual(currentMessages, msgs)) {
				lastLoadedMessagesRef.current = msgs
				setMessages(msgs)
			}
		} else if (!currentChatId) {
			if (
				lastLoadedMessagesRef.current &&
				lastLoadedMessagesRef.current.length > 0
			) {
				lastLoadedMessagesRef.current = []
				setMessages([])
			}
		}

		lastLoadedChatIdRef.current = currentChatId
		setInput("")
	}, [currentChatId, getCurrentConversation, setMessages])

	useEffect(() => {
		const activeId = currentChatId ?? id
		if (!activeId || messages.length === 0) {
			return
		}

		if (activeId !== lastSavedActiveIdRef.current) {
			lastSavedMessagesRef.current = null
			lastSavedActiveIdRef.current = activeId
		}

		const lastSaved = lastSavedMessagesRef.current
		if (lastSaved && areUIMessageArraysEqual(lastSaved, messages)) {
			return
		}

		lastSavedMessagesRef.current = messages
		setConversation(activeId, messages)
	}, [messages, currentChatId, id, setConversation])

	const { complete } = useCompletion({
		api: `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/title`,
		credentials: "include",
		onFinish: (_, completion) => {
			const activeId = activeChatIdRef.current
			if (!completion || !activeId) return
			setConversationTitle(activeId, completion.trim())
		},
	})

	// Update graph highlights from the most recent tool-searchMemories output
	useEffect(() => {
		try {
			const lastAssistant = [...messages]
				.reverse()
				.find((m) => m.role === "assistant") as ChatMessage | undefined
			if (!lastAssistant) return
			const lastSearchPart = [...(lastAssistant.parts as MessagePart[])]
				.reverse()
				.find(
					(p) =>
						p?.type === "tool-searchMemories" &&
						p?.state === "output-available",
				) as MessagePart | undefined
			if (!lastSearchPart) return
			const output = lastSearchPart.output
			const ids = Array.isArray(output?.results)
				? ((output.results as MemoryResult[])
						.map((r) => r?.documentId)
						.filter(Boolean) as string[])
				: []
			if (ids.length > 0) {
				setDocumentIds(ids)
			}
		} catch {}
	}, [messages, setDocumentIds])

	useEffect(() => {
		const currentSummary = getCurrentChat()
		const hasTitle = Boolean(
			currentSummary?.title && currentSummary.title.trim().length > 0,
		)
		shouldGenerateTitleRef.current = !hasTitle
	}, [getCurrentChat])

	/**
	 * Handles sending a message from the input area.
	 * - Prevents sending during submitted (shows toast)
	 * - Stops streaming when active
	 * - Validates non-empty input (shows toast)
	 * Returns true when a message is sent.
	 */
	const handleSendMessage = useCallback(() => {
		if (status === "submitted") {
			toast.warning("Please wait for the current response to complete", {
				id: "wait-for-response",
			})
			return false
		}
		if (status === "streaming") {
			stop()
			return false
		}
		if (!input.trim()) {
			toast.warning("Please enter a message", { id: "empty-message" })
			return false
		}
		sendMessage({ text: input })
		setInput("")
		return true
	}, [status, input, sendMessage, stop])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSendMessage()
		}
	}

	const {
		scrollContainerRef,
		bottomRef,
		isFarFromBottom,
		onScroll,
		enableAutoScroll,
		scrollToBottom,
	} = useStickyAutoScroll([messages, status])

	return (
		<div className="h-full flex flex-col w-full">
			<div className="flex-1 relative">
				<div
					className="absolute inset-0 overflow-y-auto custom-scrollbar"
					onScroll={onScroll}
					ref={scrollContainerRef}
				>
					<div className="flex flex-col gap-2 max-w-4xl mx-auto px-4 md:px-2 pt-4 pb-7 scroll-pb-7">
						{messages.map((message) => (
							<div
								className={cn(
									"flex my-2",
									message.role === "user"
										? "items-center flex-row-reverse gap-2"
										: "flex-col",
								)}
								key={message.id}
							>
								<div
									className={cn(
										"flex flex-col gap-2 ",
										message.role === "user"
											? "bg-accent/50 px-3 py-1.5 border border-border rounded-lg"
											: "",
									)}
								>
									{message.parts
										.filter((part) =>
											[
												"text",
												"tool-searchMemories",
												"tool-addMemory",
											].includes(part.type),
										)
										.map((part, index) => {
											switch (part.type) {
												case "text":
													return (
														<div key={`${message.id}-${part.type}-${index}`}>
															<Streamdown>{part.text}</Streamdown>
														</div>
													)
												case "tool-searchMemories": {
													switch (part.state) {
														case "input-available":
														case "input-streaming":
															return (
																<div
																	className="text-sm flex items-center gap-2 text-muted-foreground"
																	key={`${message.id}-${part.type}-${index}`}
																>
																	<Spinner className="size-4" /> Searching
																	memories...
																</div>
															)
														case "output-error":
															return (
																<div
																	className="text-sm flex items-center gap-2 text-muted-foreground"
																	key={`${message.id}-${part.type}-${index}`}
																>
																	<X className="size-4" /> Error recalling
																	memories
																</div>
															)
														case "output-available": {
															const output = part.output
															const foundCount =
																typeof output === "object" &&
																output !== null &&
																"count" in output
																	? Number(output.count) || 0
																	: 0
															// @ts-expect-error
															const results = Array.isArray(output?.results)
																? // @ts-expect-error
																	output.results
																: []

															return (
																<ExpandableMemories
																	foundCount={foundCount}
																	key={`${message.id}-${part.type}-${index}`}
																	results={results}
																/>
															)
														}
														default:
															return null
													}
												}
												case "tool-addMemory": {
													switch (part.state) {
														case "input-available":
															return (
																<div
																	className="text-sm flex items-center gap-2 text-muted-foreground"
																	key={`${message.id}-${part.type}-${index}`}
																>
																	<Spinner className="size-4" /> Adding
																	memory...
																</div>
															)
														case "output-error":
															return (
																<div
																	className="text-sm flex items-center gap-2 text-muted-foreground"
																	key={`${message.id}-${part.type}-${index}`}
																>
																	<X className="size-4" /> Error adding memory
																</div>
															)
														case "output-available":
															return (
																<div
																	className="text-sm flex items-center gap-2 text-muted-foreground"
																	key={`${message.id}-${part.type}-${index}`}
																>
																	<Check className="size-4" /> Memory added
																</div>
															)
														case "input-streaming":
															return (
																<div
																	className="text-sm flex items-center gap-2 text-muted-foreground"
																	key={`${message.id}-${part.type}-${index}`}
																>
																	<Spinner className="size-4" /> Adding
																	memory...
																</div>
															)
														default:
															return null
													}
												}
												default:
													return null
											}
										})}
								</div>
								{message.role === "assistant" && (
									<div className="flex items-center gap-0.5 mt-0.5">
										<Button
											className="size-7 text-muted-foreground hover:text-foreground"
											onClick={() => {
												navigator.clipboard.writeText(
													message.parts
														.filter((p) => p.type === "text")
														?.map((p) => (p as MessagePart).text ?? "")
														.join("\n") ?? "",
												)
												toast.success("Copied to clipboard")
											}}
											size="icon"
											variant="ghost"
										>
											<Copy className="size-3.5" />
										</Button>
										<Button
											className="size-6 text-muted-foreground hover:text-foreground"
											onClick={() => regenerate({ messageId: message.id })}
											size="icon"
											variant="ghost"
										>
											<RotateCcw className="size-3.5" />
										</Button>
									</div>
								)}
							</div>
						))}
						{status === "submitted" && (
							<div className="flex text-muted-foreground justify-start gap-2 px-4 py-3 items-center w-full">
								<Spinner className="size-4" />
								<TextShimmer className="text-sm" duration={1.5}>
									Thinking...
								</TextShimmer>
							</div>
						)}
						<div ref={bottomRef} />
					</div>
				</div>

				<Button
					className={cn(
						"rounded-full w-fit mx-auto shadow-md z-10 absolute inset-x-0 bottom-4 flex justify-center",
						"transition-all duration-200 ease-out",
						isFarFromBottom
							? "opacity-100 scale-100 pointer-events-auto"
							: "opacity-0 scale-95 pointer-events-none",
					)}
					onClick={() => {
						enableAutoScroll()
						scrollToBottom("smooth")
					}}
					size="sm"
					type="button"
					variant="default"
				>
					Scroll to bottom
				</Button>
			</div>

			<div className="pb-4 px-4 md:px-2 max-w-4xl mx-auto w-full">
				<form
					className="flex flex-col items-end gap-3 border border-border rounded-[22px] p-3 relative shadow-lg dark:shadow-2xl"
					onSubmit={(e) => {
						e.preventDefault()
						const sent = handleSendMessage()
						if (sent) {
							enableAutoScroll()
							scrollToBottom("auto")
						}
					}}
				>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						aria-busy={status === "streaming" || status === "submitted"}
						aria-disabled={status === "submitted"}
						placeholder="Ask your follow-up question..."
						className="w-full text-foreground placeholder:text-muted-foreground rounded-md outline-none resize-none text-base leading-relaxed px-3 py-3 bg-transparent"
						rows={3}
					/>
					<div className="absolute bottom-2 right-2 flex items-center gap-4">
						<div className="flex items-center gap-1.5">
							<ModelIcon
								width={16}
								height={16}
								className="text-muted-foreground"
							/>
							<span className="text-xs text-muted-foreground">
								{modelNames[selectedModel]}
							</span>
						</div>
						{status === "streaming" || status === "submitted" ? (
							<Button
								onClick={() => stop()}
								aria-label="Stop generation"
								className="rounded-xl"
								variant="destructive"
								size="icon"
								type="button"
							>
								<Square className="size-4" />
							</Button>
						) : (
							<Button
								type="submit"
								aria-label="Send message"
								disabled={!input.trim()}
								className="text-primary-foreground rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary/90"
								size="icon"
							>
								<ArrowUp className="size-4" />
							</Button>
						)}
					</div>
				</form>
			</div>
		</div>
	)
}
