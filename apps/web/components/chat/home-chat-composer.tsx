"use client"

import { useCallback, useMemo, useState } from "react"
import ChatInput from "./input"
import ChatModelSelector from "./model-selector"
import { getChatSpaceDisplayLabel } from "@/lib/chat-space-label"
import { useProject } from "@/stores"
import { useContainerTags } from "@/hooks/use-container-tags"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import type { ModelId } from "@/lib/models"

export function HomeChatComposer({
	onStartChat,
	className,
}: {
	onStartChat: (message: string, model: ModelId) => void
	className?: string
}) {
	const [input, setInput] = useState("")
	const [selectedModel, setSelectedModel] = useState<ModelId>("gemini-2.5-pro")
	const { selectedProject } = useProject()
	const { allProjects } = useContainerTags()
	const chatSpaceLabel = useMemo(
		() =>
			getChatSpaceDisplayLabel({
				selectedProject,
				allProjects,
			}),
		[selectedProject, allProjects],
	)

	const send = useCallback(() => {
		const t = input.trim()
		if (!t) return
		onStartChat(t, selectedModel)
		setInput("")
	}, [input, onStartChat, selectedModel])

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
							<div
								className={cn(
									"inline-flex max-w-[min(160px,35vw)] min-w-0 shrink items-center rounded-full bg-fg-primary/5 px-3 py-1.5",
									dmSansClassName(),
								)}
								title={chatSpaceLabel}
							>
								<span className="truncate text-sm text-fg-primary">
									{chatSpaceLabel}
								</span>
							</div>
						</>
					}
				/>
			</div>
		</div>
	)
}
