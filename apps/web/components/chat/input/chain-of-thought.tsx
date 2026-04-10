import { useAuth } from "@lib/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import type { UIMessage } from "@ai-sdk/react"
import {
	type ChatMemoryCard,
	memoryResultsFromSearchToolOutput,
} from "@/lib/chat-search-memory-results"
import { isWebSearchToolName } from "@/lib/chat-web-search-tools"
import { MemorySearchResultCard } from "../message/memory-search-result-card"

interface ReasoningStep {
	type: string
	state?: string
	message: string
}

export function ChainOfThought({ messages }: { messages: UIMessage[] }) {
	const { user } = useAuth()

	// Group messages into user-assistant pairs
	const messagePairs: Array<{
		userMessage: UIMessage
		agentMessage?: UIMessage
	}> = []

	let lastUserPair: {
		userMessage: UIMessage
		agentMessage?: UIMessage
	} | null = null

	for (let i = 0; i < messages.length; i++) {
		const message = messages[i]
		if (!message) continue

		if (message.role === "user") {
			lastUserPair = { userMessage: message }
			messagePairs.push(lastUserPair)
		} else if (
			message.role === "assistant" &&
			lastUserPair &&
			!lastUserPair.agentMessage
		) {
			lastUserPair.agentMessage = message
		}
	}

	return (
		<div className="m-3 mb-0 space-y-3 relative z-10">
			<div className="absolute left-[11px] top-0 bottom-0 w-px bg-[#151F31] self-stretch mb-0 -z-10" />

			{messagePairs.map((pair, pairIdx) => {
				const userMessageText =
					pair.userMessage.parts.find((part) => part.type === "text")?.text ??
					""

				const reasoningSteps: ReasoningStep[] = []
				if (pair.agentMessage) {
					pair.agentMessage.parts.forEach((part) => {
						if (part.type === "tool-searchMemories") {
							if (
								part.state === "input-available" ||
								part.state === "input-streaming"
							) {
								reasoningSteps.push({
									type: part.type,
									state: part.state,
									message: "Searching memories...",
								})
							} else if (part.state === "output-available") {
								reasoningSteps.push({
									type: part.type,
									state: part.state,
									message: "Found relevant memories",
								})
							} else if (part.state === "output-error") {
								reasoningSteps.push({
									type: part.type,
									state: part.state,
									message: "Error searching memories",
								})
							}
							return
						}

						const webSearchPart =
							part.type === "dynamic-tool" &&
							isWebSearchToolName(
								(part as { toolName?: string }).toolName ?? "",
							)
								? (part as {
										type: "dynamic-tool"
										toolName: string
										state: string
									})
								: part.type === "tool-web_search" ||
										part.type === "tool-google_search"
									? (part as { type: string; state: string })
									: null

						if (webSearchPart) {
							if (
								webSearchPart.state === "input-available" ||
								webSearchPart.state === "input-streaming"
							) {
								reasoningSteps.push({
									type: "web-search",
									state: webSearchPart.state,
									message: "Searching the web...",
								})
							} else if (webSearchPart.state === "output-available") {
								reasoningSteps.push({
									type: "web-search",
									state: webSearchPart.state,
									message: "Explored the web",
								})
							} else if (webSearchPart.state === "output-error") {
								reasoningSteps.push({
									type: "web-search",
									state: webSearchPart.state,
									message: "Web search failed",
								})
							}
						}
					})

					const webSourceCount = pair.agentMessage.parts.filter(
						(p) => p.type === "source-url",
					).length
					if (webSourceCount > 0) {
						const hasToolWebDone = reasoningSteps.some(
							(s) => s.type === "web-search" && s.state === "output-available",
						)
						if (!hasToolWebDone) {
							reasoningSteps.push({
								type: "web-sources",
								state: "done",
								message:
									webSourceCount === 1
										? "Found 1 web source"
										: `Found ${webSourceCount} web sources`,
							})
						}
					}
				}

				const memoryResults: ChatMemoryCard[] = []
				if (pair.agentMessage) {
					pair.agentMessage.parts.forEach((part) => {
						if (
							part.type === "tool-searchMemories" &&
							part.state === "output-available"
						) {
							memoryResults.push(
								...memoryResultsFromSearchToolOutput(part.output),
							)
						}
					})
				}

				return (
					<div key={pair.userMessage.id || pairIdx} className="space-y-3">
						<div className="flex items-start gap-3 text-[#525D6E] py-1">
							{user && (
								<Avatar className="size-[21px]">
									<AvatarImage src={user?.image ?? ""} />
									<AvatarFallback className="text-[10px]">
										{user?.name?.charAt(0)}
									</AvatarFallback>
								</Avatar>
							)}
							<p>{userMessageText}</p>
						</div>

						{(reasoningSteps.length > 0 || memoryResults.length > 0) && (
							<div className="flex gap-3">
								<div className="flex flex-col items-center mx-2 py-1 h-fit">
									<div className="size-[7px] rounded-full bg-[#151F31] shrink-0" />
								</div>

								<div className="flex-1 space-y-1">
									{reasoningSteps.length > 0 && (
										<div className="space-y-1.5">
											{reasoningSteps.map((step, idx) => (
												<div
													key={`${step.type}-${step.state}-${idx}`}
													className="text-[#525D6E]"
												>
													{step.message}
												</div>
											))}
										</div>
									)}

									{memoryResults.length > 0 && (
										<div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto items-stretch">
											{memoryResults.map((result, idx) => (
												<MemorySearchResultCard
													key={result.documentId ?? idx}
													result={result}
													tone="input"
												/>
											))}
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}
