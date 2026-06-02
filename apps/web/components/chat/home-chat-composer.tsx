"use client"

import { useCallback, useState } from "react"
import ChatInput from "./input"
import ChatModelSelector from "./model-selector"
import { useProject } from "@/stores"
import { cn } from "@lib/utils"
import type { ModelId } from "@/lib/models"
import { SpaceSelector } from "@/components/space-selector"
import { AUTO_CHAT_SPACE_ID } from "@/lib/chat-auto-space"
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
	) => void
	className?: string
}) {
	const [input, setInput] = useState("")
	const [selectedModel, setSelectedModel] = useState<ModelId>("gemini-2.5-pro")
	const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(
		getDefaultReasoningEffort("gemini-2.5-pro"),
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
		if (!t) return
		onStartChat(
			t,
			selectedModel,
			chatSpaceProjects[0] ?? selectedProject,
			reasoningEffort,
		)
		setInput("")
	}, [
		chatSpaceProjects,
		input,
		onStartChat,
		reasoningEffort,
		selectedModel,
		selectedProject,
	])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			send()
		}
	}

	return (
		<div className={cn(className)}>
			<div className="mx-auto w-full max-w-[720px] px-4 pt-1 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+1rem))] md:pb-6">
				<ChatInput
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onSend={send}
					onStop={() => {}}
					onKeyDown={handleKeyDown}
					isResponding={false}
					showStatusStrip={false}
					stackedToolbar={
						<>
							<ChatModelSelector
								selectedModel={selectedModel}
								onModelChange={handleModelChange}
								minimal
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
								triggerClassName="h-auto min-h-0 max-w-[min(160px,35vw)] rounded-full border border-[#161F2C] bg-[#000000] px-3 py-1.5 shadow-none hover:bg-[#05080D]"
							/>
						</>
					}
				/>
			</div>
		</div>
	)
}
