"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import NovaOrb from "@/components/nova/nova-orb"
import { Button } from "@ui/components/button"
import {
	HistoryIcon,
	PanelRightCloseIcon,
	SendIcon,
	SquarePenIcon,
} from "lucide-react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"

export function ChatSidebar() {
	const [message, setMessage] = useState("")
	const [isChatOpen, setIsChatOpen] = useState(true)

	// Static placeholder messages for UI display
	const messages = [
		//{
		//	message: "Sample memory content",
		//	type: "memory" as const,
		//	memories: [
		//		{
		//			url: "https://example.com",
		//			title: "Example Memory",
		//			description: "This is a sample memory description for UI display purposes.",
		//			fullContent: "This is a sample memory description for UI display purposes.",
		//		},
		//	],
		//},
	]

	const handleSend = () => {
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
						"w-[450px] h-[calc(100vh-110px)] bg-[#0A0E14] backdrop-blur-md flex flex-col rounded-2xl m-4 border border-[#17181AB2]",
						dmSansClassName(),
					)}
					initial={{ x: "100px", opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					exit={{ x: "100px", opacity: 0 }}
					transition={{ duration: 0.3, ease: "easeOut", bounce: 0 }}
				>
					<div className="flex items-center justify-between p-4 px-6">
						<p>Chat Title</p>
						<div className="flex items-center gap-2">
							<Button
								variant="headers"
								className="rounded-full text-base gap-2 !h-10 border-[#73737333] bg-[#0D121A]"
							>
								<HistoryIcon className="size-4 text-[#737373]" />
							</Button>
							<Button
								variant="headers"
								className="rounded-full text-base gap-2 !h-10 border-[#73737333] bg-[#0D121A]"
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
					<div className="flex-1 flex flex-col px-4 space-y-3 pb-4 justify-end">
						{messages.map((msg, i) => (
							<div
								key={`message-${i}-${msg.message}`}
								className="flex items-start gap-2"
							>
								{msg.type === "waiting" ? (
									<div className="flex items-center gap-2 text-white/50">
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
								className="w-full text-white placeholder:text-white/20 rounded-sm outline-none resize-none text-base leading-relaxed bg-transparent px-2 h-10"
							/>
							<div className="flex justify-end absolute bottom-3 right-2">
								<Button
									type="submit"
									disabled={!message.trim()}
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
