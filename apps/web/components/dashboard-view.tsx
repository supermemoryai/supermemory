"use client"

import type { ReactNode } from "react"
import { useMemo, useState, useEffect } from "react"
import { useAuth } from "@lib/auth-context"
import { $fetch } from "@lib/api"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
	ArrowRight,
	ExternalLink,
	FileText,
	Lightbulb,
	Link2,
	RotateCcw,
	SearchIcon,
	Terminal,
} from "lucide-react"
import type { z } from "zod"
import { CHROME_EXTENSION_URL, RAYCAST_EXTENSION_URL } from "@lib/constants"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { useProject } from "@/stores"
import {
	HighlightsCard,
	type HighlightItem,
} from "@/components/highlights-card"
import { StaticGraphPreview } from "@/components/memory-graph/graph-card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/tooltip"
import { ChromeIcon, RaycastIcon } from "@/components/integration-icons"
import { GoogleDrive, Notion, MCPIcon } from "@ui/assets/icons"
import { analytics } from "@/lib/analytics"
import type { IntegrationParamValue } from "@/lib/search-params"
import { motion, AnimatePresence } from "motion/react"
import {
	usePersonalization,
	type Profession,
} from "@/hooks/use-personalization"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

const fadeUp = {
	initial: { opacity: 0, y: 8 },
	animate: { opacity: 1, y: 0 },
	transition: {
		duration: 0.3,
		ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
	},
}

const CYCLE_INTERVAL_MS = 8_000

const defaultHomeHeadline = (name: string) => `Welcome back, ${name}`

const HOME_HEADLINES: ReadonlyArray<(name: string) => string> = [
	defaultHomeHeadline,
	(name: string) => `Good to see you, ${name}`,
	(name: string) => `${name}, what should we remember next?`,
	(name: string) => `${name}, your saved context is ready.`,
	(name: string) => `${name}, pick up where you left off.`,
	(name: string) => `${name}, search, save, or ask anything here.`,
	(name: string) => `${name}, this space is ready for your next thought.`,
	(name: string) => `${name}, keep the useful bits here.`,
	(name: string) => `${name}, future you will thank you for saving this.`,
	(name: string) => `${name}, your notes, links, and context live here.`,
	(name: string) => `${name}, add something small. Find it later.`,
	(name: string) => `${name}, turn passing context into lasting memory.`,
	(name: string) => `${name}, everything worth remembering can live here.`,
	(name: string) => `${name}, ask a question, save a link, or write a note.`,
	(name: string) => `${name}, build your searchable working memory.`,
]

const PLUGIN_TAGLINES: Record<Profession, Partial<Record<string, string>>> = {
	developer: {
		mcp: "Ask Claude about your saved docs and specs from any IDE",
		chrome: "Save Stack Overflow answers, docs and repos in one click",
		raycast: "Search your tech docs and snippets without context switching",
		notion: "Make your engineering specs and RFCs instantly findable",
		"google-drive": "Query your design docs, code specs and shared files",
	},
	research: {
		mcp: "Ask Claude across your entire reading list and notes",
		chrome: "Clip papers and articles directly while you read",
		raycast: "Pull up citations and notes without breaking your focus",
		notion: "Keep your literature review alongside your saved papers",
		"google-drive": "Index datasets, papers and research docs in one place",
	},
	finance: {
		mcp: "Ask Claude about your saved thesis notes and research",
		chrome: "Save earnings calls, market reports and articles instantly",
		raycast: "Surface your research and models without breaking flow",
		notion: "Make your investment thesis and portfolio notes searchable",
		"google-drive": "Query your financial models, decks and reports instantly",
	},
	design: {
		mcp: "Ask Claude about your saved briefs and design research",
		chrome: "Save inspiration and references as you browse",
		raycast: "Find your saved references and briefs from anywhere",
		notion: "Make your design system docs and briefs searchable",
		"google-drive": "Index your briefs, feedback docs and creative assets",
	},
	legal: {
		mcp: "Ask Claude across your saved contracts and case notes",
		chrome: "Clip case law, statutes and legal articles in one click",
		raycast: "Surface contracts and precedents without leaving your workflow",
		notion: "Keep memos, briefs and case notes instantly searchable",
		"google-drive": "Index contracts, filings and legal research docs",
	},
	marketing: {
		mcp: "Ask Claude across your saved campaigns and research",
		chrome: "Save competitor pages and inspiration as you browse",
		raycast: "Pull up campaign briefs and notes without context switching",
		notion: "Make your content calendar and campaign briefs searchable",
		"google-drive": "Query campaign reports, briefs and creative assets",
	},
	medical: {
		mcp: "Ask Claude across your medical literature and clinical notes",
		chrome: "Save studies and clinical resources while you read",
		raycast: "Surface guidelines and notes without breaking your flow",
		notion: "Keep clinical notes and research in one searchable place",
		"google-drive": "Index guidelines, studies and patient education docs",
	},
	default: {
		mcp: "Ask Claude using your own saved knowledge",
		chrome: "Save any page in one click while you browse",
		raycast: "Search your memory without leaving the keyboard",
		notion: "Make every note and doc instantly searchable",
		"google-drive": "Ask questions across your docs, slides and sheets",
	},
}

