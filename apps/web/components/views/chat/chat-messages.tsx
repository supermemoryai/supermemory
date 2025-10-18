"use client"

import { useChat, useCompletion } from "@ai-sdk/react"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { DefaultChatTransport } from "ai"
import {
	ArrowUp,
	Check,
	ChevronDown,
	ChevronRight,
	Copy,
	Download,
	RotateCcw,
	X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Streamdown } from "streamdown"
import { TextShimmer } from "@/components/text-shimmer"
import { usePersistentChat, useProject } from "@/stores"
import { useGraphHighlights } from "@/stores/highlights"
import { Spinner } from "../../spinner"
import { AttachmentPicker } from "@/components/attachments/attachment-picker"
import {
	ALLOWED_MIME_PREFIXES,
	ALLOWED_MIME_TYPES,
	MAX_ATTACHMENTS,
	MAX_FILE_BYTES,
	buildAttachmentKey,
	downscaleImageToDataUrl,
	fileToDataUrl,
} from "@/lib/attachments"

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

	// Attachments state

	interface AttachmentItem {
		id: string
		file: File
		kind: "image" | "doc"
		previewUrl?: string
		mimeType: string
		name: string
		size: number
	}

	const [attachments, setAttachments] = useState<AttachmentItem[]>([])
	const [isDraggingOverForm, setIsDraggingOverForm] = useState(false)
	const activeChatIdRef = useRef<string | null>(null)
	const shouldGenerateTitleRef = useRef<boolean>(false)
	const hasRunInitialMessageRef = useRef<boolean>(false)

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
			maxSteps: 2,
			onFinish: (result) => {
				const activeId = activeChatIdRef.current
				if (!activeId) return
				if (result.message.role !== "assistant") return

				if (shouldGenerateTitleRef.current) {
					const textPart = result.message.parts.find(
						(p: any) => p?.type === "text",
					) as any
					const text = textPart?.text?.trim()
					if (text) {
						shouldGenerateTitleRef.current = false
						complete(text)
					}
				}
			},
		})

	useEffect(() => {
		activeChatIdRef.current = currentChatId ?? id ?? null
	}, [currentChatId, id])

	useEffect(() => {
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
	}, [currentChatId])

	useEffect(() => {
		if (currentChatId && !hasRunInitialMessageRef.current) {
			const textKey = `chat-initial-${currentChatId}`
			const attachmentsKey = `chat-initial-attachments-${currentChatId}`
			const initialMessage = sessionStorage.getItem(textKey)
			const initialAttachmentsRaw = sessionStorage.getItem(attachmentsKey)

			let parts: any[] = []
			try {
				if (initialAttachmentsRaw) {
					const parsed = JSON.parse(initialAttachmentsRaw)
					if (Array.isArray(parsed)) parts = parts.concat(parsed)
				}
			} catch {}

			if (initialMessage && initialMessage.trim().length > 0) {
				parts.push({ type: "text", text: initialMessage.trim() })
			}

			if (parts.length > 0) {
				try {
					sendMessage({ parts })
				} finally {
					if (initialMessage) sessionStorage.removeItem(textKey)
					if (initialAttachmentsRaw) sessionStorage.removeItem(attachmentsKey)
					hasRunInitialMessageRef.current = true
				}
			}
		}
	}, [currentChatId])

	useEffect(() => {
		if (id && id !== currentChatId) {
			setCurrentChatId(id)
		}
	}, [id])

	useEffect(() => {
		const msgs = getCurrentConversation()
		if (msgs && msgs.length > 0) {
			setMessages(msgs)
		} else if (!currentChatId) {
			setMessages([])
		}
		setInput("")
	}, [currentChatId])

	useEffect(() => {
		const activeId = currentChatId ?? id
		if (activeId && messages.length > 0) {
			setConversation(activeId, messages)
		}
	}, [messages, currentChatId, id])

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
				.find((m) => m.role === "assistant")
			if (!lastAssistant) return
			const lastSearchPart = [...(lastAssistant.parts as any[])]
				.reverse()
				.find(
					(p) =>
						p?.type === "tool-searchMemories" &&
						p?.state === "output-available",
				)
			if (!lastSearchPart) return
			const output = (lastSearchPart as any).output
			const ids = Array.isArray(output?.results)
				? ((output.results as any[])
						.map((r) => r?.documentId)
						.filter(Boolean) as string[])
				: []
			if (ids.length > 0) {
				setDocumentIds(ids)
			}
		} catch {}
	}, [messages])

	useEffect(() => {
		const currentSummary = getCurrentChat()
		const hasTitle = Boolean(
			currentSummary?.title && currentSummary.title.trim().length > 0,
		)
		shouldGenerateTitleRef.current = !hasTitle
	}, [])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		}
	}

	function validateFile(file: File): string | null {
		if (file.size > MAX_FILE_BYTES) return `File exceeds 25MB: ${file.name}`
		const type = file.type
		const isImage = ALLOWED_MIME_PREFIXES.some((p) => type.startsWith(p))
		const allowed = isImage || ALLOWED_MIME_TYPES.includes(type)
		if (!allowed) return `Unsupported type: ${file.name}`
		return null
	}

	function onFilesSelected(files: File[]) {
		const existingKeys = new Set(attachments.map((a) => buildAttachmentKey(a.file)))
		const accepted: File[] = []
		const seen = new Set<string>()
		for (const file of files) {
			const key = buildAttachmentKey(file)
			if (existingKeys.has(key) || seen.has(key)) {
				toast.error(`Already attached: ${file.name}`)
				continue
			}
			const err = validateFile(file)
			if (err) {
				toast.error(err)
				continue
			}
			accepted.push(file)
			seen.add(key)
		}
		if (attachments.length + accepted.length > MAX_ATTACHMENTS) {
			toast.error(`You can attach up to ${MAX_ATTACHMENTS} files`)
			return
		}
		const newItems: AttachmentItem[] = []
		for (const file of accepted) {
			const isImage = file.type.startsWith("image/")
			const item: AttachmentItem = {
				id: crypto.randomUUID(),
				file,
				kind: isImage ? "image" : "doc",
				previewUrl: isImage ? URL.createObjectURL(file) : undefined,
				mimeType: file.type,
				name: file.name,
				size: file.size,
			}
			newItems.push(item)
		}
		if (newItems.length > 0) setAttachments((prev) => [...prev, ...newItems])
	}

	function removeAttachment(id: string) {
		setAttachments((prev) => {
			const next = prev.filter((a) => a.id !== id)
			const removed = prev.find((a) => a.id === id)
			if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
			return next
		})
	}

	function fileToDataUrl(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => resolve(String(reader.result))
			reader.onerror = reject
			reader.readAsDataURL(file)
		})
	}

	async function downscaleImageToDataUrl(
		file: File,
		maxDim = 1600,
		quality = 0.85,
	): Promise<{ dataUrl: string; mimeType: string }> {
		const originalDataUrl = await fileToDataUrl(file)
		return new Promise((resolve) => {
			const img = new Image()
			img.onload = () => {
				let { width, height } = img
				if (width <= maxDim && height <= maxDim) {
					// no resize
					resolve({ dataUrl: originalDataUrl, mimeType: file.type || "image/jpeg" })
					return
				}
				const scale = Math.min(maxDim / width, maxDim / height)
				width = Math.floor(width * scale)
				height = Math.floor(height * scale)
				const canvas = document.createElement("canvas")
				canvas.width = width
				canvas.height = height
				const ctx = canvas.getContext("2d")
				if (!ctx) {
					resolve({ dataUrl: originalDataUrl, mimeType: file.type || "image/jpeg" })
					return
				}
				ctx.drawImage(img, 0, 0, width, height)
				const outType = file.type && file.type.startsWith("image/png") ? "image/png" : "image/jpeg"
				const dataUrl = canvas.toDataURL(outType, outType === "image/jpeg" ? quality : undefined)
				resolve({ dataUrl, mimeType: outType })
			}
			img.onerror = () => resolve({ dataUrl: originalDataUrl, mimeType: file.type || "image/jpeg" })
			img.src = originalDataUrl
		})
	}

	async function handleSubmit() {
		if (status === "submitted") return
		if (status === "streaming") {
			stop()
			return
		}
		const hasText = Boolean(input.trim())
		const hasFiles = attachments.length > 0
		if (!hasText && !hasFiles) return

		enableAutoScroll()
		scrollToBottom("auto")

		const parts: any[] = []
		// attachments first
		if (hasFiles) {
			const processed = await Promise.all(
				attachments.map(async (a) => {
					if (a.kind === "image") {
						const res = await downscaleImageToDataUrl(a.file)
						return { ...a, dataUrl: res.dataUrl, outMime: res.mimeType }
					}
					const dataUrl = await fileToDataUrl(a.file)
					return { ...a, dataUrl, outMime: a.mimeType }
				}),
			)
			processed.forEach((a) => {
				if (a.kind === "image") {
					parts.push({ type: "image", mimeType: a.outMime, data: a.dataUrl })
				} else {
					parts.push({ type: "file", name: a.name, mimeType: a.outMime, data: a.dataUrl })
				}
			})
		}
		// then the text content
		if (hasText) {
			parts.push({ type: "text", text: input.trim() })
		}

		sendMessage({ parts })
		setInput("")
		attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl))
		setAttachments([])
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
					className="flex flex-col gap-2 absolute inset-0 overflow-y-auto px-4 pt-4 pb-7 scroll-pb-7 custom-scrollbar"
					onScroll={onScroll}
					ref={scrollContainerRef}
				>
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
									"flex flex-col gap-2 max-w-4/5",
									message.role === "user"
										? "bg-accent/50 px-3 py-1.5 border border-border rounded-lg"
										: "",
								)}
							>
				{message.parts
					.filter((part) => {
						const pType = ((part as any)?.type as string) ?? ""
						return (
							[
								"text",
								"image",
								"file",
								"tool-searchMemories",
								"tool-addMemory",
							] as string[]
						).includes(pType)
					})
					.map((part, index) => {
						const pType = ((part as any)?.type as string) ?? ""
						switch (pType) {
											case "text":
												return (
									<div key={`${message.id}-${(part as any).type}-${index}`}>
										<Streamdown>{(part as any).text}</Streamdown>
													</div>
												)
							case "image": {
								const src = (part as any).data as string
								return (
									<div key={`${message.id}-${(part as any).type}-${index}`} className="mt-1">
										<img src={src} alt="attachment" className="max-w-[320px] rounded border border-border" />
									</div>
								)
							}
							case "file": {
								const dataUrl = (part as any).data as string | undefined
								const name = (part as any).name as string | undefined
								return (
									<div
										key={`${message.id}-${(part as any).type}-${index}`}
										className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-2 py-1 bg-accent/40 w-fit"
									>
										<span className="truncate max-w-48">{name ?? "file"}</span>
										{dataUrl ? (
											<a href={dataUrl} download={name ?? "file"} title="Download file" className="inline-flex">
												<Download className="size-3.5" />
											</a>
										) : null}
									</div>
								)
							}
							case "tool-searchMemories": {
									const toolState = (part as any).state as string | undefined
									switch (toolState) {
													case "input-available":
													case "input-streaming":
														return (
									<div
										className="text-sm flex items-center gap-2 text-muted-foreground"
										key={`${message.id}-${(part as any).type}-${index}`}
									>
																<Spinner className="size-4" /> Searching
																memories...
															</div>
														)
													case "output-error":
														return (
									<div
										className="text-sm flex items-center gap-2 text-muted-foreground"
										key={`${message.id}-${(part as any).type}-${index}`}
									>
																<X className="size-4" /> Error recalling
																memories
															</div>
														)
													case "output-available": {
									const output = (part as any).output
														const foundCount =
															typeof output === "object" &&
															output !== null &&
															"count" in output
																? Number(output.count) || 0
																: 0
									const results = Array.isArray((output as any)?.results)
										? (output as any).results
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
									const toolState = (part as any).state as string | undefined
									switch (toolState) {
													case "input-available":
														return (
															<div
																className="text-sm flex items-center gap-2 text-muted-foreground"
																key={`${message.id}-${part.type}-${index}`}
															>
																<Spinner className="size-4" /> Adding memory...
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
																<Spinner className="size-4" /> Adding memory...
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
													?.map((p) => (p as any).text)
													.join("\n") ?? "",
											)
											toast.success("Copied to clipboard")
										}}
										size="icon"
										variant="ghost"
							aria-label="Copy assistant text"
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

			<div className="px-4 pb-4 pt-1 relative flex-shrink-0">
		<form
				className={cn(
					"flex flex-col items-end gap-3 bg-card border border-border rounded-[22px] p-3 relative shadow-lg dark:shadow-2xl",
					isDraggingOverForm ? "ring-2 ring-primary/40" : "",
				)}
				onSubmit={(e) => {
					e.preventDefault()
					handleSubmit()
				}}
				onDragEnter={(e) => {
					e.preventDefault()
					e.stopPropagation()
					setIsDraggingOverForm(true)
				}}
				onDragOver={(e) => {
					e.preventDefault()
					e.stopPropagation()
					setIsDraggingOverForm(true)
				}}
				onDragLeave={(e) => {
					e.preventDefault()
					e.stopPropagation()
					setIsDraggingOverForm(false)
				}}
				onDrop={(e) => {
					e.preventDefault()
					e.stopPropagation()
					setIsDraggingOverForm(false)
					const files = Array.from(e.dataTransfer.files || [])
					if (files.length > 0) onFilesSelected(files)
				}}
				>
				{/* Attached files preview */}
				{attachments.length > 0 && (
					<div className="w-full flex flex-wrap gap-2 px-1">
						{attachments.map((a) => (
							<div
								key={a.id}
								className="flex items-center gap-2 border border-border rounded-md px-2 py-1 bg-accent/40"
							>
								{a.kind === "image" && a.previewUrl ? (
									<img
										src={a.previewUrl}
										alt={a.name}
										className="w-8 h-8 rounded object-cover"
									/>
								) : null}
								<div className="text-xs max-w-40 truncate">{a.name}</div>
								<Button
									variant="ghost"
									size="icon"
									type="button"
									onClick={() => removeAttachment(a.id)}
									aria-label={`Remove ${a.name}`}
								>
									<X className="size-3.5" />
								</Button>
							</div>
						))}
					</div>
				)}
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Ask your follow-up question..."
						className="w-full text-foreground placeholder:text-muted-foreground rounded-md outline-none resize-none text-base leading-relaxed px-3 py-3 bg-transparent"
						rows={3}
					/>
				<div className="absolute bottom-2 left-2">
					<AttachmentPicker
						onFilesSelected={onFilesSelected}
						disabled={status === "submitted" || status === "streaming"}
						accept=".pdf,.doc,.docx,.txt,image/*"
						multiple
					/>
				</div>
					<div className="absolute bottom-2 right-2">
						<Button
						type="submit"
						disabled={!input.trim() && attachments.length === 0}
							className="text-primary-foreground rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary/90"
							size="icon"
						>
							<ArrowUp className="size-4" />
						</Button>
					</div>
				</form>
			</div>
		</div>
	)
}
