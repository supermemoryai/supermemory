"use client"

import { memo, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Copy, Check, PencilIcon, PencilOffIcon } from "lucide-react"
import type { UIMessage } from "@ai-sdk/react"
import ChatModelSelector from "../model-selector"
import { ReasoningSelector } from "../reasoning-selector"
import { SendButton } from "../input/actions"
import {
	getDefaultReasoningEffort,
	type ModelId,
	type ReasoningEffort,
} from "@/lib/models"

interface UserMessageProps {
	message: UIMessage
	copiedMessageId: string | null
	selectedModel: ModelId
	reasoningEffort: ReasoningEffort
	onCopy: (messageId: string, text: string) => void
	onRegenerate: (
		messageId: string,
		text: string,
		model: ModelId,
		reasoningEffort: ReasoningEffort,
	) => void
}

export const UserMessage = memo(function UserMessage({
	message,
	copiedMessageId,
	selectedModel,
	reasoningEffort,
	onCopy,
	onRegenerate,
}: UserMessageProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [draft, setDraft] = useState("")
	const [editModel, setEditModel] = useState<ModelId>(selectedModel)
	const [editReasoningEffort, setEditReasoningEffort] =
		useState<ReasoningEffort>(reasoningEffort)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const text = message.parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join(" ")

	const startEditing = () => {
		setDraft(text)
		setEditModel(selectedModel)
		setEditReasoningEffort(reasoningEffort)
		setIsEditing(true)
	}

	const submitEdit = () => {
		const nextText = draft.trim()
		if (!nextText) return
		setIsEditing(false)
		onRegenerate(message.id, nextText, editModel, editReasoningEffort)
	}

	const handleEditModelChange = (model: ModelId) => {
		setEditModel(model)
		setEditReasoningEffort(getDefaultReasoningEffort(model))
	}

	useEffect(() => {
		if (!isEditing) return
		textareaRef.current?.focus()
	}, [isEditing])

	return (
		<div className="flex flex-col items-end w-full">
			<AnimatePresence mode="popLayout" initial={false}>
				{isEditing ? (
					<motion.div
						key="edit"
						initial={{ opacity: 0, scaleX: 0.4, scaleY: 0.6 }}
						animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
						exit={{ opacity: 0, scaleX: 0.4, scaleY: 0.6 }}
						transition={{ duration: 0.55, ease: [0.22, 0.68, 0.18, 1] }}
						className="relative z-20 w-full max-w-[88%] origin-right rounded-xl bg-surface-card/60 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.34)] backdrop-blur-md"
					>
						<textarea
							ref={textareaRef}
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter" && !event.shiftKey) {
									event.preventDefault()
									submitEdit()
								}
							}}
							className="min-h-20 w-full resize-none bg-transparent p-2 text-sm text-white outline-none placeholder:text-white/30"
						/>
						<div className="mt-2 flex items-center justify-between gap-2">
							<div className="flex min-w-0 items-center gap-2">
								<ChatModelSelector
									selectedModel={editModel}
									onModelChange={handleEditModelChange}
									minimal
									dropdownDirection="up"
								/>
								<ReasoningSelector
									value={editReasoningEffort}
									onChange={setEditReasoningEffort}
									dropdownDirection="up"
								/>
							</div>
							<div className="flex shrink-0 items-center gap-1">
								<SendButton
									onClick={submitEdit}
									disabled={!draft.trim()}
									disabledTooltip="Type a message to send"
								/>
							</div>
						</div>
					</motion.div>
				) : (
					<motion.div
						key="view"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18, ease: "easeOut" }}
						className="max-w-[80%] origin-top-right rounded-[12px] bg-[#1B1F24] p-3 px-[14px]"
					>
						<p className="text-sm text-white whitespace-pre-wrap">{text}</p>
					</motion.div>
				)}
			</AnimatePresence>
			<motion.div
				layout
				transition={{ layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
				className="mt-1 flex max-w-full items-center justify-end gap-1"
			>
				<button
					type="button"
					onClick={() => onCopy(message.id, text)}
					className="p-1.5 hover:bg-[#293952]/40 rounded transition-colors"
					title="Copy message"
				>
					{copiedMessageId === message.id ? (
						<Check className="size-3.5 text-green-400" />
					) : (
						<Copy className="size-3.5 text-white/50" />
					)}
				</button>
				<button
					type="button"
					onClick={isEditing ? () => setIsEditing(false) : startEditing}
					className="p-1.5 hover:bg-[#293952]/40 rounded transition-colors"
					title={isEditing ? "Cancel edit" : "Edit message"}
				>
					{isEditing ? (
						<PencilOffIcon className="size-3.5 text-white/50" />
					) : (
						<PencilIcon className="size-3.5 text-white/50" />
					)}
				</button>
			</motion.div>
		</div>
	)
})