export type MemoryOfDay = {
	memories: string[]
	timeLabel: string
	sourceDocumentId: string | null
}

const TIPS: Record<Profession, string[]> = {
	developer: [
		"Use ⌘K to search code snippets and docs by intent, not just keywords",
		"Connect Claude MCP to query your saved knowledge from any IDE",
		"Save GitHub repos and READMEs — ask questions across all of them",
		"Use 'Related' on highlights to find connected technical concepts",
		"Save a Stack Overflow answer once — find it again by what it does",
		"Drop in your last 3 PRs and ask Supermemory for the review patterns",
		"Save your team's RFCs and surface the ones touching your work",
		"Save error messages with their fixes — search by symptom next time",
		"Save framework docs once — semantic search beats Cmd+F across pages",
		"Connect Notion to make your engineering specs instantly findable",
		"Save the docs for libraries you keep forgetting and grep them by intent",
		"Use Daily Brief to resurface the design doc you skimmed last week",
		"Save changelogs as you skim — pull breaking changes back later",
		"Save a debugging session as a note — find it again by the symptom",
	],
	research: [
		"Save papers and ask questions across your entire reading list",
		"Use 'Related' on highlights to surface connected research",
		"Connect Notion to index your notes alongside your papers",
		"Semantic search means you can ask questions, not just search titles",
		"Save a paper once — Supermemory finds it later by what it argued",
		"Drop in 5 papers on a topic and ask for the consensus and disagreements",
		"Save citations as you read — pull them back out by claim",
		"Connect Google Drive to make your dataset notes searchable",
		"Use Daily Brief to resurface a finding you almost forgot",
		"Save a methodology note once — find it next time you need that protocol",
		"Save preprints alongside your reading list — ask what's new since last week",
		"Save quotes with their source — find them later by the idea",
	],
	finance: [
		"Save articles and ask follow-up questions across your research",
		"Connect Notion to keep your investment thesis searchable",
		"Use ⌘K to find specific data points across all your saves",
		"Daily Brief surfaces connections you may have missed",
		"Save earnings call transcripts once — pull guidance back by ticker or theme",
		"Save a thesis once — find it months later by the conviction, not the filename",
		"Drop in three sell-side reports and ask for the disagreements",
		"Save market commentary daily — surface the calls that aged well",
		"Connect Google Drive to query your models without opening them",
		"Save a chart with a note — find it again by what it showed",
		"Save analyst takes — pull them back when the thesis matters again",
	],
	design: [
		"Save inspiration and search by concept — 'minimalist UI' finds the right ones",
		"Use ⌘K to rediscover references by meaning, not filename",
		"Connect Notion to make your briefs and moodboards searchable",
		"Chrome extension saves any page in one click while you browse",
		"Save a screenshot with a note — find it later by what it taught you",
		"Drop in 10 onboarding flows and ask Supermemory for the common patterns",
		"Save your design crits — find the feedback on a specific decision later",
		"Save a brand guideline once — search it by intent, not page number",
		"Connect Google Drive to index your Figma exports and briefs",
		"Use Daily Brief to resurface a reference that fits today's work",
		"Save references by mood — pull them back when the brief calls for it",
	],
	legal: [
		"Save documents and search across them semantically in seconds",
		"Connect Notion to index your memos and case notes together",
		"Use Daily Brief to resurface relevant precedents automatically",
		"Google Drive sync keeps your contracts indexed and queryable",
		"Save a clause once — find it next time by what it does, not where it lives",
		"Save case law as you read — pull precedents back by argument",
		"Drop in three contracts and ask for the diffs in indemnity language",
		"Save regulator updates — surface the ones touching your matter",
		"Save a memo once — search by issue, not by file name",
		"Save deposition notes — find specific testimony by claim later",
	],
	marketing: [
		"Save campaigns and resources — ask what worked across all of them",
		"Chrome extension captures competitor pages in one click",
		"Use 'Related' to find similar campaigns in your archive",
		"Connect Notion to make your campaign briefs instantly searchable",
		"Save a competitor's landing page — surface their positioning later by claim",
		"Drop in five launch retros and ask for the patterns that drove growth",
		"Save ad references and find them by mood, not by URL",
		"Save your weekly metrics notes — pull trends back by quarter",
		"Use Daily Brief to resurface a positioning note from last campaign",
		"Save creative briefs — find similar ones when starting a new one",
	],
	medical: [
		"Save studies and query across your entire reading list",
		"Connect Notion to keep clinical notes alongside research",
		"Use ⌘K to find specific findings across hundreds of papers",
		"Daily Brief surfaces relevant research from your saves automatically",
		"Save a guideline once — pull it back by clinical scenario",
		"Drop in three trials and ask Supermemory for the methodological diffs",
		"Save case reports — surface them later by symptom or finding",
		"Connect Google Drive to index protocols across your team",
		"Save teaching points from rounds — find them by topic next month",
		"Save differentials as notes — pull them back when the presentation repeats",
	],
	default: [
		"Use ⌘K to search by meaning — ask questions, not just keywords",
		"Daily Brief surfaces insights from your saves each morning",
		"Chrome extension saves any page in one click while you browse",
		"Connect integrations to make all your knowledge searchable here",
		"Save a page once — find it later by what it said, not its title",
		"Save the thing you'd normally bookmark — find it again by intent",
		"Drop in 10 articles on a topic and ask for the through-line",
		"Save an idea — Supermemory connects it to your earlier ones",
		"Use Daily Brief to resurface something useful you forgot you saved",
		"Save a thread you liked — pull it back later by what it was about",
	],
}

