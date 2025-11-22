import { useAuth } from "@lib/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import type { UIMessage } from "@ai-sdk/react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"

interface MemoryResult {
	documentId?: string
	title?: string
	content?: string
	url?: string
	score?: number
}

interface ReasoningStep {
	type: string
	state?: string
	message: string
}

export function ChainOfThought({
	userMessage,
	lastAgentMessage,
}: {
	userMessage: string
	lastAgentMessage: UIMessage | undefined
}) {
	const { user } = useAuth()

	const reasoningSteps: ReasoningStep[] = []
	if (lastAgentMessage) {
		lastAgentMessage.parts.forEach((part) => {
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
			}
		})
	}

	const memoryResults: MemoryResult[] = []
	if (lastAgentMessage) {
		lastAgentMessage.parts.forEach((part) => {
			if (
				part.type === "tool-searchMemories" &&
				part.state === "output-available"
			) {
				const output = part.output as { results?: MemoryResult[] } | undefined
				const results = Array.isArray(output?.results) ? output.results : []
				memoryResults.push(...results)
			}
		})
	}

	return (
		<div className="m-3 mb-0 space-y-3 relative z-10">
			<div className="absolute left-[11px] top-0 bottom-0 w-[1px] bg-[#151F31] self-stretch mb-0 z-[-10]" />

			<div className="flex items-start gap-3 text-[#525D6E] py-1 bg-[#01173C]">
				{user && (
					<Avatar className="size-[21px]">
						<AvatarImage src={user?.image ?? ""} />
						<AvatarFallback className="text-[10px]">
							{user?.name?.charAt(0)}
						</AvatarFallback>
					</Avatar>
				)}
				<p>{userMessage}</p>
			</div>

			{(reasoningSteps.length > 0 || memoryResults.length > 0) && (
				<div className="flex gap-3">
					<div className="flex flex-col items-center mx-2 bg-[#01173C] py-1 h-fit">
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
							<div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
								{memoryResults.map((result, idx) => {
									const isClickable =
										result.url &&
										(result.url.startsWith("http://") ||
											result.url.startsWith("https://"))

									const content = (
										<div className="">
											<div className="bg-[#060D17] p-2 px-[10px] rounded-xl m-[2px]">
												{result.title && (
													<div className="text-xs text-[#525D6E] line-clamp-2">
														{result.title}
													</div>
												)}
												{result.content && (
													<div className="text-xs text-[#525D6E]/80 line-clamp-2 mt-1">
														{result.content}
													</div>
												)}
												{result.url && (
													<div className="text-xs text-[#525D6E] mt-1 truncate">
														{result.url}
													</div>
												)}
											</div>
											{result.score && (
												<div className="flex justify-center p-1">
													<div
														className={cn(
															"text-[10px] inline-block bg-clip-text text-transparent font-medium",
															dmSansClassName(),
														)}
														style={{
															backgroundImage:
																"var(--grad-1, linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%))",
														}}
													>
														Relevancy score: {(result.score * 100).toFixed(1)}%
													</div>
												</div>
											)}
										</div>
									)

									if (isClickable) {
										return (
											<a
												className="block p-2 bg-[#0C1829]/50 rounded-md border border-[#525D6E]/20 hover:bg-[#0C1829]/70 transition-colors cursor-pointer"
												href={result.url}
												key={result.documentId || idx}
												rel="noopener noreferrer"
												target="_blank"
											>
												{content}
											</a>
										)
									}

									return (
										<div
											className={cn("bg-[#0C1829] rounded-xl")}
											key={result.documentId || idx}
										>
											{content}
										</div>
									)
								})}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
