import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import type { UIMessage } from "@ai-sdk/react"
import { dmSansClassName } from "@/utils/fonts"
import { cn } from "@lib/utils"

interface MemoryResult {
	documentId?: string
	title?: string
	content?: string
	url?: string
	score?: number
}

interface RelatedMemoriesProps {
	message: UIMessage
	expandedMemories: string | null
	onToggle: (messageId: string) => void
}

export function RelatedMemories({
	message,
	expandedMemories,
	onToggle,
}: RelatedMemoriesProps) {
	const memoryResults: MemoryResult[] = []

	message.parts.forEach((part) => {
		if (
			part.type === "tool-searchMemories" &&
			part.state === "output-available"
		) {
			const output = part.output as { results?: MemoryResult[] } | undefined
			const results = Array.isArray(output?.results) ? output.results : []
			memoryResults.push(...results)
		}
	})

	if (memoryResults.length === 0) {
		return null
	}

	const isExpanded = expandedMemories === message.id

	return (
		<div className="mb-2">
			<button
				type="button"
				className="flex items-center gap-2 text-white/50 hover:text-white/70 transition-colors text-sm"
				onClick={() => onToggle(message.id)}
			>
				Related Memories
				{isExpanded ? (
					<ChevronUpIcon className="size-3.5" />
				) : (
					<ChevronDownIcon className="size-3.5" />
				)}
			</button>

			{isExpanded && (
				<div className="mt-2 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
					{memoryResults.map((result, idx) => {
						const isClickable =
							result.url &&
							(result.url.startsWith("http://") ||
								result.url.startsWith("https://"))

						const content = (
							<div className="">
								<div className="bg-[#060D17] p-2 rounded-xl">
									{result.title && (
										<div className="text-xs text-white/60 line-clamp-2">
											{result.title}
										</div>
									)}
									{result.content && (
										<div className="text-xs text-white/60 line-clamp-2">
											{result.content}
										</div>
									)}
									{result.url && (
										<div className="text-xs text-blue-400 mt-1 truncate">
											{result.url}
										</div>
									)}
								</div>
								{result.score && (
									<div className="text-xs text-white/50 mt-1 p-1 text-center">
										Relevance Score: {(result.score * 100).toFixed(1)}%
									</div>
								)}
							</div>
						)

						if (isClickable) {
							return (
								<a
									className="block p-2 bg-white/5 rounded-md border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
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
								className={cn(
									"bg-[#0C1829] rounded-xl border border-white/10",
									dmSansClassName(),
								)}
								key={result.documentId || idx}
							>
								{content}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