const PROFESSION_PLUGIN_ORDER: Record<Profession, string[]> = {
	developer: ["mcp", "chrome", "raycast", "notion", "google-drive"],
	research: ["notion", "chrome", "google-drive", "mcp", "raycast"],
	finance: ["notion", "google-drive", "chrome", "mcp", "raycast"],
	design: ["chrome", "notion", "raycast", "mcp", "google-drive"],
	legal: ["notion", "google-drive", "chrome", "mcp", "raycast"],
	marketing: ["chrome", "notion", "raycast", "google-drive", "mcp"],
	medical: ["notion", "chrome", "google-drive", "mcp", "raycast"],
	default: ["mcp", "chrome", "notion", "raycast", "google-drive"],
}

const PROFESSION_LABELS: {
	value: Exclude<Profession, "default">
	label: string
}[] = [
	{ value: "developer", label: "Developer" },
	{ value: "research", label: "Researcher" },
	{ value: "finance", label: "Finance" },
	{ value: "design", label: "Designer" },
	{ value: "legal", label: "Legal" },
	{ value: "marketing", label: "Marketing" },
	{ value: "medical", label: "Medical" },
]

// Static plugin metadata — shared between PluginPromoCard and RecommendedPluginsCard
const PLUGIN_STATIC = [
	{
		id: "mcp",
		name: "Claude MCP",
		Icon: MCPIcon,
		accentColor: "#D4A853",
		tagline: "Ask Claude from your own saved knowledge, not just training data",
		cta: "Set up",
	},
	{
		id: "chrome",
		name: "Chrome Extension",
		Icon: ChromeIcon,
		accentColor: "#4BA0FA",
		tagline: "Save any page in one click — findable by meaning, forever",
		cta: "Install",
	},
	{
		id: "raycast",
		name: "Raycast",
		Icon: RaycastIcon,
		accentColor: "#FF6363",
		tagline: "Search your entire memory without leaving your keyboard",
		cta: "Install",
	},
	{
		id: "notion",
		name: "Notion",
		Icon: Notion,
		accentColor: "#FAFAFA",
		tagline: "Sync your workspace and make every note searchable everywhere",
		cta: "Connect",
	},
	{
		id: "google-drive",
		name: "Google Drive",
		Icon: GoogleDrive,
		accentColor: "#4BA0FA",
		tagline:
			"Index your Drive files — ask questions across docs, slides, sheets",
		cta: "Connect",
	},
] as const

