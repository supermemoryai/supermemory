"use client"

import { useState } from "react"
import { motion } from "motion/react"
import NovaOrb from "@/components/nova/nova-orb"
import { Button } from "@ui/components/button"
import { PanelRightCloseIcon, SendIcon } from "lucide-react"

export function ChatSidebar() {
	const [message, setMessage] = useState("")
	const [isChatOpen, setIsChatOpen] = useState(true)

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

	if (!isChatOpen) {
		return (
			<motion.div
				className="absolute top-0 right-0 flex items-start justify-start m-4"
				initial={{ x: "100%" }}
				animate={{ x: 0 }}
				transition={{ duration: 0.5, ease: "easeOut" }}
			>
				<motion.button
					onClick={toggleChat}
					className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border-[1px] border-[#17181A]"
					style={{
						background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
					}}
					whileTap={{ scale: 0.95 }}
					layoutId="chat-toggle-button"
				>
					Chat with Nova
				</motion.button>
			</motion.div>
		)
	}

	return (
		<motion.div
			className="w-[450px] h-[calc(100vh-110px)] bg-[#0A0E14] backdrop-blur-md flex flex-col rounded-2xl m-4"
			initial={{ x: "100%" }}
			animate={{ x: 0 }}
			exit={{ x: "100%", opacity: 0, transition: { duration: 1, ease: "easeOut" } }}
			transition={{ duration: 0.5, ease: "easeOut" }}
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
			<div className="flex-1 flex items-end justify-start px-4">
				<div className="flex flex-col items-center gap-4">
					<motion.div
						className="flex items-center gap-2 text-foreground/70"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.5 }}
					>
						<NovaOrb size={24} />

						<span className="text-sm">Waiting for your input</span>
					</motion.div>
				</div>
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
	)
}
