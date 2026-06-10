"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { $fetch } from "@lib/api"
import { useQueryState } from "nuqs"
import type { UIMessage } from "@ai-sdk/react"
import { motion } from "motion/react"
import { useChat } from "@ai-sdk/react"
import { isWebSearchToolName } from "@/lib/chat-web-search-tools"
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
	ArrowLeftIcon,
	Check,
	ChevronDownIcon,
	HistoryIcon,
	Plus,
	Search,
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
import {
	getDefaultReasoningEffort,
	modelNames,
	type ModelId,
	type ReasoningEffort,
} from "@/lib/models"
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
import { ChatEmptyStatePlaceholder } from "./chat-empty-state"
import { toast } from "sonner"
import {
	chatAttachmentKey,
	CHAT_ATTACHMENT_ACCEPT,
	createChatAttachmentDraft,
	type ChatAttachment,
	type ChatAttachmentDraft,
	isAcceptedChatAttachment,
} from "./attachments"
import { cacheFileBlob, removeCachedFile } from "@/lib/file-cache"
import { ReasoningSelector } from "./reasoning-selector"

type ChatMessageSendSource = "typed" | "suggested" | "highlight" | "home"

const DISCARD_ATTACHMENT_MAX_ATTEMPTS = 15
const DISCARD_ATTACHMENT_RETRY_MS = 2000

type RawChatAttachmentResponse = Partial<ChatAttachment> & {
	attachment?: Partial<ChatAttachment>
}

