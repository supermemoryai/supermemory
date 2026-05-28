"use client"

import { memo, useEffect, useRef, useState } from "react"
import { Copy, Check, PencilIcon, PencilOffIcon } from "lucide-react"
import type { UIMessage } from "@ai-sdk/react"
import ChatModelSelector from "../model-selector"
import { ReasoningSelector } from "../reasoning-selector"
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
			{isEditing ? (
				<div className="w-full max-w-[88%] rounded-[14px] border border-[#293952]/70 bg-[#0D121A] p-2 shadow-[0_16px_36px_rgba(0,0,0,0.28)]">
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
							/>
							<ReasoningSelector
								value={editReasoningEffort}
								onChange={setEditReasoningEffort}
								dropdownDirection="down"
							/>
						</div>
						<div className="flex shrink-0 items-center gap-1">
							<button
								type="button"
								onClick={submitEdit}
								disabled={!draft.trim()}
								className="rounded-md bg-[#E052A0] p-2 transition-colors hover:bg-[#EF6FB4] disabled:cursor-not-allowed disabled:opacity-50"
								title="Send edited message"
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 12 16"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<title>Send</title>
									<path
										d="M12 6L10.55 7.4L7 3.85L7 16L5 16L5 3.85L1.45 7.4L-4.37e-07 6L6 -2.62e-07L12 6Z"
										fill="#FAFAFA"
									/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			) : (
				<div className="bg-[#1B1F24] rounded-[12px] p-3 px-[14px] max-w-[80%]">
					<p className="text-sm text-white">{text}</p>
				</div>
			)}
			<div className="mt-1 flex max-w-full items-center justify-end gap-1">
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
			</div>
		</div>
	)
})
