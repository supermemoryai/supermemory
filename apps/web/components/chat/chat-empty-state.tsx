"use client"

import { Search } from "lucide-react"
import NovaOrb from "@/components/nova/nova-orb"
import { cn } from "@lib/utils"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"

export const DEFAULT_CHAT_PROMPTS = [
	"What do you know about me?",
	"Set up Cursor",
	"Show my active plugins",
] as const

const SUGGESTION_PILL_CLASS = cn(
	"inline-flex max-w-full items-center gap-2 rounded-full border border-[#2261CA33] bg-[#041127]",
	"px-3 py-2 text-left transition-colors cursor-pointer",
	"hover:border-[#3374FF]/55 hover:bg-[#0A1A3A] hover:[&_span]:text-white",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3374FF]/40",
)

export function ChatEmptyStatePlaceholder({
	onSuggestionClick,
	suggestions = [...DEFAULT_CHAT_PROMPTS],
	subtitle,
}: {
	onSuggestionClick: (suggestion: string) => void
	suggestions?: string[]
	subtitle?: string
}) {
	const prompts = suggestions.slice(0, 3)

	return (
		<div
			id="chat-empty-state"
			className={cn(
				"flex min-h-full items-center justify-center px-4 py-10",
				dmSansClassName(),
			)}
		>
			<div className="flex w-full max-w-[min(100%,360px)] flex-col items-center gap-5">
				<div className="flex flex-col items-center gap-3 text-center">
					<NovaOrb size={44} className="blur-[1px]!" />
					<p
						className={cn(
							"text-lg font-semibold text-[#fafafa]",
							dmSans125ClassName(),
						)}
					>
						Nova knows you.
					</p>
					{subtitle ? (
						<p className="max-w-[280px] text-sm leading-snug text-[#737373]">
							{subtitle}
						</p>
					) : null}
				</div>

				<div className="flex w-full flex-col items-center gap-2">
					<p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#525966]">
						Try asking
					</p>
					<div className="flex w-full flex-col items-center gap-2">
						{prompts.map((prompt) => (
							<button
								key={prompt}
								type="button"
								onClick={() => onSuggestionClick(prompt)}
								className={SUGGESTION_PILL_CLASS}
							>
								<Search
									className="size-3.5 shrink-0 text-[#4BA0FA]"
									aria-hidden
								/>
								<span className="text-[12px] font-medium leading-snug text-[#4BA0FA]">
									{prompt}
								</span>
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