function RecommendedPluginsCard({
	profession,
	setProfession,
	connectedProviders,
	hasMcp,
	onOpenPlugins,
	onOpenIntegrations,
}: {
	profession: Profession
	setProfession: (p: Profession) => void
	connectedProviders: Set<string>
	hasMcp: boolean
	onOpenPlugins: () => void
	onOpenIntegrations: (integration?: IntegrationParamValue) => void
}) {
	const [isEditing, setIsEditing] = useState(false)
	useEffect(() => {
		setIsEditing(false)
	}, [])
	const showPicker = profession === "default" || isEditing
	const allPlugins = useMemo(() => {
		const onClicks: Record<string, () => void> = {
			mcp: onOpenPlugins,
			chrome: () =>
				window.open(CHROME_EXTENSION_URL, "_blank", "noopener,noreferrer"),
			raycast: () =>
				window.open(RAYCAST_EXTENSION_URL, "_blank", "noopener,noreferrer"),
			notion: () => onOpenIntegrations("notion"),
			"google-drive": () => onOpenIntegrations("google-drive"),
		}
		const connected: Record<string, boolean> = {
			mcp: hasMcp,
			chrome: false,
			raycast: false,
			notion: connectedProviders.has("notion"),
			"google-drive": connectedProviders.has("google-drive"),
		}
		return PLUGIN_STATIC.map((p) => ({
			...p,
			connected: connected[p.id] ?? false,
			onClick: onClicks[p.id]!,
		}))
	}, [hasMcp, connectedProviders, onOpenPlugins, onOpenIntegrations])

	const order = PROFESSION_PLUGIN_ORDER[profession]
	const suggestions = useMemo(
		() =>
			order
				.map((id) => allPlugins.find((p) => p.id === id))
				.filter((p): p is NonNullable<typeof p> => !!p && !p.connected)
				.slice(0, 3),
		[order, allPlugins],
	)

	return (
		<div
			className={cn(
				"bg-surface-card/60 backdrop-blur-md rounded-xl px-3 py-2 flex flex-col gap-1 shadow-[0_12px_40px_rgba(0,0,0,0.22)]",
				dmSansClassName(),
			)}
		>
			{showPicker ? (
				<div className="px-1 py-2 flex flex-col gap-2.5">
					<p className="text-[11px] text-fg-muted">
						{isEditing ? "Change your field:" : "What's your field?"}
					</p>
					<div className="flex flex-wrap gap-1.5">
						{PROFESSION_LABELS.map(({ value, label }) => (
							<button
								key={value}
								type="button"
								onClick={() => {
									setProfession(value)
									setIsEditing(false)
								}}
								className={cn(
									"rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer",
									profession === value
										? "border-[#4BA0FA]/55 bg-[#3374FF]/15 text-[#8BC6FF]"
										: "border-surface-border text-fg-subtle hover:border-[#4BA0FA]/40 hover:text-[#6BB0FF]",
								)}
							>
								{label}
							</button>
						))}
					</div>
					{isEditing && (
						<button
							type="button"
							onClick={() => setIsEditing(false)}
							className="text-[10px] text-fg-faint hover:text-fg-muted transition-colors text-left cursor-pointer"
						>
							Cancel
						</button>
					)}
				</div>
			) : suggestions.length === 0 ? (
				<div className="flex items-center justify-center py-4">
					<p className="text-[11px] text-fg-subtle text-center">
						You're all set ✓
					</p>
				</div>
			) : (
				<>
					<ul>
						{suggestions.map((plugin) => (
							<li key={plugin.id}>
								<button
									type="button"
									onClick={plugin.onClick}
									className="group w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-hover transition-colors cursor-pointer"
								>
									<plugin.Icon className="size-4 shrink-0 text-fg-subtle" />
									<div className="flex-1 min-w-0 text-left">
										<p className="text-[12px] text-fg-secondary group-hover:text-white transition-colors leading-tight">
											{plugin.name}
										</p>
										<p className="text-[11px] text-fg-subtle leading-tight mt-0.5">
											{PLUGIN_TAGLINES[profession][plugin.id] ?? plugin.tagline}
										</p>
									</div>
									<span className="shrink-0 text-[10px] font-medium text-[#5EA8FF] group-hover:text-[#8BC6FF] transition-colors">
										{plugin.cta} →
									</span>
								</button>
							</li>
						))}
					</ul>
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="text-left px-2 pb-1 text-[10px] text-fg-faint hover:text-fg-muted transition-colors cursor-pointer"
					>
						Not a{" "}
						{PROFESSION_LABELS.find(
							(p) => p.value === profession,
						)?.label.toLowerCase()}
						? Change →
					</button>
				</>
			)}
		</div>
	)
}

