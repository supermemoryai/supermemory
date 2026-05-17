"use client"

import { CHROME_EXTENSION_URL } from "@repo/lib/constants"
import type { IntegrationParamValue } from "@/lib/search-params"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { Button } from "@ui/components/button"
import NovaOrb from "./nova-orb"
import { ChromeIcon } from "@/components/integration-icons"
import { ArrowRight, Link2, FileText, Zap } from "lucide-react"

interface NovaEmptyStateProps {
	onAddMemory: (tab: "note" | "link") => void
	onOpenIntegrations: (integration?: IntegrationParamValue) => void
	isAllSpaces: boolean
	spaceName?: string
	onSwitchToAllSpaces?: () => void
}

const cardClass = cn(
	"bg-[#14161A] rounded-xl p-4 border border-[rgba(82,89,102,0.2)]",
	"hover:border-[#3374FF]/50 hover:bg-[#1B1F24]",
	"transition-colors cursor-pointer text-left flex flex-col gap-2",
)

export function NovaEmptyState({
	onAddMemory,
	onOpenIntegrations,
	isAllSpaces,
	spaceName,
	onSwitchToAllSpaces,
}: NovaEmptyStateProps) {
	const handleInstallChrome = () => {
		window.open(CHROME_EXTENSION_URL, "_blank", "noopener,noreferrer")
	}

	const showSingleSpaceEmpty = !isAllSpaces && onSwitchToAllSpaces

	return (
		<div
			id="nova-empty-state"
			className="min-h-[calc(100svh-12rem)] sm:min-h-[calc(100dvh-12rem)] flex items-center justify-center p-4 sm:p-6 md:p-8 opacity-50 hover:opacity-100 transition-opacity duration-300"
		>
			<div className="max-w-xl w-full flex flex-col items-center text-center">
				<NovaOrb size={80} className="blur-[2px]! mb-4" />
				{isAllSpaces ? (
					<>
						<h2
							className={cn(
								"text-white text-xl md:text-2xl font-medium mb-2",
								dmSansClassName(),
							)}
						>
							Help Nova get to know you
						</h2>
						<p className={cn("text-[#8B8B8B] text-sm mb-6", dmSansClassName())}>
							Add your first memory to get started.
						</p>
					</>
				) : showSingleSpaceEmpty ? (
					<>
						<h2
							className={cn(
								"text-white text-xl md:text-2xl font-medium mb-2",
								dmSansClassName(),
							)}
						>
							{spaceName ? (
								<>
									<span className="text-[#fafafa] font-medium">
										"{spaceName}"
									</span>{" "}
									is empty
								</>
							) : (
								"This space is empty"
							)}
						</h2>
						<p className={cn("text-[#8B8B8B] text-sm mb-3", dmSansClassName())}>
							Your memories may be in another space.
						</p>
						<button
							id="nova-empty-view-all-spaces"
							type="button"
							onClick={onSwitchToAllSpaces}
							className={cn(
								"text-[#4BA0FA] text-sm font-medium flex items-center gap-1 mb-6",
								"hover:text-[#6BB0FF] transition-colors",
								dmSansClassName(),
							)}
						>
							View all spaces
							<ArrowRight className="size-3.5" />
						</button>
					</>
				) : (
					<>
						<h2
							className={cn(
								"text-white text-xl md:text-2xl font-medium mb-2",
								dmSansClassName(),
							)}
						>
							This space is empty
						</h2>
						<p className={cn("text-[#8B8B8B] text-sm mb-6", dmSansClassName())}>
							{spaceName ? (
								<>
									Add memories to{" "}
									<span className="text-[#fafafa] font-medium">
										"{spaceName}"
									</span>{" "}
									to get started.
								</>
							) : (
								"Add memories to this space to get started."
							)}
						</p>
					</>
				)}

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full mb-4">
					<button
						type="button"
						onClick={() => onAddMemory("link")}
						className={cardClass}
					>
						<div className="flex items-center gap-2">
							<Link2 className="size-5 text-[#737373]" />
							<span
								className={cn(
									"font-medium text-white text-sm",
									dmSansClassName(),
								)}
							>
								Save a link
							</span>
						</div>
						<span className="text-[#4BA0FA] text-xs font-medium flex items-center gap-1">
							Add now <ArrowRight className="size-3" />
						</span>
					</button>

					<button
						type="button"
						onClick={() => onAddMemory("note")}
						className={cardClass}
					>
						<div className="flex items-center gap-2">
							<FileText className="size-5 text-[#737373]" />
							<span
								className={cn(
									"font-medium text-white text-sm",
									dmSansClassName(),
								)}
							>
								Write a note
							</span>
						</div>
						<span className="text-[#4BA0FA] text-xs font-medium flex items-center gap-1">
							Add now <ArrowRight className="size-3" />
						</span>
					</button>

					<button
						type="button"
						onClick={handleInstallChrome}
						className={cardClass}
					>
						<div className="flex items-center gap-2">
							<ChromeIcon className="size-5" />
							<span
								className={cn(
									"font-medium text-white text-sm",
									dmSansClassName(),
								)}
							>
								Chrome Extension
							</span>
						</div>
						<span className="text-[#4BA0FA] text-xs font-medium flex items-center gap-1">
							Install <ArrowRight className="size-3" />
						</span>
					</button>
				</div>

				<Button
					variant="ghost"
					size="sm"
					onClick={() => onOpenIntegrations()}
					className={cn(
						"text-[#737373] hover:text-white hover:bg-transparent",
						"flex items-center gap-1.5",
						dmSansClassName(),
					)}
				>
					<Zap className="size-4" />
					See more integrations
					<ArrowRight className="size-3" />
				</Button>
			</div>
		</div>
	)
}
