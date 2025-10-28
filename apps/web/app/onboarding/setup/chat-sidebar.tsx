"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import NovaOrb from "@/components/nova/nova-orb"
import { Button } from "@ui/components/button"
import { PanelRightCloseIcon, SendIcon } from "lucide-react"
import { collectValidUrls } from "@/utils/url-helpers"
import { $fetch } from "@lib/api"
import { cn } from "@lib/utils"
import { dmSansFont } from "@/utils/fonts"

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
	const displayedMemoriesRef = useRef<Set<string>>(new Set())

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

							if (newMemories.length > 0 && messages.length < 10) {
								setMessages((prev) => [
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
		[messages.length],
	)

	useEffect(() => {
		if (!formData) return

		const urls = collectValidUrls(formData.linkedin, formData.otherLinks)

		console.log("urls", urls)

		const processContent = async () => {
			setIsLoading(true)

			try {
				const documentIds: string[] = []

				// Step 1: Fetch content from Exa if URLs exist
				if (urls.length > 0) {
					const response = await fetch("/api/exa/fetch-content", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ urls }),
					})
					const { results } = await response.json()
					console.log("results", results)

					// Create documents from Exa results
					for (const result of results) {
						try {
							const docResponse = await $fetch("@post/documents", {
								body: {
									content: result.text || result.description || "",
									containerTags: ["sm_project_default"],
									metadata: {
										sm_source: "consumer",
										exa_url: result.url,
										exa_title: result.title,
									},
								},
							})

							if (docResponse.data?.id) {
								documentIds.push(docResponse.data.id)
							}
						} catch (error) {
							console.warn("Error creating document:", error)
						}
					}
				}

				// Step 2: Create document from description if it exists
				if (formData.description?.trim()) {
					try {
						const descDocResponse = await $fetch("@post/documents", {
							body: {
								content: formData.description,
								containerTags: ["sm_project_default"],
								metadata: {
									sm_source: "consumer",
									description_source: "user_input",
								},
							},
						})

						if (descDocResponse.data?.id) {
							documentIds.push(descDocResponse.data.id)
						}
					} catch (error) {
						console.warn("Error creating description document:", error)
					}
				}

				// Step 3: Poll for memories or show form data
				if (documentIds.length > 0) {
					await pollForMemories(documentIds)
				} else {
					// No documents created, show form data or waiting
					const formDataMessages = []

					if (formData.twitter) {
						formDataMessages.push({
							message: `Twitter: ${formData.twitter}`,
							url: formData.twitter,
							title: "Twitter Profile",
							description: `Twitter: ${formData.twitter}`,
							type: "formData" as const,
						})
					}

					if (formData.linkedin) {
						formDataMessages.push({
							message: `LinkedIn: ${formData.linkedin}`,
							url: formData.linkedin,
							title: "LinkedIn Profile",
							description: `LinkedIn: ${formData.linkedin}`,
							type: "formData" as const,
						})
					}

					if (formData.otherLinks.length > 0) {
						formData.otherLinks.forEach((link) => {
							formDataMessages.push({
								message: `Link: ${link}`,
								url: link,
								title: "Other Link",
								description: `Link: ${link}`,
								type: "formData" as const,
							})
						})
					}

					const waitingMessage = {
						message: "Waiting for your input",
						url: "",
						title: "",
						description: "Waiting for your input",
						type: "waiting" as const,
					}

					setMessages([...formDataMessages, waitingMessage])
				}
			} catch (error) {
				console.warn("Error processing content:", error)

				const waitingMessage = {
					message: "Waiting for your input",
					url: "",
					title: "",
					description: "Waiting for your input",
					type: "waiting" as const,
				}

				setMessages([waitingMessage])
			}
			setIsLoading(false)
		}

		processContent()
	}, [formData, pollForMemories])

	return (
		<AnimatePresence mode="wait">
			{!isChatOpen ? (
				<motion.div
					key="closed"
					className={cn(
						"absolute top-0 right-0 flex items-start justify-start m-4",
						dmSansFont.className,
					)}
					layoutId="chat-toggle-button"
				>
					<motion.button
						onClick={toggleChat}
						className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border-[1px] border-[#17181A]"
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
						"w-[450px] h-[calc(100vh-110px)] bg-[#0A0E14] backdrop-blur-md flex flex-col rounded-2xl m-4",
						dmSansFont.className,
					)}
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
					<div className="flex-1 flex flex-col px-4 space-y-3 pb-4 justify-end">
						{messages.length === 0 && !isLoading && !formData && (
							<div className="flex items-center gap-2 text-foreground/50">
								<NovaOrb size={28} className="!blur-none" />
								<span className="text-sm">Waiting for your input</span>
							</div>
						)}
						{isLoading && (
							<div className="flex items-center gap-2 text-foreground/50">
								<NovaOrb size={28} className="!blur-none" />
								<span className="text-sm">Fetching your memories...</span>
							</div>
						)}
						{messages.map((msg, i) => (
							<div
								key={`message-${i}-${msg.message}`}
								className="flex items-start gap-2"
							>
								{msg.type === "waiting" ? (
									<div className="flex items-center gap-2 text-foreground/70">
										<NovaOrb size={30} className="!blur-none" />
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
											<div className="w-[1px] flex-1 bg-[#293952]/40" />
										</div>
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
															<p className="text-xs text-foreground/70 mt-1">
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