function MemoryOfDayCard({ data }: { data: MemoryOfDay }) {
	const router = useRouter()

	const memory = data.memories[0]

	if (!memory) return null

	const href = data.sourceDocumentId
		? `/?view=list&doc=${encodeURIComponent(data.sourceDocumentId)}`
		: "/?view=list"

	return (
		<button
			type="button"
			onClick={() => router.push(href)}
			className={cn(
				"group size-full text-left bg-surface-card/60 backdrop-blur-md rounded-[18px] p-3 flex flex-col justify-between transition-colors cursor-pointer shadow-[0_12px_40px_rgba(0,0,0,0.22)]",
				dmSansClassName(),
			)}
		>
			<div className="flex flex-col gap-2.5">
				<span className="self-start text-[9px] font-semibold tracking-[0.12em] uppercase text-[#8BC6FF] bg-[#4BA0FA]/16 rounded-full px-2 py-0.5">
					{data.timeLabel}
				</span>
				<p className="text-[12px] text-fg-secondary leading-relaxed line-clamp-4">
					{memory}
				</p>
			</div>

			<span className="text-[10px] text-fg-faint group-hover:text-fg-muted transition-colors">
				View memories →
			</span>
		</button>
	)
}

function PluginPromoCard({
	hasMcp,
	connectedProviders,
	onOpenPlugins,
	onOpenIntegrations,
}: {
	hasMcp: boolean
	connectedProviders: Set<string>
	onOpenPlugins: () => void
	onOpenIntegrations: (integration?: IntegrationParamValue) => void
}) {
	const plugins = useMemo(() => {
		const onClicks: Record<string, () => void> = {
			mcp: onOpenPlugins,
			chrome: () =>
				window.open(CHROME_EXTENSION_URL, "_blank", "noopener,noreferrer"),
			raycast: () =>
				window.open(RAYCAST_EXTENSION_URL, "_blank", "noopener,noreferrer"),
			notion: () => onOpenIntegrations("notion"),
			"google-drive": () => onOpenIntegrations("google-drive"),
		}
		const connected: Record<string, boolean> = {
			mcp: hasMcp,
			chrome: false,
			raycast: false,
			notion: connectedProviders.has("notion"),
			"google-drive": connectedProviders.has("google-drive"),
		}
		return PLUGIN_STATIC.map((p) => ({
			...p,
			connected: connected[p.id] ?? false,
			onClick: onClicks[p.id]!,
		})).filter((p) => !p.connected)
	}, [hasMcp, connectedProviders, onOpenPlugins, onOpenIntegrations])

	const [index, setIndex] = useState(0)

	// Reset when the plugins list changes length (e.g., user connects one)
	useEffect(() => {
		setIndex(0)
	}, [])

	useEffect(() => {
		if (plugins.length <= 1) return
		const id = setInterval(
			() => setIndex((i) => (i + 1) % plugins.length),
			CYCLE_INTERVAL_MS,
		)
		return () => clearInterval(id)
	}, [plugins.length])

	const safeIndex = Math.min(index, plugins.length - 1)
	const plugin = plugins[safeIndex]

	return (
		<div
			className={cn(
				"bg-surface-card/60 backdrop-blur-md rounded-[18px] p-3 flex flex-col justify-between gap-3 h-full shadow-[0_12px_40px_rgba(0,0,0,0.22)]",
				dmSansClassName(),
			)}
		>
			{plugin ? (
				<>
					<AnimatePresence mode="wait">
						<motion.div
							key={plugin.id}
							initial={{ opacity: 0, x: 16 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -16 }}
							transition={{ duration: 0.3 }}
							className="flex flex-col gap-3 flex-1"
						>
							<div className="flex items-center justify-between">
								<plugin.Icon className="size-7 shrink-0" />
								{plugins.length > 1 && (
									<div className="flex gap-1">
										{plugins.map((_, i) => (
											<button
												key={i}
												type="button"
												onClick={() => setIndex(i)}
												className={cn(
													"rounded-full transition-all cursor-pointer",
													i === safeIndex
														? "w-3 h-1 bg-[#4BA0FA]"
														: "size-1 bg-[#2A3040] hover:bg-[#3A4455]",
												)}
											/>
										))}
									</div>
								)}
							</div>
							<div className="flex flex-col gap-1">
								<p className="text-[11px] font-semibold text-fg-primary leading-tight">
									{plugin.name}
								</p>
								<p className="text-[10px] text-fg-muted leading-normal">
									{plugin.tagline}
								</p>
							</div>
						</motion.div>
					</AnimatePresence>

					<button
						type="button"
						onClick={plugin.onClick}
						className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-1.5 text-[11px] font-medium text-[#6BB0FF] hover:text-white hover:bg-surface-hover transition-colors cursor-pointer text-left flex items-center justify-between group"
						style={{ boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.5)" }}
					>
						<span>{plugin.cta}</span>
						<ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
					</button>
				</>
			) : (
				<div className="flex flex-col items-center justify-center h-full gap-1.5 text-center">
					<Terminal className="size-4 text-fg-faint" />
					<p className="text-[10px] text-fg-subtle">
						All integrations connected
					</p>
				</div>
			)}
		</div>
	)
}

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
	onNavigateToGraph,
	onOpenDocument,
	onHighlightsChat,
	onHighlightsShowRelated,
	onResetHighlights,
	memoryOfDay,
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
	onNavigateToGraph: () => void
	onOpenDocument: (document: DocumentWithMemories) => void
	onHighlightsChat: (highlightContent: string, userReply: string) => void
	onHighlightsShowRelated: (query: string) => void
	onResetHighlights: () => void
	memoryOfDay: MemoryOfDay | null
}) {
	const { user } = useAuth()
	const { effectiveContainerTags } = useProject()
	const _router = useRouter()
	const { data: recentsData } = useQuery({
		queryKey: ["dashboard-recents", effectiveContainerTags],
		queryFn: async (): Promise<DocumentsResponse> => {
			const response = await $fetch("@post/documents/documents", {
				body: {
					page: 1,
					limit: 5,
					sort: "createdAt",
					order: "desc",
					containerTags: effectiveContainerTags,
				},
				disableValidation: true,
			})
			if (response.error) throw new Error(response.error?.message)
			return response.data as DocumentsResponse
		},
		staleTime: 60 * 1000,
		enabled: !!user,
	})

	const { data: connections = [] } = useQuery({
		queryKey: ["connections-list", effectiveContainerTags],
		queryFn: async () => {
			const response = await $fetch("@post/connections/list", {
				body: { containerTags: effectiveContainerTags },
			})
			if (response.error) return []
			return response.data ?? []
		},
		staleTime: 5 * 60 * 1000,
		enabled: !!user,
	})

	const { data: mcpData } = useQuery({
		queryKey: ["mcp-status"],
		queryFn: async () => {
			const response = await $fetch("@get/mcp/has-login")
			return response.data ?? { previousLogin: false }
		},
		staleTime: 5 * 60 * 1000,
		enabled: !!user,
	})

	const {
		copy: personalizedCopy,
		profession,
		setProfession,
	} = usePersonalization()

	const recents = recentsData?.documents ?? []
	const totalMemories = recentsData?.pagination?.totalItems ?? 0
	const hasMcp = mcpData?.previousLogin ?? false
	const connectedProviders = new Set(connections.map((c) => c.provider))
	const firstName = useMemo(() => {
		const displayName =
			user?.name?.trim() || user?.email?.split("@")[0] || "there"
		return displayName.split(/\s+/)[0] || "there"
	}, [user?.email, user?.name])
	const [headlineIndex, setHeadlineIndex] = useState(0)

	useEffect(() => {
		setHeadlineIndex(Math.floor(Math.random() * HOME_HEADLINES.length))
	}, [])

	const homeHeadline = (HOME_HEADLINES[headlineIndex] ?? defaultHomeHeadline)(
		firstName,
	)

	const [tipIndex, setTipIndex] = useState(0)

	useEffect(() => {
		setTipIndex(Math.floor(Math.random() * TIPS[profession].length))
	}, [profession])

	const tip = useMemo(() => {
		const tips = TIPS[profession]
		return tips[tipIndex % tips.length] ?? tips[0]
	}, [profession, tipIndex])

	return (
		<div
			className={cn(
				"min-h-0 flex-1 overflow-y-auto p-4 pt-2! pb-20 md:p-6 md:pb-36 md:pr-0",
				dmSansClassName(),
			)}
		>
			<div className="mx-auto w-full max-w-4xl space-y-4 md:space-y-5">
				{headerNotice ? <div className="space-y-2">{headerNotice}</div> : null}

				{/* Header */}
				<motion.header
					{...fadeUp}
					transition={{ ...fadeUp.transition, delay: 0 }}
					className="flex items-end justify-between gap-4 border-b border-surface-border pb-4"
				>
					<div className="space-y-0.5">
						<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-fg-faint">
							Home
						</p>
						<h1
							className="max-w-2xl text-xl font-medium tracking-tight text-white md:text-2xl"
							title={spaceLabel}
						>
							{homeHeadline}
						</h1>
					</div>
					{totalMemories > 0 && (
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={onNavigateToGraph}
									className="group relative shrink-0 w-[140px] h-[56px] rounded-xl overflow-hidden border border-surface-border hover:border-[#3A4A63] transition-all bg-surface-card hover:scale-[1.02]"
									aria-label="Open graph view"
								>
									<StaticGraphPreview
										documentCount={totalMemories}
										memoryCount={totalMemories * 6}
										width={140}
										height={56}
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom" className={dmSansClassName()}>
								View graph
							</TooltipContent>
						</Tooltip>
					)}
				</motion.header>

				{/* Daily Brief — hero */}
				<motion.section
					{...fadeUp}
					transition={{ ...fadeUp.transition, delay: 0.05 }}
					className="space-y-2"
				>
					<div className="flex items-center gap-1.5">
						<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-fg-faint">
							Daily brief
						</p>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={onResetHighlights}
									className="text-fg-faint hover:text-fg-muted transition-colors cursor-pointer"
									aria-label="Refresh daily brief"
								>
									<RotateCcw className="size-3" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom" className={dmSansClassName()}>
								Refresh daily brief
							</TooltipContent>
						</Tooltip>
					</div>
					<div className="flex gap-3 items-stretch">
						<div className="flex-[4] min-w-0">
							<HighlightsCard
								items={highlights}
								onChat={onHighlightsChat}
								onShowRelated={onHighlightsShowRelated}
								isLoading={isLoadingHighlights}
							/>
						</div>
						<div className="flex-[2] hidden sm:block min-w-0">
							{memoryOfDay ? (
								<MemoryOfDayCard data={memoryOfDay} />
							) : (
								<PluginPromoCard
									hasMcp={hasMcp}
									connectedProviders={connectedProviders}
									onOpenPlugins={onOpenPlugins}
									onOpenIntegrations={onOpenIntegrations}
								/>
							)}
						</div>
					</div>
				</motion.section>

				{/* Actions + connection status — single unified row */}
				<motion.section
					{...fadeUp}
					transition={{ ...fadeUp.transition, delay: 0.1 }}
					className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
				>
					{/* Quick actions */}
					<div className="grid grid-cols-3 gap-1 [&>span]:hidden sm:-mx-2.5 sm:flex sm:items-center sm:gap-0.5 sm:[&>span]:inline">
						<button
							type="button"
							onClick={() => onAddMemory("link")}
							className="flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] leading-none text-fg-subtle hover:bg-surface-hover hover:text-white transition-colors cursor-pointer sm:gap-1.5 sm:px-2.5 sm:text-sm sm:leading-tight"
						>
							<Link2 className="size-3.5 shrink-0" />
							<span className="min-w-0 truncate whitespace-nowrap text-center sm:text-left">
								{personalizedCopy.saveLink}
							</span>
						</button>
						<span className="text-[#3A4455] select-none">·</span>
						<button
							type="button"
							onClick={() => onAddMemory("note")}
							className="flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] leading-none text-fg-subtle hover:bg-surface-hover hover:text-white transition-colors cursor-pointer sm:gap-1.5 sm:px-2.5 sm:text-sm sm:leading-tight"
						>
							<FileText className="size-3.5 shrink-0" />
							<span className="min-w-0 truncate whitespace-nowrap text-center sm:text-left">
								{personalizedCopy.writeNote}
							</span>
						</button>
						<span className="text-[#3A4455] select-none">·</span>
						<button
							type="button"
							onClick={() => {
								analytics.searchOpened({ source: "header" })
								onOpenSearch()
							}}
							className="flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] leading-none text-fg-subtle hover:bg-surface-hover hover:text-white transition-colors cursor-pointer sm:gap-1.5 sm:px-2.5 sm:text-sm sm:leading-tight"
						>
							<SearchIcon className="size-3.5 shrink-0" />
							<span className="min-w-0 truncate whitespace-nowrap text-center sm:text-left">
								Search
							</span>
						</button>
					</div>

					{/* Tip of the day */}
					<p className="hidden sm:flex items-center gap-1.5 text-[11px] text-fg-subtle min-w-0 overflow-hidden">
						<Lightbulb className="size-3 shrink-0 text-[#3374FF]" />
						<span className="truncate">{tip}</span>
					</p>
				</motion.section>

				{/* Recently saved + Suggested for you */}
				<motion.section
					{...fadeUp}
					transition={{ ...fadeUp.transition, delay: 0.15 }}
					className="space-y-2"
				>
					{recents.length > 0 ? (
						<>
							{/* Shared header row — both labels aligned */}
							<div className="flex gap-4">
								<div className="flex-[3] min-w-0">
									<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-fg-faint">
										Recently saved
									</p>
								</div>
								<div className="flex-[2] min-w-0 hidden sm:block">
									<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-fg-faint">
										Suggested for you
									</p>
								</div>
							</div>

							{/* Content row */}
							<div className="flex gap-4 items-start">
								<ul className="flex-[3] min-w-0 space-y-0.5">
									{recents.map((doc) => {
										const isLink = !!doc.url
										return (
											<li key={doc.id ?? doc.customId}>
												<button
													type="button"
													onClick={() => onOpenDocument(doc)}
													className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
												>
													<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-card ring-1 ring-surface-border group-hover:bg-[#182333] transition-colors">
														{isLink ? (
															<ExternalLink className="size-3 text-fg-subtle" />
														) : (
															<FileText className="size-3 text-fg-subtle" />
														)}
													</div>
													<span className="min-w-0 flex-1 truncate text-sm text-fg-muted group-hover:text-white transition-colors">
														{doc.title?.trim() || "Untitled"}
													</span>
													<ArrowRight className="size-3.5 shrink-0 text-fg-faint group-hover:text-fg-muted transition-colors" />
												</button>
											</li>
										)
									})}
								</ul>

								<div className="flex-[2] min-w-0 hidden sm:block">
									<RecommendedPluginsCard
										profession={profession}
										setProfession={setProfession}
										connectedProviders={connectedProviders}
										hasMcp={hasMcp}
										onOpenPlugins={onOpenPlugins}
										onOpenIntegrations={onOpenIntegrations}
									/>
								</div>
							</div>
						</>
					) : (
						/* No recents yet — show suggestions full-width */
						<>
							<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-fg-faint">
								Suggested for you
							</p>
							<div className="max-w-sm">
								<RecommendedPluginsCard
									profession={profession}
									setProfession={setProfession}
									connectedProviders={connectedProviders}
									hasMcp={hasMcp}
									onOpenPlugins={onOpenPlugins}
									onOpenIntegrations={onOpenIntegrations}
								/>
							</div>
						</>
					)}
				</motion.section>
			</div>
		</div>
	)
}
