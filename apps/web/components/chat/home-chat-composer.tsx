"use client"

import { useCallback, useState } from "react"
import ChatInput from "./input"
import ChatModelSelector from "./model-selector"
import { useProject } from "@/stores"
import { cn } from "@lib/utils"
import type { ModelId } from "@/lib/models"
import { SpaceSelector } from "@/components/space-selector"

export function HomeChatComposer({
	onStartChat,
	className,
}: {
	onStartChat: (message: string, model: ModelId, projectId: string) => void
	className?: string
}) {
	const [input, setInput] = useState("")
	const [selectedModel, setSelectedModel] = useState<ModelId>("gemini-2.5-pro")
	const { selectedProject } = useProject()
	const [chatSpaceProjects, setChatSpaceProjects] = useState<string[]>([
		selectedProject,
	])

	const send = useCallback(() => {
		const t = input.trim()
		if (!t) return
		onStartChat(t, selectedModel, chatSpaceProjects[0] ?? selectedProject)
		setInput("")
	}, [chatSpaceProjects, input, onStartChat, selectedModel, selectedProject])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			send()
		}
	}

	return (
		<div className={cn(className)}>
			<div className="mx-auto w-full max-w-[720px] px-4 pt-1 pb-3 md:pb-4">
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
								onModelChange={setSelectedModel}
								minimal
							/>
							<SpaceSelector
								selectedProjects={chatSpaceProjects}
								onValueChange={setChatSpaceProjects}
								variant="insideOut"
								includeAuto
								triggerClassName="h-auto min-h-0 max-w-[min(160px,35vw)] rounded-full border border-[#161F2C] bg-[#000000] px-3 py-1.5 shadow-none hover:bg-[#05080D]"
							/>
						</>
					}
				/>
			</div>
		</div>
	)
}