function normalizeChatAttachmentResponse(
	data: RawChatAttachmentResponse,
	draft: ChatAttachmentDraft,
): ChatAttachment {
	const attachment = data.attachment ?? data
	const id = attachment.id ?? attachment.documentId ?? draft.id
	return {
		id,
		documentId: attachment.documentId,
		filename: attachment.filename ?? draft.file.name,
		mediaType:
			(attachment.mediaType ?? draft.file.type) || "application/octet-stream",
		size: attachment.size ?? draft.file.size,
		saveToMemory: attachment.saveToMemory ?? draft.saveToMemory,
		status: attachment.status ?? "ready",
		url: attachment.url,
		contentPreview: attachment.contentPreview,
	}
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
					? "fixed bottom-safe-5 right-0 left-0 z-50 justify-center items-center pl-safe pr-safe"
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

type QueuedChatMessage = {
	id: string
	text: string
	model: ModelId
	reasoningEffort: ReasoningEffort
	attachments?: ChatAttachment[]
}

const CHAT_QUEUE_LIMIT = 3

function normalizeModelId(value: unknown): ModelId | null {
	if (typeof value !== "string") return null
	return value in modelNames ? (value as ModelId) : null
}

function getMessageResponseModel(message: UIMessage): ModelId | null {
	const metadata = (
		message as UIMessage & { metadata?: Record<string, unknown> }
	).metadata
	return (
		normalizeModelId(metadata?.model) ??
		normalizeModelId(metadata?.responseModel) ??
		null
	)
}

export function ChatSidebar({
	isChatOpen,
	setIsChatOpen: _setIsChatOpen,
	queuedMessage,
	queuedHighlightContent,
	onConsumeQueuedMessage,
	queuedMessageSource = "highlight",
	queuedAttachments = null,
	initialSelectedModel = null,
	initialReasoningEffort = null,
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
	queuedAttachments?: ChatAttachmentDraft[] | null
	initialSelectedModel?: ModelId | null
	initialReasoningEffort?: ReasoningEffort | null
	initialChatProject?: string | null
	emptyStateSuggestions?: string[]
	layout?: "sidebar" | "page"
}) {
	const isMobile = useIsMobile()
	const isPageDesktop = layout === "page" && !isMobile
	const [input, setInput] = useState("")
	const [attachmentDrafts, setAttachmentDrafts] = useState<
		ChatAttachmentDraft[]
	>([])
	const [isChatDraggingFiles, setIsChatDraggingFiles] = useState(false)
	const [selectedModel, setSelectedModel] = useState<ModelId>(
		initialSelectedModel ?? "grok-4.3",
	)
	const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(
		initialReasoningEffort ??
			getDefaultReasoningEffort(initialSelectedModel ?? "grok-4.3"),
	)
	const selectedModelRef = useRef(selectedModel)
	selectedModelRef.current = selectedModel
	const reasoningEffortRef = useRef(reasoningEffort)
	reasoningEffortRef.current = reasoningEffort
	const [messageQueue, setMessageQueue] = useState<QueuedChatMessage[]>([])
	const queuedDispatchInFlightRef = useRef(false)
	const queuedDispatchSawResponseRef = useRef(false)
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
	const [historyScope, setHistoryScope] = useState<"current" | "all">("current")
	const [historySearch, setHistorySearch] = useState("")
	const [threads, setThreads] = useState<
		Array<{
			id: string
			title: string
			createdAt: string
			updatedAt: string
			space?: {
				containerTag: string
				name: string
				emoji?: string
				isDefault: boolean
			}
		}>
	>([])
	const [isLoadingThreads, setIsLoadingThreads] = useState(false)
	const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
		null,
	)
	const messagesContainerRef = useRef<HTMLDivElement>(null)
	const chatDragDepthRef = useRef(0)
	const isScrolledToBottomRef = useRef(true)
	const userJustSentRef = useRef(false)
	const sentQueuedMessageRef = useRef<string | null>(null)
	const truncateFromMessageIdRef = useRef<string | null>(null)
	const pendingRegenerationRef = useRef<{
		text: string
	} | null>(null)
	const pendingSendSettingsRef = useRef<{
		model: ModelId
		reasoningEffort: ReasoningEffort
	} | null>(null)
	const pendingResponseModelsRef = useRef<ModelId[]>([])
	const seenAssistantMessageIdsRef = useRef<Set<string>>(new Set())
	const [responseModelByMessageId, setResponseModelByMessageId] = useState<
		Record<string, ModelId>
	>({})
	const [regenerationBaseLength, setRegenerationBaseLength] = useState<
		number | null
	>(null)
	const pendingHighlightReplyRef = useRef<string | null>(null)
	const awaitingHighlightInjectionRef = useRef(false)
	const pendingHighlightMessageRef = useRef<UIMessage[] | null>(null)
	const targetHighlightChatIdRef = useRef<string | null>(null)
	const pendingRequestAttachmentsRef = useRef<ChatAttachment[]>([])
	const uploadPromisesRef = useRef<Map<string, Promise<ChatAttachment>>>(
		new Map(),
	)
	const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
	const discardedDraftIdsRef = useRef<Set<string>>(new Set())
	const { selectedProject } = useProject()
	const [chatSpaceProjects, setChatSpaceProjects] = useState<string[]>([
		initialChatProject ?? AUTO_CHAT_SPACE_ID,
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
	const isAutoChatSpace = chatProject === AUTO_CHAT_SPACE_ID
	const { data: chatSpaceMemoryCount } = useQuery({
		queryKey: ["chat-empty-space-count", chatProject],
		queryFn: async (): Promise<number> => {
			const response = await $fetch("@post/documents/documents", {
				body: {
					page: 1,
					limit: 1,
					sort: "createdAt",
					order: "desc",
					containerTags: [chatProject],
				},
				disableValidation: true,
			})
			if (response.error) return 0
			const data = response.data as {
				pagination?: { totalItems?: number }
			} | null
			return data?.pagination?.totalItems ?? 0
		},
		staleTime: 30 * 1000,
		enabled: !!chatProject && !isAutoChatSpace,
	})
	const emptyStateSubtitle = useMemo(() => {
		if (isAutoChatSpace) {
			return "Picks the best space for each question"
		}
		if (chatSpaceMemoryCount === undefined) {
			return `Grounded in ${chatSpaceLabel}`
		}
		if (chatSpaceMemoryCount === 0) {
			return `Nothing in ${chatSpaceLabel} yet`
		}
		const countLabel = chatSpaceMemoryCount.toLocaleString()
		const memoryWord = chatSpaceMemoryCount === 1 ? "memory" : "memories"
		return `${countLabel} ${memoryWord} in ${chatSpaceLabel}`
	}, [isAutoChatSpace, chatSpaceLabel, chatSpaceMemoryCount])
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
				prepareSendMessagesRequest: ({ messages }) => {
					const sendSettings = pendingSendSettingsRef.current
					pendingSendSettingsRef.current = null

					// Tool parts (incl. Anthropic server-side web search) don't round-trip
					// through convertToModelMessages and cause tool_use/tool_result mismatches.
					const sanitizedMessages = messages.map((m) => ({
						...m,
						parts: (m.parts ?? []).filter(
							(p) => !p.type.startsWith("tool-") && p.type !== "dynamic-tool",
						),
					}))

					return {
						body: {
							messages: sanitizedMessages,
							metadata: {
								chatId: chatIdRef.current,
								projectId: selectedProjectRef.current,
								spaceMode:
									selectedProjectRef.current === AUTO_CHAT_SPACE_ID
										? "auto"
										: "manual",
								enableSpaceDiscovery:
									selectedProjectRef.current === AUTO_CHAT_SPACE_ID,
								model: sendSettings?.model ?? selectedModelRef.current,
								reasoningEffort:
									sendSettings?.reasoningEffort ?? reasoningEffortRef.current,
								truncateFromMessageId: truncateFromMessageIdRef.current,
								...(pendingRequestAttachmentsRef.current.length > 0 && {
									attachments: pendingRequestAttachmentsRef.current,
								}),
							},
						},
					}
				},
			}),
		[chatApiBase],
	)
	const [pendingThreadLoad, setPendingThreadLoad] = useState<{
		id: string
		messages: UIMessage[]
	} | null>(null)
	const [loadedThreadScrollTarget, setLoadedThreadScrollTarget] = useState<{
		id: string
		messageCount: number
		lastMessageId: string | null
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

	useEffect(() => {
		if (error) {
			pendingResponseModelsRef.current = []
		}
	}, [error])

	useEffect(() => {
		const updates: Record<string, ModelId> = {}

		for (const message of messages) {
			if (message.role !== "assistant") continue
			if (seenAssistantMessageIdsRef.current.has(message.id)) continue

			seenAssistantMessageIdsRef.current.add(message.id)
			const responseModel =
				getMessageResponseModel(message) ??
				pendingResponseModelsRef.current.shift() ??
				null

			if (responseModel) {
				updates[message.id] = responseModel
			}
		}

		if (Object.keys(updates).length === 0) return
		setResponseModelByMessageId((prev) => ({ ...prev, ...updates }))
	}, [messages])

	const handleModelChange = useCallback(
		(modelId: ModelId) => {
			setSelectedModel(modelId)
			setReasoningEffort(getDefaultReasoningEffort(modelId))
			clearError()
		},
		[clearError],
	)

	const setAttachmentDraftState = useCallback(
		(id: string, patch: Partial<ChatAttachmentDraft>) => {
			setAttachmentDrafts((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
			)
		},
		[],
	)

	const discardUploadedAttachment = useCallback(
		(documentId: string) => {
			void removeCachedFile(documentId)

			const run = async (attempt: number): Promise<void> => {
				try {
					const response = await fetch(
						`${chatApiBase}/chat/attachments/${documentId}`,
						{
							method: "DELETE",
							credentials: "include",
						},
					)

					if (
						response.status === 409 &&
						attempt < DISCARD_ATTACHMENT_MAX_ATTEMPTS
					) {
						setTimeout(() => {
							void run(attempt + 1)
						}, DISCARD_ATTACHMENT_RETRY_MS)
						return
					}

					if (!response.ok && response.status !== 404) {
						console.warn("Failed to discard chat attachment", {
							documentId,
							status: response.status,
						})
					}
				} catch (error) {
					if (attempt < DISCARD_ATTACHMENT_MAX_ATTEMPTS) {
						setTimeout(() => {
							void run(attempt + 1)
						}, DISCARD_ATTACHMENT_RETRY_MS)
						return
					}
					console.warn("Failed to discard chat attachment", {
						documentId,
						error,
					})
				}
			}

			void run(1)
		},
		[chatApiBase],
	)

	const uploadAttachmentDraft = useCallback(
		(
			draft: ChatAttachmentDraft,
			chatIdForUpload: string,
		): Promise<ChatAttachment> => {
			if (draft.status === "uploaded" && draft.uploaded) {
				return Promise.resolve(draft.uploaded)
			}

			const inflight = uploadPromisesRef.current.get(draft.id)
			if (inflight) return inflight

			const uploadPromise = (async (): Promise<ChatAttachment> => {
				const controller = new AbortController()
				abortControllersRef.current.set(draft.id, controller)

				setAttachmentDraftState(draft.id, {
					status: "uploading",
					errorMessage: undefined,
				})

				const formData = new FormData()
				formData.append("file", draft.file)
				formData.append("threadId", chatIdForUpload)
				formData.append("projectId", selectedProjectRef.current)
				formData.append("saveToMemory", String(draft.saveToMemory))

				try {
					const response = await fetch(`${chatApiBase}/chat/attachments`, {
						method: "POST",
						body: formData,
						credentials: "include",
						signal: controller.signal,
					})

					if (!response.ok) {
						let message = "Failed to upload attachment"
						try {
							const error = (await response.json()) as {
								error?: string
								message?: string
							}
							message = error.error ?? error.message ?? message
						} catch {
							// keep the fallback error
						}
						throw new Error(message)
					}

					const data = (await response.json()) as RawChatAttachmentResponse
					const attachment = normalizeChatAttachmentResponse(data, draft)

					abortControllersRef.current.delete(draft.id)

					if (discardedDraftIdsRef.current.has(draft.id)) {
						discardedDraftIdsRef.current.delete(draft.id)
						if (attachment.documentId) {
							discardUploadedAttachment(attachment.documentId)
						}
						return attachment
					}

					if (attachment.documentId) {
						void cacheFileBlob(
							attachment.documentId,
							draft.file,
							draft.file.type,
						)
					}
					setAttachmentDraftState(draft.id, {
						status: "uploaded",
						uploaded: attachment,
					})
					return attachment
				} catch (error) {
					abortControllersRef.current.delete(draft.id)
					uploadPromisesRef.current.delete(draft.id)

					if (error instanceof DOMException && error.name === "AbortError") {
						throw error
					}

					if (discardedDraftIdsRef.current.has(draft.id)) {
						discardedDraftIdsRef.current.delete(draft.id)
						throw error
					}

					const message =
						error instanceof Error
							? error.message
							: "Failed to upload attachment"
					setAttachmentDraftState(draft.id, {
						status: "error",
						errorMessage: message,
					})
					throw error
				}
			})()

			uploadPromisesRef.current.set(draft.id, uploadPromise)
			return uploadPromise
		},
		[chatApiBase, discardUploadedAttachment, setAttachmentDraftState],
	)

	const uploadAttachmentDrafts = useCallback(
		async (drafts: ChatAttachmentDraft[], chatIdForUpload: string) => {
			const uploaded: ChatAttachment[] = []
			for (const draft of drafts) {
				uploaded.push(await uploadAttachmentDraft(draft, chatIdForUpload))
			}
			return uploaded
		},
		[uploadAttachmentDraft],
	)

	const handleAddAttachmentFiles = useCallback(
		(files: FileList | File[]) => {
			const incoming = Array.from(files)
			const accepted = incoming.filter(isAcceptedChatAttachment)
			const rejected = incoming.length - accepted.length
			if (rejected > 0) {
				toast.error(
					rejected === 1
						? "One attachment is not supported or is over 50MB"
						: `${rejected} attachments are not supported or are over 50MB`,
				)
			}
			if (accepted.length === 0) return

			const existingKeys = new Set(
				attachmentDrafts.map((item) => chatAttachmentKey(item.file)),
			)
			const nextItems: ChatAttachmentDraft[] = []
			let duplicateCount = 0
			for (const file of accepted) {
				const key = chatAttachmentKey(file)
				if (existingKeys.has(key)) {
					duplicateCount++
					continue
				}
				existingKeys.add(key)
				nextItems.push(createChatAttachmentDraft(file))
			}
			if (duplicateCount > 0) {
				toast.message(
					duplicateCount === 1
						? "Skipped duplicate attachment"
						: `Skipped ${duplicateCount} duplicate attachments`,
				)
			}
			if (nextItems.length === 0) return
			setAttachmentDrafts((prev) => [...prev, ...nextItems])

			for (const draft of nextItems) {
				void uploadAttachmentDraft(draft, currentChatId).catch(() => {
					// Upload errors are reflected on the draft state unless the draft was removed.
				})
			}
		},
		[attachmentDrafts, currentChatId, uploadAttachmentDraft],
	)

	const handleRemoveAttachment = useCallback(
		(id: string) => {
			const draft = attachmentDrafts.find((item) => item.id === id)
			discardedDraftIdsRef.current.add(id)

			const controller = abortControllersRef.current.get(id)
			if (controller) {
				controller.abort()
				abortControllersRef.current.delete(id)
			}
			uploadPromisesRef.current.delete(id)

			const documentId = draft?.uploaded?.documentId
			if (draft?.status === "uploaded" && documentId) {
				discardUploadedAttachment(documentId)
			}

			setAttachmentDrafts((prev) => prev.filter((item) => item.id !== id))
		},
		[attachmentDrafts, discardUploadedAttachment],
	)

	const handleRetryAttachment = useCallback(
		(id: string) => {
			const draft = attachmentDrafts.find((item) => item.id === id)
			if (!draft) return
			void uploadAttachmentDraft(draft, currentChatId)
		},
		[attachmentDrafts, currentChatId, uploadAttachmentDraft],
	)

	const hasDraggedFiles = useCallback(
		(event: React.DragEvent) =>
			Array.from(event.dataTransfer.types).includes("Files"),
		[],
	)

	const resetChatFileDrag = useCallback(() => {
		chatDragDepthRef.current = 0
		setIsChatDraggingFiles(false)
	}, [])

	const handleChatDragEnter = useCallback(
		(event: React.DragEvent) => {
			if (!hasDraggedFiles(event)) return
			event.preventDefault()
			event.stopPropagation()

			chatDragDepthRef.current += 1
			if (status !== "submitted" && status !== "streaming") {
				setIsChatDraggingFiles(true)
			}
		},
		[hasDraggedFiles, status],
	)

	const handleChatDragOver = useCallback(
		(event: React.DragEvent) => {
			if (!hasDraggedFiles(event)) return
			event.preventDefault()
			event.stopPropagation()
			event.dataTransfer.dropEffect =
				status === "submitted" || status === "streaming" ? "none" : "copy"
		},
		[hasDraggedFiles, status],
	)

	const handleChatDragLeave = useCallback(
		(event: React.DragEvent) => {
			if (!hasDraggedFiles(event)) return
			event.preventDefault()
			event.stopPropagation()

			chatDragDepthRef.current = Math.max(0, chatDragDepthRef.current - 1)
			if (chatDragDepthRef.current === 0) {
				setIsChatDraggingFiles(false)
			}
		},
		[hasDraggedFiles],
	)

	const handleChatDrop = useCallback(
		(event: React.DragEvent) => {
			if (!hasDraggedFiles(event)) return
			event.preventDefault()
			event.stopPropagation()

			resetChatFileDrag()
			const files = event.dataTransfer.files
			if (status !== "submitted" && status !== "streaming" && files.length) {
				handleAddAttachmentFiles(files)
			}
		},
		[handleAddAttachmentFiles, hasDraggedFiles, resetChatFileDrag, status],
	)

	useEffect(() => {
		if (status === "submitted" || status === "streaming") {
			resetChatFileDrag()
		}
	}, [resetChatFileDrag, status])

	useEffect(() => {
		if (pendingThreadLoad && currentChatId === pendingThreadLoad.id) {
			setMessages(pendingThreadLoad.messages)
			setLoadedThreadScrollTarget({
				id: pendingThreadLoad.id,
				messageCount: pendingThreadLoad.messages.length,
				lastMessageId:
					pendingThreadLoad.messages[pendingThreadLoad.messages.length - 1]
						?.id ?? null,
			})
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

	const submitChatMessage = useCallback(
		async (
			text: string,
			source: ChatMessageSendSource,
			drafts = attachmentDrafts,
		): Promise<boolean> => {
			const trimmed = text.trim()
			if (!trimmed && drafts.length === 0) return false

			const hasBusy = drafts.some(
				(d) => d.status === "uploading" || d.status === "queued",
			)
			if (hasBusy) return false
			const hasErrored = drafts.some((d) => d.status === "error")
			if (hasErrored) return false

			const chatIdForSend = threadId ?? fallbackChatId

			try {
				const uploadedAttachments =
					drafts.length > 0
						? await uploadAttachmentDrafts(drafts, chatIdForSend)
						: []
				const messageText = trimmed || "Analyze the attached file(s)."
				const isRespondingNow = status === "submitted" || status === "streaming"

				if (isRespondingNow) {
					if (messageQueue.length >= CHAT_QUEUE_LIMIT) return false
					setMessageQueue((prev) => {
						if (prev.length >= CHAT_QUEUE_LIMIT) return prev
						return [
							...prev,
							{
								id: generateId(),
								text: messageText,
								model: selectedModel,
								reasoningEffort,
								attachments: uploadedAttachments,
							},
						]
					})
					analytics.chatMessageSent({
						source,
						attachment_count: uploadedAttachments.length,
						saved_attachment_count: uploadedAttachments.filter(
							(attachment) => attachment.saveToMemory,
						).length,
						temporary_attachment_count: uploadedAttachments.filter(
							(attachment) => !attachment.saveToMemory,
						).length,
					})
					setInput("")
					setAttachmentDrafts([])
					uploadPromisesRef.current.clear()
					abortControllersRef.current.clear()
					discardedDraftIdsRef.current.clear()
					userJustSentRef.current = true
					scrollToBottom()
					return true
				}

				truncateFromMessageIdRef.current = null
				if (!threadId) setThreadId(fallbackChatId)
				pendingRequestAttachmentsRef.current = uploadedAttachments
				analytics.chatMessageSent({
					source,
					attachment_count: uploadedAttachments.length,
					saved_attachment_count: uploadedAttachments.filter(
						(attachment) => attachment.saveToMemory,
					).length,
					temporary_attachment_count: uploadedAttachments.filter(
						(attachment) => !attachment.saveToMemory,
					).length,
				})

				setInput("")
				setAttachmentDrafts([])
				uploadPromisesRef.current.clear()
				abortControllersRef.current.clear()
				discardedDraftIdsRef.current.clear()
				userJustSentRef.current = true
				scrollToBottom()
				pendingResponseModelsRef.current.push(selectedModel)

				void sendMessage({
					text: messageText,
					metadata:
						uploadedAttachments.length > 0
							? { attachments: uploadedAttachments }
							: undefined,
				}).finally(() => {
					pendingRequestAttachmentsRef.current = []
				})

				return true
			} catch (error) {
				pendingRequestAttachmentsRef.current = []
				toast.error("Failed to send message", {
					description:
						error instanceof Error ? error.message : "Please try again.",
				})
				return false
			}
		},
		[
			attachmentDrafts,
			fallbackChatId,
			messageQueue.length,
			reasoningEffort,
			scrollToBottom,
			selectedModel,
			sendMessage,
			setThreadId,
			status,
			threadId,
			uploadAttachmentDrafts,
		],
	)

	const handleSend = () => {
		void submitChatMessage(input, "typed")
	}

	const handleSuggestedQuestion = useCallback(
		(suggestion: string) => {
			if (status === "submitted" || status === "streaming") return
			analytics.chatSuggestedQuestionClicked()
			void submitChatMessage(suggestion, "suggested", [])
		},
		[status, submitChatMessage],
	)

	const handleRegenerateFromUserMessage = useCallback(
		(
			messageId: string,
			text: string,
			model: ModelId,
			nextReasoningEffort: ReasoningEffort,
		) => {
			const trimmed = text.trim()
			if (!trimmed || status === "submitted" || status === "streaming") return
			const messageIndex = messages.findIndex(
				(message) => message.id === messageId,
			)
			if (messageIndex === -1) return

			truncateFromMessageIdRef.current = messageId
			pendingSendSettingsRef.current = {
				model,
				reasoningEffort: nextReasoningEffort,
			}
			clearError()
			pendingRegenerationRef.current = {
				text: trimmed,
			}
			setRegenerationBaseLength(messageIndex)
			setMessages(messages.slice(0, messageIndex))
			userJustSentRef.current = true
			scrollToBottom()
		},
		[clearError, messages, scrollToBottom, setMessages, status],
	)

	useEffect(() => {
		const pending = pendingRegenerationRef.current
		if (
			!pending ||
			regenerationBaseLength === null ||
			messages.length !== regenerationBaseLength ||
			status !== "ready"
		) {
			return
		}

		pendingRegenerationRef.current = null
		setRegenerationBaseLength(null)
		analytics.chatMessageSent({ source: "typed" })
		queuedDispatchInFlightRef.current = true
		queuedDispatchSawResponseRef.current = false
		pendingResponseModelsRef.current.push(
			pendingSendSettingsRef.current?.model ?? selectedModelRef.current,
		)
		sendMessage({ text: pending.text })
		window.setTimeout(() => {
			truncateFromMessageIdRef.current = null
		}, 0)
	}, [messages.length, regenerationBaseLength, sendMessage, status])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey && !isMobile) {
			e.preventDefault()
			handleSend()
		}
	}

	// Keep the user message on stop so it isn't lost when generation is halted
	// before any assistant response arrives (ENG-732).
	const handleStop = useCallback(() => {
		stop()
	}, [stop])

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
		setAttachmentDrafts([])
		for (const controller of abortControllersRef.current.values()) {
			controller.abort()
		}
		abortControllersRef.current.clear()
		discardedDraftIdsRef.current.clear()
		uploadPromisesRef.current.clear()
		setMessageQueue([])
		pendingResponseModelsRef.current = []
		seenAssistantMessageIdsRef.current = new Set()
		setResponseModelByMessageId({})
		queuedDispatchInFlightRef.current = false
		queuedDispatchSawResponseRef.current = false
	}, [setThreadId, setMessages])

	const fetchThreads = useCallback(async () => {
		setIsLoadingThreads(true)
		try {
			const params = new URLSearchParams({ projectId: chatProject })
			if (historyScope === "all") params.set("scope", "all")
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/threads?${params.toString()}`,
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
	}, [chatProject, historyScope])

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
							metadata?: Record<string, unknown>
						}) => ({
							id: m.id,
							role: m.role,
							// Strip tool parts (they break convertToModelMessages with tool_use/tool_result
							// mismatches); keep text/reasoning + source parts so citations survive reload.
							parts: (m.parts || []).filter(
								(p) =>
									p.type === "text" ||
									p.type === "reasoning" ||
									p.type === "source-url" ||
									p.type === "source-document",
							),
							metadata: m.metadata,
							createdAt: new Date(m.createdAt),
						}),
					)
					pendingResponseModelsRef.current = []
					seenAssistantMessageIdsRef.current = new Set()
					setResponseModelByMessageId({})
					setThreadId(id)
					setPendingThreadLoad({ id, messages: uiMessages })
					setMessageQueue([])
					queuedDispatchInFlightRef.current = false
					queuedDispatchSawResponseRef.current = false
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
			if (
				initialReasoningEffort &&
				reasoningEffort !== initialReasoningEffort
			) {
				setReasoningEffort(initialReasoningEffort)
				return
			}
			sentQueuedMessageRef.current = queuedMessage

			if (queuedHighlightContent) {
				analytics.chatMessageSent({ source: queuedMessageSource })
				truncateFromMessageIdRef.current = null
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
				if (queuedAttachments?.length) {
					setAttachmentDrafts(queuedAttachments)
				}
				void submitChatMessage(
					queuedMessage,
					queuedMessageSource,
					queuedAttachments ?? [],
				).then((sent) => {
					if (!sent) {
						setInput(queuedMessage)
						if (queuedAttachments?.length) {
							setAttachmentDrafts(queuedAttachments)
						}
					}
					onConsumeQueuedMessage?.()
				})
				return
			}
			onConsumeQueuedMessage?.()
		}
	}, [
		isChatOpen,
		queuedMessage,
		queuedHighlightContent,
		queuedMessageSource,
		queuedAttachments,
		initialSelectedModel,
		initialReasoningEffort,
		selectedModel,
		reasoningEffort,
		status,
		onConsumeQueuedMessage,
		setThreadId,
		submitChatMessage,
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
			truncateFromMessageIdRef.current = null
			queuedDispatchInFlightRef.current = true
			queuedDispatchSawResponseRef.current = false
			pendingResponseModelsRef.current.push(selectedModelRef.current)
			sendMessage({ text: reply })
		}
	}, [messages, sendMessage, status])

	// Reset the sent message ref when queued message is consumed
	useEffect(() => {
		if (!queuedMessage) {
			sentQueuedMessageRef.current = null
		}
	}, [queuedMessage])

	useEffect(() => {
		const isRespondingNow = status === "submitted" || status === "streaming"
		if (isRespondingNow) {
			if (queuedDispatchInFlightRef.current) {
				queuedDispatchSawResponseRef.current = true
			}
			return
		}

		if (status !== "ready") {
			queuedDispatchInFlightRef.current = false
			queuedDispatchSawResponseRef.current = false
			return
		}

		if (queuedDispatchInFlightRef.current) {
			if (!queuedDispatchSawResponseRef.current) return
			queuedDispatchInFlightRef.current = false
			queuedDispatchSawResponseRef.current = false
		}

		const nextMessage = messageQueue[0]
		if (!nextMessage) return

		queuedDispatchInFlightRef.current = true
		queuedDispatchSawResponseRef.current = false
		truncateFromMessageIdRef.current = null
		pendingSendSettingsRef.current = {
			model: nextMessage.model,
			reasoningEffort: nextMessage.reasoningEffort,
		}
		pendingResponseModelsRef.current.push(nextMessage.model)
		if (!threadId) setThreadId(fallbackChatId)
		setMessageQueue((prev) =>
			prev[0]?.id === nextMessage.id
				? prev.slice(1)
				: prev.filter((item) => item.id !== nextMessage.id),
		)
		pendingRequestAttachmentsRef.current = nextMessage.attachments ?? []
		void sendMessage({
			text: nextMessage.text,
			metadata:
				nextMessage.attachments && nextMessage.attachments.length > 0
					? { attachments: nextMessage.attachments }
					: undefined,
		}).finally(() => {
			pendingRequestAttachmentsRef.current = []
		})
		userJustSentRef.current = true
		scrollToBottom()
	}, [
		fallbackChatId,
		messageQueue,
		scrollToBottom,
		sendMessage,
		setThreadId,
		status,
		threadId,
	])

	// Scroll to bottom when a new user message is added or a thread is loaded
	useEffect(() => {
		const lastMessageId = messages[messages.length - 1]?.id ?? null
		const loadedThreadIsRendered =
			loadedThreadScrollTarget &&
			currentChatId === loadedThreadScrollTarget.id &&
			messages.length === loadedThreadScrollTarget.messageCount &&
			lastMessageId === loadedThreadScrollTarget.lastMessageId

		if (loadedThreadIsRendered) {
			// Trigger the same scroll behavior as the button after loaded messages render.
			scrollToBottom()
			setTimeout(scrollToBottom, 50)
			setTimeout(scrollToBottom, 150)
			setTimeout(() => {
				scrollToBottom()
				setLoadedThreadScrollTarget(null)
			}, 300)
			return
		}
		const lastMessage = messages[messages.length - 1]
		if (lastMessage?.role === "user" && messagesContainerRef.current) {
			scrollToBottom()
		} else {
			checkIfScrolledToBottom()
		}
	}, [
		currentChatId,
		loadedThreadScrollTarget,
		messages,
		checkIfScrolledToBottom,
		scrollToBottom,
	])

	useEffect(() => {
		const isStreaming = status === "streaming"
		const lastMessage = messages[messages.length - 1]
		const isLastMessageFromAssistant = lastMessage?.role === "assistant"

		if (
			isStreaming &&
			isLastMessageFromAssistant &&
			(isScrolledToBottomRef.current || userJustSentRef.current)
		) {
			scrollToBottom()
		}
	}, [status, messages, scrollToBottom])

	useEffect(() => {
		const container = messagesContainerRef.current
		if (!container) return

		const isStreaming = status === "streaming" || status === "submitted"
		if (!isStreaming) {
			userJustSentRef.current = false
			return
		}

		const mutationObserver = new MutationObserver(() => {
			if (isScrolledToBottomRef.current || userJustSentRef.current) {
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
				if (!isScrolledToBottomRef.current) {
					userJustSentRef.current = false
				}
			})
		}

		container.addEventListener("scroll", handleScroll, { passive: true })
		setTimeout(() => {
			checkIfScrolledToBottom()
		}, 100)

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
	const isResponding = status === "submitted" || status === "streaming"
	const isWebSearching =
		isResponding &&
		(() => {
			const last = messages[messages.length - 1]
			if (!last || last.role !== "assistant") return false
			const parts = last.parts ?? []
			const searching = parts.some(
				(p) =>
					(p.type === "dynamic-tool" &&
						isWebSearchToolName((p as { toolName?: string }).toolName ?? "")) ||
					(p.type.startsWith("tool-") &&
						isWebSearchToolName(p.type.slice("tool-".length))),
			)
			const hasText = parts.some(
				(p) => p.type === "text" && (p as { text?: string }).text?.trim(),
			)
			return searching && !hasText
		})()
	const hasBusyAttachment = attachmentDrafts.some(
		(attachment) =>
			attachment.status === "uploading" || attachment.status === "queued",
	)
	const hasErroredAttachment = attachmentDrafts.some(
		(attachment) => attachment.status === "error",
	)
	const canSendMessage =
		(input.trim().length > 0 || attachmentDrafts.length > 0) &&
		!hasBusyAttachment &&
		!hasErroredAttachment
	const showInputStatusStrip =
		!isStackedInput || isResponding || messages.length > 0
	const isQueueFull = messageQueue.length >= CHAT_QUEUE_LIMIT

	const threadGroups = useMemo(() => {
		const q = historySearch.trim().toLowerCase()
		const filtered = q
			? threads.filter((t) => (t.title || "").toLowerCase().includes(q))
			: threads
		const now = new Date()
		const startOfToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		).getTime()
		const day = 86_400_000
		const buckets: Array<{ label: string; items: typeof threads }> = [
			{ label: "Today", items: [] },
			{ label: "Yesterday", items: [] },
			{ label: "Previous 7 days", items: [] },
			{ label: "Previous 30 days", items: [] },
			{ label: "Older", items: [] },
		]
		for (const t of filtered) {
			const ts = new Date(t.updatedAt).getTime()
			if (ts >= startOfToday) buckets[0].items.push(t)
			else if (ts >= startOfToday - day) buckets[1].items.push(t)
			else if (ts >= startOfToday - 7 * day) buckets[2].items.push(t)
			else if (ts >= startOfToday - 30 * day) buckets[3].items.push(t)
			else buckets[4].items.push(t)
		}
		return buckets.filter((b) => b.items.length > 0)
	}, [threads, historySearch])

	const chatHistorySheet = (
		<Sheet
			open={isHistoryOpen}
			onOpenChange={(open) => {
				setIsHistoryOpen(open)
				if (!open) {
					setConfirmingDeleteId(null)
					setHistorySearch("")
				}
			}}
		>
			<SheetContent
				side="right"
				className={cn(
					"flex h-full max-h-dvh w-[380px] max-w-[88vw] flex-col gap-0 overflow-hidden border-[#17181AB2] bg-[#0A0E14] p-0 pb-safe text-white",
					"[&>button]:text-[#FAFAFA]",
					dmSansClassName(),
				)}
			>
				<SheetHeader className="shrink-0 space-y-3 border-[#17181AB2] border-b px-5 pt-5 pb-4">
					<div className="flex min-w-0 items-center gap-2 pr-8">
						<SheetTitle className="shrink-0">Chat History</SheetTitle>
						<span className="truncate rounded-full border border-[#161F2C] bg-[#0F141B] px-2 py-0.5 text-[#9CA3AF] text-[11px]">
							{historyScope === "all" ? "All spaces" : chatSpaceLabel}
						</span>
					</div>
					<SheetDescription className="sr-only">
						{historyScope === "all"
							? "All conversations across your spaces"
							: `Conversations in ${chatSpaceLabel}`}
					</SheetDescription>
					<div className="flex items-center gap-2">
						<div className="relative flex-1">
							<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-[#737373]" />
							<input
								type="text"
								value={historySearch}
								onChange={(e) => setHistorySearch(e.target.value)}
								placeholder="Search conversations…"
								className="h-9 w-full rounded-lg border border-[#161F2C] bg-[#0F141B] pr-3 pl-9 text-sm text-white placeholder:text-[#737373] focus:border-[#267BF1]/50 focus:outline-none"
							/>
						</div>
						<div className="flex shrink-0 items-center rounded-full border border-[#161F2C] bg-[#000000] p-0.5">
							{(["current", "all"] as const).map((scope) => (
								<button
									key={scope}
									type="button"
									onClick={() => setHistoryScope(scope)}
									className={cn(
										"rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
										historyScope === scope
											? "bg-[#267BF1]/15 text-[#FAFAFA]"
											: "text-[#737373] hover:text-[#FAFAFA]",
									)}
								>
									{scope === "current" ? "Current" : "All"}
								</button>
							))}
						</div>
					</div>
				</SheetHeader>
				<ScrollArea className="min-h-0 flex-1 px-3">
					<div className="py-3">
						{isLoadingThreads ? (
							<div className="flex items-center justify-center py-8">
								<SuperLoader label="Loading…" />
							</div>
						) : threads.length === 0 ? (
							<div className="py-8 text-center text-sm text-[#737373]">
								No conversations yet
							</div>
						) : threadGroups.length === 0 ? (
							<div className="py-8 text-center text-sm text-[#737373]">
								No conversations match “{historySearch.trim()}”
							</div>
						) : (
							<div className="flex flex-col gap-4">
								{threadGroups.map((group) => (
									<div key={group.label} className="flex flex-col gap-0.5">
										<div className="px-2 pb-1 font-medium text-[#5A6473] text-[11px] uppercase tracking-wide">
											{group.label}
										</div>
										{group.items.map((thread) => {
											const isActive = thread.id === currentChatId
											const isConfirming = confirmingDeleteId === thread.id
											return (
												<button
													key={thread.id}
													type="button"
													onClick={() => loadThread(thread.id)}
													className={cn(
														"group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
														isActive ? "bg-[#267BF1]/10" : "hover:bg-[#17181A]",
													)}
												>
													<div className="min-w-0 flex-1">
														<div className="truncate text-[#E5E7EB] text-sm">
															{thread.title || "Untitled Chat"}
														</div>
														<div className="flex items-center gap-1.5 text-[#737373] text-xs">
															<span>
																{formatRelativeTime(thread.updatedAt)}
															</span>
															{historyScope === "all" && thread.space ? (
																<>
																	<span className="text-[#3A3A3A]">·</span>
																	<span className="truncate">
																		{thread.space.emoji
																			? `${thread.space.emoji} `
																			: ""}
																		{thread.space.name}
																	</span>
																</>
															) : null}
														</div>
													</div>
													{isConfirming ? (
														<div className="flex shrink-0 items-center gap-1">
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
															className="size-7 shrink-0 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
														>
															<Trash2 className="size-3 text-[#737373]" />
														</Button>
													)}
												</button>
											)
										})}
									</div>
								))}
							</div>
						)}
					</div>
				</ScrollArea>
				<div className="shrink-0 border-[#17181AB2] border-t p-3">
					<Button
						className="w-full bg-[#267BF1] font-medium text-white hover:bg-[#1f6ad6]"
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

	const chatDropOverlay = isChatDraggingFiles ? (
		<div
			className={cn(
				"pointer-events-none absolute inset-0 z-[80] grid place-items-center border border-dashed border-[#4B5563] bg-black/72 text-sm font-medium text-fg-primary backdrop-blur-sm",
				isMobile || isPageDesktop ? "rounded-none" : "rounded-2xl",
			)}
			aria-hidden="true"
		>
			<div className="rounded-lg border border-white/10 bg-black/50 px-4 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
				Drop files to attach
			</div>
		</div>
	) : null
	const chatDropTargetProps = {
		onDragEnter: handleChatDragEnter,
		onDragOver: handleChatDragOver,
		onDragLeave: handleChatDragLeave,
		onDrop: handleChatDrop,
		onDragEnd: resetChatFileDrag,
	}

	const shell = (
		<>
			{showHeaderRow ? (
				<div
					className={cn(
						"flex items-center justify-between px-0 z-10",
						isPageDesktop
							? "relative shrink-0 pt-2 pb-1"
							: isMobile
								? "relative shrink-0 px-4 pt-4 pb-2"
								: "absolute top-0 right-0 left-0 pt-4 px-4",
						!isMobile && !isPageDesktop && "rounded-t-2xl",
					)}
				>
					<div className="mr-2 flex min-w-0 flex-1 items-center gap-2">
						{isMobile && (
							<button
								type="button"
								onClick={() => _setIsChatOpen(false)}
								aria-label="Back"
								className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#161F2C] bg-black text-[#FAFAFA] transition-colors hover:bg-[#161F2C]"
							>
								<ArrowLeftIcon className="size-5" />
							</button>
						)}
						{!isStackedInput && (
							<>
								<ChatModelSelector
									selectedModel={selectedModel}
									onModelChange={handleModelChange}
								/>
								<ReasoningSelector
									value={reasoningEffort}
									onChange={setReasoningEffort}
								/>
								<SpaceSelector
									selectedProjects={chatSpaceProjects}
									onValueChange={setChatSpaceProjects}
									variant="insideOut"
									includeAuto
									hideCount
									triggerClassName="h-10 min-h-10 max-w-[min(192px,42vw)] border border-[#73737333] bg-[#0D121A] shadow-[1.5px_1.5px_4.5px_0_rgba(0,0,0,0.70)_inset]"
								/>
							</>
						)}
					</div>
					{chatToolbarActions}
				</div>
			) : null}
			<div className="relative flex-1 min-h-0">
				<div
					ref={messagesContainerRef}
					className={cn(
						"relative h-full overflow-y-auto scrollbar-thin",
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
							subtitle={emptyStateSubtitle}
						/>
					)}
					<div
						className={
							messages.length > 0
								? cn(
										"flex flex-col space-y-3 min-h-full justify-end pb-4",
										isPageDesktop || isMobile ? "pt-2" : "pt-14",
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
										selectedModel={selectedModel}
										reasoningEffort={reasoningEffort}
										onCopy={handleCopyMessage}
										onRegenerate={handleRegenerateFromUserMessage}
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
										responseModel={responseModelByMessageId[message.id] ?? null}
										onCopy={handleCopyMessage}
										onLike={handleLikeMessage}
										onDislike={handleDislikeMessage}
										onToggleMemories={handleToggleMemories}
									/>
								)}
							</div>
						))}
					</div>
				</div>

				{!isScrolledToBottom && messages.length > 0 && (
					<div className="absolute bottom-3 left-0 right-0 flex justify-center z-50 pointer-events-none">
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
			</div>

			{chatStreamError && (
				<div
					role="alert"
					className={cn(
						"mx-4 mb-2 rounded-lg bg-amber-950/40 px-3 py-2 text-sm text-amber-50/95",
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

			<div
				className={cn(
					"shrink-0",
					isStackedInput &&
						(isMobile
							? "px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
							: "px-4 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+1rem))] md:pb-6"),
				)}
			>
				<ChatInput
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onSend={handleSend}
					onStop={handleStop}
					onKeyDown={handleKeyDown}
					isResponding={isResponding}
					attachments={attachmentDrafts}
					onAddAttachmentFiles={handleAddAttachmentFiles}
					onRemoveAttachment={handleRemoveAttachment}
					onRetryAttachment={handleRetryAttachment}
					canSend={canSendMessage}
					attachmentAccept={CHAT_ATTACHMENT_ACCEPT}
					disableFileDropZone
					sendDisabled={isResponding && isQueueFull}
					sendDisabledTooltip={`Queue is full (${CHAT_QUEUE_LIMIT} max)`}
					activeStatus={
						isResponding && isQueueFull
							? `Queue full (${CHAT_QUEUE_LIMIT} max)`
							: isWebSearching
								? "Searching the web…"
								: status === "submitted"
									? "Thinking…"
									: status === "streaming"
										? "Thinking…"
										: "Waiting for input…"
					}
					queuedMessages={messageQueue}
					showStatusStrip={showInputStatusStrip}
					onExpandedChange={setIsInputExpanded}
					chainOfThoughtComponent={
						messages.length > 0 ? <ChainOfThought messages={messages} /> : null
					}
					stackedToolbar={
						isStackedInput ? (
							<ChatModelSelector
								selectedModel={selectedModel}
								onModelChange={handleModelChange}
								minimal
							/>
						) : undefined
					}
					toolbarTrailing={
						isStackedInput ? (
							<ReasoningSelector
								value={reasoningEffort}
								onChange={setReasoningEffort}
							/>
						) : undefined
					}
					toolbarEnd={
						isStackedInput ? (
							<SpaceSelector
								selectedProjects={chatSpaceProjects}
								onValueChange={setChatSpaceProjects}
								variant="insideOut"
								includeAuto
								hideCount
								triggerClassName="h-auto min-h-0 max-w-[min(160px,35vw)] gap-1.5 rounded-md border-0 bg-transparent px-2 py-1 shadow-none hover:bg-white/5"
							/>
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
					? "flex h-full min-h-0 w-full flex-1 flex-col rounded-none"
					: isPageDesktop
						? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col basis-0 rounded-none border-x-0"
						: "m-4 mt-2 w-[min(450px,calc(100vw-2rem))] md:w-[380px] lg:w-[450px] rounded-2xl",
				dmSansClassName(),
			)}
			style={
				isMobile || isPageDesktop
					? undefined
					: {
							height: `calc(100vh - ${heightOffset}px)`,
						}
			}
			initial={
				layout === "page" ? { opacity: 0, y: 20 } : { x: "100px", opacity: 0 }
			}
			animate={{ x: 0, y: 0, opacity: 1 }}
			exit={
				layout === "page" ? { opacity: 0, y: 12 } : { x: "100px", opacity: 0 }
			}
			transition={{ duration: 0.3, ease: "easeOut", bounce: 0 }}
			{...(!isPageDesktop ? chatDropTargetProps : {})}
		>
			{!isPageDesktop && chatDropOverlay}
			{chatHistorySheet}
			{isPageDesktop ? (
				<div className="flex h-full min-h-0 w-full flex-1 flex-row">
					<ChatGraphContextRail
						messages={messages}
						containerTags={
							chatProject === AUTO_CHAT_SPACE_ID ? null : [chatProject]
						}
					/>
					<div
						{...chatDropTargetProps}
						className="relative flex h-full min-h-0 w-full min-w-0 max-w-[min(720px,100%)] shrink-0 basis-[min(720px,50vw)] flex-col"
					>
						{chatDropOverlay}
						{pageDesktopToolbarRow}
						<div className="relative mx-auto flex h-full min-h-0 w-full min-w-0 max-w-[min(720px,100%)] flex-1 flex-col px-3 sm:px-4 md:px-0">
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
export { ChatEmptyStatePlaceholder } from "./chat-empty-state"
