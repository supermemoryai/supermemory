"use client"

import { useCallback, useState } from "react"
import ChatInput from "./input"
import ChatModelSelector from "./model-selector"
import { useProject } from "@/stores"
import { cn } from "@lib/utils"
import type { ModelId } from "@/lib/models"
import { SpaceSelector } from "@/components/space-selector"
import { AUTO_CHAT_SPACE_ID } from "@/lib/chat-auto-space"
import { toast } from "sonner"
import {
	chatAttachmentKey,
	CHAT_ATTACHMENT_ACCEPT,
	createChatAttachmentDraft,
	type ChatAttachmentDraft,
	isAcceptedChatAttachment,
} from "./attachments"
import { ReasoningSelector } from "./reasoning-selector"
import { getDefaultReasoningEffort, type ReasoningEffort } from "@/lib/models"

export function HomeChatComposer({
	onStartChat,
	className,
}: {
	onStartChat: (
		message: string,
		model: ModelId,
		projectId: string,
		reasoningEffort: ReasoningEffort,
		attachments?: ChatAttachmentDraft[],
	) => void
	className?: string
}) {
	const [input, setInput] = useState("")
	const [attachmentDrafts, setAttachmentDrafts] = useState<
		ChatAttachmentDraft[]
	>([])
	const [selectedModel, setSelectedModel] = useState<ModelId>("grok-4.3")
	const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(
		getDefaultReasoningEffort("grok-4.3"),
	)
	const { selectedProject } = useProject()
	const [chatSpaceProjects, setChatSpaceProjects] = useState<string[]>([
		AUTO_CHAT_SPACE_ID,
	])

	const handleModelChange = useCallback((model: ModelId) => {
		setSelectedModel(model)
		setReasoningEffort(getDefaultReasoningEffort(model))
	}, [])

	const send = useCallback(() => {
		const t = input.trim()
		if (!t && attachmentDrafts.length === 0) return
		onStartChat(
			t,
			selectedModel,
			chatSpaceProjects[0] ?? selectedProject,
			reasoningEffort,
			attachmentDrafts,
		)
		setInput("")
		setAttachmentDrafts([])
	}, [
		attachmentDrafts,
		chatSpaceProjects,
		input,
		onStartChat,
		reasoningEffort,
		selectedModel,
		selectedProject,
	])

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
		},
		[attachmentDrafts],
	)

	const handleRemoveAttachment = useCallback((id: string) => {
		setAttachmentDrafts((prev) => prev.filter((item) => item.id !== id))
	}, [])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			send()
		}
	}

	return (
		<div className={cn(className)}>
			<div className="mx-auto w-full max-w-[720px] px-4 pt-1 pb-2 md:pb-6">
				<ChatInput
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onSend={send}
					onStop={() => {}}
					onKeyDown={handleKeyDown}
					isResponding={false}
					attachments={attachmentDrafts}
					onAddAttachmentFiles={handleAddAttachmentFiles}
					onRemoveAttachment={handleRemoveAttachment}
					canSend={input.trim().length > 0 || attachmentDrafts.length > 0}
					attachmentAccept={CHAT_ATTACHMENT_ACCEPT}
					showStatusStrip={false}
					stackedToolbar={
						<ChatModelSelector
							selectedModel={selectedModel}
							onModelChange={handleModelChange}
							minimal
						/>
					}
					toolbarTrailing={
						<ReasoningSelector
							value={reasoningEffort}
							onChange={setReasoningEffort}
						/>
					}
					toolbarEnd={
						<SpaceSelector
							selectedProjects={chatSpaceProjects}
							onValueChange={setChatSpaceProjects}
							variant="insideOut"
							includeAuto
							hideCount
							triggerClassName="h-auto min-h-0 max-w-[min(160px,35vw)] gap-1.5 rounded-md border-0 bg-transparent px-2 py-1 shadow-none hover:bg-white/5"
						/>
					}
				/>
			</div>
		</div>
	)
}
