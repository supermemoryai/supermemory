"use client"

import type { ReactNode } from "react"
import { useAuth } from "@lib/auth-context"
import { $fetch } from "@lib/api"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { useQuery } from "@tanstack/react-query"
import { useCustomer } from "autumn-js/react"
import { useRouter } from "next/navigation"
import {
	ArrowRight,
	FileText,
	LayoutGrid,
	Link2,
	SearchIcon,
	Zap,
} from "lucide-react"
import type { z } from "zod"
import { CHROME_EXTENSION_URL } from "@repo/lib/constants"
import { Button } from "@ui/components/button"
import { Progress } from "@ui/components/progress"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { useProject } from "@/stores"
import { useTokenUsage } from "@/hooks/use-token-usage"
import { formatUsageNumber, tokensToCredits } from "@/lib/billing-utils"
import {
	HighlightsCard,
	type HighlightItem,
} from "@/components/highlights-card"
import { ChromeIcon } from "@/components/integration-icons"
import { analytics } from "@/lib/analytics"
import type { IntegrationParamValue } from "@/lib/search-params"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

const primaryActionClass = cn(
	"rounded-xl border border-[rgba(82,89,102,0.22)] bg-[#14161A] p-3.5 sm:p-4",
	"hover:border-[#3374FF]/45 hover:bg-[#1B1F24]",
	"cursor-pointer text-left transition-colors",
)

const linkChipClass = cn(
	"rounded-lg border border-[rgba(82,89,102,0.22)] bg-[#101318] px-3 py-2.5",
	"text-xs font-medium text-white",
	"hover:border-[#3374FF]/40 hover:bg-[#161A20]",
	"inline-flex items-center justify-center gap-2 cursor-pointer transition-colors",
)

