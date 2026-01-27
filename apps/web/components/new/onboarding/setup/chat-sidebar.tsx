"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import NovaOrb from "@/components/nova/nova-orb"
import { Button } from "@ui/components/button"
import {
	PanelRightCloseIcon,
	SendIcon,
	CheckIcon,
	XIcon,
	Loader2,
} from "lucide-react"
import { collectValidUrls } from "@/lib/url-helpers"
import { $fetch } from "@lib/api"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { useAuth } from "@lib/auth-context"
import { useProject } from "@/stores"
import { Streamdown } from "streamdown"
import { useIsMobile } from "@hooks/use-mobile"

interface ChatSidebarProps {
	formData: {
		twitter: string
		linkedin: string
		description: string
		otherLinks: string[]
	} | null
}

interface DraftDoc {
	kind: "likes" | "link" | "x_research"
	content: string
	metadata: Record<string, string>
	title?: string
	url?: string
}

export function ChatSidebar({ formData }: ChatSidebarProps) {
	const { user } = useAuth()
	const { selectedProject } = useProject()
	const isMobile = useIsMobile()
	const [message, setMessage] = useState("")
	const [isChatOpen, setIsChatOpen] = useState(!isMobile)
	const [timelineMessages, setTimelineMessages] = useState<
		{
			message: string
			type?: "formData" | "exa" | "memory" | "waiting"
			memories?: {
				url: string
				title: string
				description: string
				fullContent: string
			}[]
			url?: string
			title?: string
			description?: string
		}[]
	>([])
	const [isLoading, setIsLoading] = useState(false)
	const [isFetchingDrafts, setIsFetchingDrafts] = useState(false)
	const [draftDocs, setDraftDocs] = useState<DraftDoc[]>([])
	const [xResearchStatus, setXResearchStatus] = useState<
		"correct" | "incorrect" | null
	>(null)
	const [isConfirmed, setIsConfirmed] = useState(false)
	const [processingByUrl, setProcessingByUrl] = useState<
		Record<string, boolean>
	>({})
	const displayedMemoriesRef = useRef<Set<string>>(new Set())
	const contextInjectedRef = useRef(false)
	const draftsBuiltRef = useRef(false)
	const isProcessingRef = useRef(false)
	const draftRequestIdRef = useRef(0)

	const {
		messages: chatMessages,
		sendMessage,
		status,
	} = useChat({
		transport: new DefaultChatTransport({
			api: `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/v2`,
			credentials: "include",
			body: {
				metadata: {
					projectId: selectedProject,
					model: "gemini-2.5-pro",
				},
			},
		}),
	})

	const buildOnboardingContext = useCallback(() => {
		if (!formData) return ""

		const contextParts: string[] = []

		if (formData.description?.trim()) {
			contextParts.push(`User's interests/likes: ${formData.description}`)
		}

		if (formData.twitter) {
			contextParts.push(`X/Twitter profile: ${formData.twitter}`)
		}

		if (formData.linkedin) {
			contextParts.push(`LinkedIn profile: ${formData.linkedin}`)
		}

		if (formData.otherLinks.length > 0) {
			contextParts.push(`Other links: ${formData.otherLinks.join(", ")}`)
		}

		const memoryTexts = timelineMessages
			.filter((msg) => msg.type === "memory" && msg.memories)
			.flatMap(
				(msg) => msg.memories?.map((m) => `${m.title}: ${m.description}`) || [],
			)

		if (memoryTexts.length > 0) {
			contextParts.push(`Extracted memories:\n${memoryTexts.join("\n")}`)
		}

		return contextParts.join("\n\n")
	}, [formData, timelineMessages])

	const handleSend = () => {
		if (!message.trim() || status === "submitted" || status === "streaming")
			return

		let messageToSend = message

		const context = buildOnboardingContext()

		if (context && !contextInjectedRef.current && chatMessages.length === 0) {
			messageToSend = `${context}\n\nUser question: ${message}`
			contextInjectedRef.current = true
		}

		sendMessage({ text: messageToSend })
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

	const pollForMemories = useCallback(
		async (documentIds: string[]) => {
			const maxAttempts = 30 // 30 attempts * 3 seconds = 90 seconds max
			const pollInterval = 3000 // 3 seconds

			for (let attempt = 0; attempt < maxAttempts; attempt++) {
				try {
					const response = await $fetch("@get/documents/:id", {
						params: { id: documentIds[0] ?? "" },
						disableValidation: true,
					})

					console.log("response", response)

					if (response.data) {
						const document = response.data

						if (document.memories && document.memories.length > 0) {
							const newMemories: {
								url: string
								title: string
								description: string
								fullContent: string
							}[] = []

							document.memories.forEach(
								(memory: { memory: string; title?: string }) => {
									if (!displayedMemoriesRef.current.has(memory.memory)) {
										displayedMemoriesRef.current.add(memory.memory)
										newMemories.push({
											url: document.url || "",
											title: memory.title || document.title || "Memory",
											description: memory.memory || "",
											fullContent: memory.memory || "",
										})
									}
								},
							)

							if (newMemories.length > 0 && timelineMessages.length < 10) {
								setTimelineMessages((prev) => [
									...prev,
									{
										message: newMemories
											.map((memory) => memory.description)
											.join("\n"),
										type: "memory" as const,
										memories: newMemories,
									},
								])
							}
						}

						if (document.memories && document.memories.length > 0) {
							break
						}
					}

					await new Promise((resolve) => setTimeout(resolve, pollInterval))
				} catch (error) {
					console.warn("Error polling for memories:", error)
					await new Promise((resolve) => setTimeout(resolve, pollInterval))
				}
			}
		},
		[timelineMessages.length],
	)

	const buildDraftDocs = useCallback(async () => {
		if (!formData || draftsBuiltRef.current) return
		draftsBuiltRef.current = true

		const hasContent =
			formData.twitter ||
			formData.linkedin ||
			formData.otherLinks.length > 0 ||
			formData.description?.trim()

		if (!hasContent) return

		const requestId = ++draftRequestIdRef.current

		setIsFetchingDrafts(true)
		const drafts: DraftDoc[] = []

		const urls = collectValidUrls(formData.linkedin, formData.otherLinks)
		const allProcessingUrls: string[] = [...urls]
		if (formData.twitter) {
			allProcessingUrls.push(formData.twitter)
		}

		if (allProcessingUrls.length > 0) {
			setProcessingByUrl((prev) => {
				const next = { ...prev }
				for (const url of allProcessingUrls) {
					next[url] = true
				}
				return next
			})
		}

		try {
			if (formData.description?.trim()) {
				drafts.push({
					kind: "likes",
					content: formData.description,
					metadata: {
						sm_source: "consumer",
						description_source: "user_input",
					},
					title: "Your Interests",
				})
			}

			// Fetch each URL separately for per-link loading state
			const linkPromises = urls.map(async (url) => {
				try {
					const response = await fetch("/api/onboarding/extract-content", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ urls: [url] }),
					})
					const data = await response.json()
					return data.results?.[0] || null
				} catch {
					return null
				} finally {
					// Clear this URL's processing state
					if (draftRequestIdRef.current === requestId) {
						setProcessingByUrl((prev) => ({ ...prev, [url]: false }))
					}
				}
			})

			// Fetch X/Twitter research
			const xResearchPromise = formData.twitter
				? (async () => {
						try {
							const response = await fetch("/api/onboarding/research", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									xUrl: formData.twitter,
									name: user?.name,
									email: user?.email,
								}),
							})
							if (!response.ok) return null
							const data = await response.json()
							return data?.text?.trim() || null
						} catch {
							return null
						} finally {
							// Clear twitter URL's processing state
							if (draftRequestIdRef.current === requestId) {
								setProcessingByUrl((prev) => ({
									...prev,
									[formData.twitter]: false,
								}))
							}
						}
					})()
				: Promise.resolve(null)

			const [exaResults, xResearchResult] = await Promise.all([
				Promise.all(linkPromises),
				xResearchPromise,
			])

			// Guard against stale request completing after a newer one
			if (draftRequestIdRef.current !== requestId) return

			for (const result of exaResults) {
				if (result && (result.text || result.description)) {
					drafts.push({
						kind: "link",
						content: result.text || result.description || "",
						metadata: {
							sm_source: "consumer",
							exa_url: result.url,
							exa_title: result.title,
						},
						title: result.title || "Extracted Content",
						url: result.url,
					})
				}
			}

			if (xResearchResult) {
				drafts.push({
					kind: "x_research",
					content: xResearchResult,
					metadata: {
						sm_source: "consumer",
						onboarding_source: "x_research",
						x_url: formData.twitter,
					},
					title: "X/Twitter Profile Research",
					url: formData.twitter,
				})
			}

			setDraftDocs(drafts)
		} catch (error) {
			console.warn("Error building draft docs:", error)
		} finally {
			if (draftRequestIdRef.current === requestId) {
				setIsFetchingDrafts(false)
			}
		}
	}, [formData, user])

	const handleConfirmDocs = useCallback(async () => {
		if (isConfirmed || isProcessingRef.current) return
		isProcessingRef.current = true
		setIsConfirmed(true)
		setIsLoading(true)

		try {
			const documentIds: string[] = []

			for (const draft of draftDocs) {
				if (draft.kind === "x_research" && xResearchStatus !== "correct") {
					continue
				}

				try {
					const docResponse = await $fetch("@post/documents", {
						body: {
							content: draft.content,
							containerTags: ["sm_project_default"],
							metadata: draft.metadata,
						},
					})

					if (docResponse.data?.id) {
						documentIds.push(docResponse.data.id)
					}
				} catch (error) {
					console.warn("Error creating document:", error)
				}
			}

			if (documentIds.length > 0) {
				await pollForMemories(documentIds)
			}
		} catch (error) {
			console.warn("Error confirming documents:", error)
			setIsConfirmed(false)
		} finally {
			setIsLoading(false)
			isProcessingRef.current = false
		}
	}, [draftDocs, xResearchStatus, isConfirmed, pollForMemories])

	useEffect(() => {
		if (!formData) return

		const formDataMessages: typeof timelineMessages = []

		if (formData.twitter) {
			formDataMessages.push({
				message: formData.twitter,
				url: formData.twitter,
				title: "X/Twitter",
				description: formData.twitter,
				type: "formData" as const,
			})
		}

		if (formData.linkedin) {
			formDataMessages.push({
				message: formData.linkedin,
				url: formData.linkedin,
				title: "LinkedIn",
				description: formData.linkedin,
				type: "formData" as const,
			})
		}

		if (formData.otherLinks.length > 0) {
			formData.otherLinks.forEach((link) => {
				formDataMessages.push({
					message: link,
					url: link,
					title: "Link",
					description: link,
					type: "formData" as const,
				})
			})
		}

		if (formData.description?.trim()) {
			formDataMessages.push({
				message: formData.description,
				title: "Likes",
				description: formData.description,
				type: "formData" as const,
			})
		}

		setTimelineMessages(formDataMessages)
		buildDraftDocs()
	}, [formData, buildDraftDocs])

	return (
		<AnimatePresence mode="wait">
			{!isChatOpen ? (
				<motion.div
					key="closed"
					className={cn(
						"flex items-start justify-start",
						isMobile
							? "fixed bottom-4 right-4 z-50"
							: "absolute top-0 right-0 m-4",
						dmSansClassName(),
					)}
					layoutId="chat-toggle-button"
				>
					<motion.button
						onClick={toggleChat}
						className={cn(
							"flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border border-[#17181A] text-white cursor-pointer shadow-lg",
							isMobile && "px-4 py-2",
						)}
						style={{
							background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
						}}
					>
						<NovaOrb size={24} className="blur-none! z-10" />
						{!isMobile && "Chat with Nova"}
					</motion.button>
				</motion.div>
			) : (
				<motion.div
					key="open"
					className={cn(
						"bg-[#0A0E14] backdrop-blur-md flex flex-col",
						isMobile
							? "fixed inset-0 z-50 w-full h-dvh rounded-none m-0"
							: "w-[450px] h-[calc(100vh-110px)] rounded-2xl m-4",
						dmSansClassName(),
					)}
					initial={
						isMobile ? { y: "100%", opacity: 0 } : { x: "100px", opacity: 0 }
					}
					animate={{ x: 0, y: 0, opacity: 1 }}
					exit={
						isMobile ? { y: "100%", opacity: 0 } : { x: "100px", opacity: 0 }
					}
					transition={{ duration: 0.3, ease: "easeOut", bounce: 0 }}
				>
					<motion.button
						onClick={toggleChat}
						className={cn(
							"absolute top-4 right-4 flex items-center gap-2 rounded-full p-2 text-xs text-white cursor-pointer",
							isMobile && "bg-[#0D121A] border border-[#73737333]",
						)}
						style={
							isMobile
								? {
										boxShadow: "1.5px 1.5px 4.5px 0 rgba(0, 0, 0, 0.70) inset",
									}
								: {
										background:
											"linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
									}
						}
						layoutId="chat-toggle-button"
					>
						{isMobile ? (
							<XIcon className="size-4" />
						) : (
							<>
								<PanelRightCloseIcon className="size-4" />
								Close chat
							</>
						)}
					</motion.button>
					<div className="flex-1 flex flex-col px-4 space-y-3 pb-4 justify-end overflow-y-auto scrollbar-thin">
						{timelineMessages.map((msg, i) => (
							<div
								key={`message-${i}-${msg.message}`}
								className="flex items-start gap-2"
							>
								{msg.type === "waiting" ? (
									<div className="flex items-center gap-2 text-white/50">
										<NovaOrb size={30} className="blur-none!" />
										<span className="text-sm">{msg.message}</span>
									</div>
								) : (
									<>
										<div
											className={cn(
												"flex flex-col items-center justify-center w-[30px] h-full",
												i !== 0 && "",
											)}
										>
											{i === 0 && (
												<div className="w-3 h-3 bg-[#293952]/40 rounded-full mb-1" />
											)}
											<div className="w-px flex-1 bg-[#293952]/40" />
										</div>
										{msg.type === "formData" && (
											<div className="bg-[#293952]/40 rounded-lg p-2 px-3 space-y-1 flex-1">
												{msg.title && (
													<div className="flex items-center gap-2">
														<h3
															className="text-sm font-medium"
															style={{
																background:
																	"linear-gradient(90deg, #369BFD 0%, #36FDFD 30%, #36FDB5 100%)",
																WebkitBackgroundClip: "text",
																WebkitTextFillColor: "transparent",
																backgroundClip: "text",
															}}
														>
															{msg.title}
														</h3>
														{msg.url && processingByUrl[msg.url] && (
															<Loader2 className="h-3 w-3 animate-spin text-blue-400" />
														)}
													</div>
												)}
												{msg.url && (
													<a
														href={msg.url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-xs text-blue-400 hover:underline break-all block"
													>
														{msg.url}
													</a>
												)}
												{msg.title === "Likes" && msg.description && (
													<p className="text-xs text-white/70 mt-1">
														{msg.description}
													</p>
												)}
											</div>
										)}
										{msg.type === "memory" && (
											<div className="space-y-2 w-full max-h-60 overflow-y-auto scrollbar-thin">
												{msg.memories?.map((memory) => (
													<div
														key={memory.url + memory.title}
														className="bg-[#293952]/40 rounded-lg p-2 px-3 space-y-2"
													>
														{memory.title && (
															<h3
																className="text-sm font-medium"
																style={{
																	background:
																		"linear-gradient(90deg, #369BFD 0%, #36FDFD 30%, #36FDB5 100%)",
																	WebkitBackgroundClip: "text",
																	WebkitTextFillColor: "transparent",
																	backgroundClip: "text",
																}}
															>
																{memory.title}
															</h3>
														)}
														{memory.url && (
															<a
																href={memory.url}
																target="_blank"
																rel="noopener noreferrer"
																className="text-xs text-blue-400 hover:underline break-all"
															>
																{memory.url}
															</a>
														)}
														{memory.description && (
															<p className="text-xs text-white/50 mt-1">
																{memory.description}
															</p>
														)}
													</div>
												))}
											</div>
										)}
									</>
								)}
							</div>
						))}
						{chatMessages.map((msg) => {
							if (msg.role === "user") {
								const text = msg.parts
									.filter((part) => part.type === "text")
									.map((part) => part.text)
									.join(" ")
								return (
									<div
										key={msg.id}
										className="flex items-start gap-2 justify-end"
									>
										<div className="bg-[#1B1F24] rounded-[12px] p-3 px-[14px] max-w-[80%]">
											<p className="text-sm text-white">{text}</p>
										</div>
									</div>
								)
							}
							if (msg.role === "assistant") {
								return (
									<div key={msg.id} className="flex items-start gap-2">
										<NovaOrb size={30} className="blur-none!" />
										<div className="flex-1">
											{msg.parts.map((part, partIndex) => {
												if (part.type === "text") {
													return (
														<div
															key={`${msg.id}-${partIndex}`}
															className="text-sm text-white/90 chat-markdown-content"
														>
															<Streamdown>{part.text}</Streamdown>
														</div>
													)
												}
												if (part.type === "tool-searchMemories") {
													if (
														part.state === "input-available" ||
														part.state === "input-streaming"
													) {
														return (
															<div
																key={`${msg.id}-${partIndex}`}
																className="text-xs text-white/50 italic"
															>
																Searching memories...
															</div>
														)
													}
												}
												return null
											})}
										</div>
									</div>
								)
							}
							return null
						})}
						{(status === "submitted" || status === "streaming") &&
							chatMessages[chatMessages.length - 1]?.role === "user" && (
								<div className="flex items-start gap-2">
									<NovaOrb size={30} className="blur-none!" />
									<span className="text-sm text-white/50">Thinking...</span>
								</div>
							)}
						{timelineMessages.length === 0 &&
							chatMessages.length === 0 &&
							!isLoading &&
							!formData && (
								<div className="flex items-center gap-2 text-white/50">
									<NovaOrb size={28} className="blur-none!" />
									<span className="text-sm">Waiting for your input</span>
								</div>
							)}
						{isLoading && (
							<div className="flex items-center gap-2 text-foreground/50">
								<NovaOrb size={28} className="blur-none!" />
								<span className="text-sm">Extracting memories...</span>
							</div>
						)}
					</div>

					{draftDocs.some((d) => d.kind === "x_research") && !isConfirmed && (
						<div className="px-4 pb-2 space-y-3">
							<div className="bg-[#293952]/40 rounded-lg p-3 space-y-2">
								<h3
									className="text-sm font-medium"
									style={{
										background:
											"linear-gradient(90deg, #369BFD 0%, #36FDFD 30%, #36FDB5 100%)",
										WebkitBackgroundClip: "text",
										WebkitTextFillColor: "transparent",
										backgroundClip: "text",
									}}
								>
									Your Profile Summary
								</h3>
								<div className="overflow-y-auto scrollbar-thin max-h-32">
									<p className="text-xs text-white/70">
										{draftDocs.find((d) => d.kind === "x_research")?.content}
									</p>
								</div>
								<div className="flex items-center gap-2 pt-2">
									<span className="text-xs text-white/50">
										Is this accurate?
									</span>
									<button
										type="button"
										onClick={() => {
											setXResearchStatus("correct")
											handleConfirmDocs()
										}}
										disabled={isConfirmed || isLoading}
										className={cn(
											"flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer",
											xResearchStatus === "correct"
												? "bg-green-500/20 text-green-400 border border-green-500/40"
												: "bg-[#1B1F24] text-white/50 hover:text-white/70",
											(isConfirmed || isLoading) &&
												"opacity-50 cursor-not-allowed",
										)}
									>
										<CheckIcon className="size-3" />
										Correct
									</button>
									<button
										type="button"
										onClick={() => setXResearchStatus("incorrect")}
										className={cn(
											"flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer",
											xResearchStatus === "incorrect"
												? "bg-red-500/20 text-red-400 border border-red-500/40"
												: "bg-[#1B1F24] text-white/50 hover:text-white/70",
										)}
									>
										<XIcon className="size-3" />
										Incorrect
									</button>
								</div>
								{xResearchStatus === "incorrect" && (
									<>
										<p className="text-xs text-white/40 pt-1">
											If incorrect, share your info in the input below, or you
											can add memories later as well.
										</p>
										<Button
											type="button"
											onClick={handleConfirmDocs}
											disabled={isConfirmed || isLoading}
											className="w-full bg-[#267BF1] hover:bg-[#1E6AD9] text-white rounded-lg py-2 text-sm cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Continue
										</Button>
									</>
								)}
							</div>
						</div>
					)}

					{!draftDocs.some((d) => d.kind === "x_research") &&
						draftDocs.length > 0 &&
						!isConfirmed && (
							<div className="px-4 pb-2">
								<Button
									type="button"
									onClick={handleConfirmDocs}
									disabled={isConfirmed || isLoading}
									className="w-full bg-[#267BF1] hover:bg-[#1E6AD9] text-white rounded-lg py-2 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Continue
								</Button>
							</div>
						)}

					<div className="p-4 space-y-2">
						{isFetchingDrafts && (
							<div className="flex items-center gap-2 text-white/50 px-2">
								<NovaOrb size={20} className="blur-none!" />
								<span className="text-sm">
									Getting all relevant info about you...
								</span>
							</div>
						)}
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
								className="w-full text-white placeholder:text-white/20 rounded-sm outline-none resize-none text-base leading-relaxed bg-transparent px-2 h-10"
								disabled={status === "submitted" || status === "streaming"}
							/>
							<div className="flex justify-end absolute bottom-3 right-2">
								<Button
									type="submit"
									disabled={
										!message.trim() ||
										status === "submitted" ||
										status === "streaming"
									}
									className="text-white/20 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
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