export function DashboardView({
	spaceLabel,
	headerNotice,
	highlights,
	isLoadingHighlights,
	onAddMemory,
	onOpenSearch,
	onOpenIntegrations,
	onOpenPlugins,
	onNavigateToMemories,
	onOpenDocument,
	onHighlightsChat,
	onHighlightsShowRelated,
}: {
	spaceLabel: string
	headerNotice?: ReactNode
	highlights: HighlightItem[]
	isLoadingHighlights: boolean
	onAddMemory: (tab: "note" | "link") => void
	onOpenSearch: () => void
	onOpenIntegrations: (integration?: IntegrationParamValue) => void
	onOpenPlugins: () => void
	onNavigateToMemories: () => void
	onOpenDocument: (document: DocumentWithMemories) => void
	onHighlightsChat: (seed: string) => void
	onHighlightsShowRelated: (query: string) => void
}) {
	const { user } = useAuth()
	const { effectiveContainerTags } = useProject()
	const router = useRouter()
	const autumn = useCustomer()
	const {
		tokensUsed,
		tokensLimit,
		tokensPercent,
		searchesUsed,
		searchesLimit,
		searchesPercent,
		currentPlan,
		hasPaidPlan,
		isLoading: isUsageLoading,
	} = useTokenUsage(autumn)

	const { data: recentsData, isPending: isRecentsPending } = useQuery({
		queryKey: ["dashboard-recents", effectiveContainerTags],
		queryFn: async (): Promise<DocumentsResponse> => {
			const response = await $fetch("@post/documents/documents", {
				body: {
					page: 1,
					limit: 8,
					sort: "createdAt",
					order: "desc",
					containerTags: effectiveContainerTags,
				},
				disableValidation: true,
			})
			if (response.error) {
				throw new Error(response.error?.message || "Failed to fetch documents")
			}
			return response.data as DocumentsResponse
		},
		staleTime: 60 * 1000,
		enabled: !!user,
	})

	const recents = recentsData?.documents ?? []

	const handleInstallChrome = () => {
		window.open(CHROME_EXTENSION_URL, "_blank", "noopener,noreferrer")
	}

	return (
		<div
			className={cn(
				"min-h-0 flex-1 overflow-y-auto p-4 pt-2! pb-32 md:p-6 md:pb-36 md:pr-0",
				dmSansClassName(),
			)}
		>
			<div className="mx-auto w-full max-w-4xl space-y-6 md:space-y-7">
				{headerNotice ? <div className="space-y-2">{headerNotice}</div> : null}
				<header className="space-y-1 border-b border-[#161F2C] pb-5">
					<p className="text-[11px] font-medium uppercase tracking-wide text-[#525D6E]">
						Home
					</p>
					<h1 className="text-xl font-medium tracking-tight text-white md:text-2xl">
						{spaceLabel}
					</h1>
					<p className="max-w-xl text-sm leading-snug text-[#8B8B8B]">
						Add memories, search, and open integrations — everything for this
						space in one place.
					</p>
				</header>

				<section className="space-y-3">
					<h2 className="text-xs font-medium uppercase tracking-wide text-[#525D6E]">
						Quick actions
					</h2>
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
						<button
							type="button"
							onClick={() => onAddMemory("link")}
							className={cn(primaryActionClass, "flex flex-col gap-1.5")}
						>
							<div className="flex items-center gap-2">
								<Link2 className="size-4 shrink-0 text-[#737373] sm:size-5" />
								<span className="text-sm font-medium text-white">
									Save a link
								</span>
							</div>
							<span className="text-[11px] font-medium text-[#4BA0FA]">
								Add now
							</span>
						</button>
						<button
							type="button"
							onClick={() => onAddMemory("note")}
							className={cn(primaryActionClass, "flex flex-col gap-1.5")}
						>
							<div className="flex items-center gap-2">
								<FileText className="size-4 shrink-0 text-[#737373] sm:size-5" />
								<span className="text-sm font-medium text-white">
									Write a note
								</span>
							</div>
							<span className="text-[11px] font-medium text-[#4BA0FA]">
								Add now
							</span>
						</button>
						<button
							type="button"
							onClick={() => {
								analytics.searchOpened({ source: "header" })
								onOpenSearch()
							}}
							className={cn(primaryActionClass, "flex flex-col gap-1.5")}
						>
							<div className="flex items-center gap-2">
								<SearchIcon className="size-4 shrink-0 text-[#737373] sm:size-5" />
								<span className="text-sm font-medium text-white">Search</span>
							</div>
							<span className="text-[11px] font-medium text-[#4BA0FA]">⌘K</span>
						</button>
						<button
							type="button"
							onClick={onNavigateToMemories}
							className={cn(primaryActionClass, "flex flex-col gap-1.5")}
						>
							<div className="flex items-center gap-2">
								<LayoutGrid className="size-4 shrink-0 text-[#737373] sm:size-5" />
								<span className="text-sm font-medium text-white">
									All memories
								</span>
							</div>
							<span className="text-[11px] font-medium text-[#4BA0FA]">
								Browse grid
							</span>
						</button>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<button
							type="button"
							onClick={handleInstallChrome}
							className={linkChipClass}
						>
							<ChromeIcon className="size-4 shrink-0 text-[#737373]" />
							<span className="truncate">Chrome</span>
						</button>
						<button
							type="button"
							onClick={() => onOpenIntegrations()}
							className={linkChipClass}
						>
							<Zap className="size-3.5 shrink-0 text-[#737373]" />
							<span className="truncate">Integrations</span>
						</button>
						<button type="button" onClick={onOpenPlugins} className={linkChipClass}>
							<span className="truncate">Plugins & MCP</span>
						</button>
					</div>
				</section>

				{highlights.length > 0 || isLoadingHighlights ? (
					<section className="space-y-3">
						<h2 className="text-xs font-medium uppercase tracking-wide text-[#525D6E]">
							Highlights
						</h2>
						<HighlightsCard
							items={highlights}
							onChat={onHighlightsChat}
							onShowRelated={onHighlightsShowRelated}
							isLoading={isLoadingHighlights}
						/>
					</section>
				) : null}

				<section className="space-y-3">
					<div className="flex items-center justify-between gap-2">
						<h2 className="text-xs font-medium uppercase tracking-wide text-[#525D6E]">
							Recently saved
						</h2>
						<button
							type="button"
							onClick={onNavigateToMemories}
							className="text-xs font-medium text-[#4BA0FA] hover:text-[#6BB0FF]"
						>
							See all
						</button>
					</div>
					{isRecentsPending ? (
						<p className="text-sm text-[#525D6E]">Loading…</p>
					) : recents.length === 0 ? (
						<p className="text-sm text-[#525D6E]">
							No memories yet — use quick actions above.
						</p>
					) : (
						<ul className="divide-y divide-[#161F2C] rounded-xl border border-[#161F2C] bg-[#080B0F]">
							{recents.map((doc) => (
								<li key={doc.id ?? doc.customId}>
									<button
										type="button"
										onClick={() => onOpenDocument(doc)}
										className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#0D121A]"
									>
										<span className="min-w-0 truncate text-sm text-white">
											{doc.title?.trim() || "Untitled"}
										</span>
										<ArrowRight className="size-4 shrink-0 text-[#525D6E]" />
									</button>
								</li>
							))}
						</ul>
					)}
				</section>

				{!isUsageLoading && (
					<section
						id="dashboard-usage"
						className="flex flex-col gap-3 rounded-xl border border-[#161F2C] bg-[#080B0F]/80 px-4 py-3 sm:flex-row sm:items-center sm:gap-5"
					>
						<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-start sm:justify-center sm:gap-0.5">
							<h2 className="text-xs font-medium text-white">Usage</h2>
							<span className="text-[11px] capitalize leading-none text-[#8B8B8B]">
								{currentPlan}
							</span>
						</div>
						<div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-5">
							<div className="min-w-0 flex-1 space-y-1">
								<div className="flex justify-between text-[10px] text-[#8B8B8B]">
									<span>Credits</span>
									<span>
										{formatUsageNumber(tokensToCredits(tokensUsed))} /{" "}
										{formatUsageNumber(tokensToCredits(tokensLimit))}
									</span>
								</div>
								<Progress value={tokensPercent} className="h-1" />
							</div>
							<div className="min-w-0 flex-1 space-y-1">
								<div className="flex justify-between text-[10px] text-[#8B8B8B]">
									<span>Searches</span>
									<span>
										{formatUsageNumber(searchesUsed)} /{" "}
										{formatUsageNumber(searchesLimit)}
									</span>
								</div>
								<Progress value={searchesPercent} className="h-1" />
							</div>
						</div>
						{!hasPaidPlan ? (
							<Button
								type="button"
								variant="secondary"
								size="sm"
								className="h-8 shrink-0 px-3 text-xs sm:self-center"
								onClick={() => router.push("/settings")}
							>
								Upgrade
							</Button>
						) : null}
					</section>
				)}
			</div>
		</div>
	)
}
