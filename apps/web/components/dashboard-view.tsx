"use client"

import type { ReactNode } from "react"
import { useMemo, useState, useEffect } from "react"
import { useAuth } from "@lib/auth-context"
import { $fetch } from "@lib/api"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
	ArrowRight,
	ExternalLink,
	FileText,
	Lightbulb,
	Link2,
	Plug,
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

// Plugin catalog for tool usage display - maps plugin IDs to display names and icons
const PLUGIN_DISPLAY_CATALOG: Record<
	string,
	{ name: string; icon: string | null; type: "Plugin" }
> = {
	claude_code: {
		name: "Claude Code",
		icon: "/images/plugins/claude-code.svg",
		type: "Plugin",
	},
	opencode: {
		name: "OpenCode",
		icon: "/images/plugins/opencode.svg",
		type: "Plugin",
	},
	openclaw: {
		name: "OpenClaw",
		icon: "/images/plugins/openclaw.svg",
		type: "Plugin",
	},
	hermes: {
		name: "Hermes",
		icon: "/images/plugins/hermes.svg",
		type: "Plugin",
	},
	codex: {
		name: "OpenAI Codex",
		icon: "/mcp-supported-tools/codex.png",
		type: "Plugin",
	},
}

// Types for tool usage
interface ToolUsageItem {
	id: string
	name: string
	type: "Plugin" | "MCP"
	icon: string | null
	lastUsedAt: Date | null
	hasBeenUsed: boolean
	connectedAt: Date | null
	lastDocumentTitle: string | null
	lastDocumentId: string | null
	lastDocumentPreview: string | null
	lastDocument: DocumentWithMemories | null
}

type ToolUsageApiKey = {
	id: string
	name: string
	createdAt: string
	lastRequest: string | null
	metadata: string
}

function toValidDate(value: string | Date | null | undefined): Date | null {
	if (!value) return null
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

function compactText(value: string): string {
	return value.replace(/\s+/g, " ").trim()
}

function getDocumentText(document: DocumentWithMemories): string {
	return typeof document.content === "string" ? document.content : ""
}

function getPluginClientFromDocument(
	document: DocumentWithMemories,
): string | null {
	const metadata =
		document.metadata && typeof document.metadata === "object"
			? document.metadata
			: {}
	const metadataClient =
		typeof metadata.sm_client === "string"
			? metadata.sm_client
			: typeof metadata.sm_internal_plugin_client === "string"
				? metadata.sm_internal_plugin_client
				: typeof metadata.sm_internal_mcp_client_name === "string"
					? metadata.sm_internal_mcp_client_name
					: null
	if (metadataClient) return metadataClient.toLowerCase()

	const content = getDocumentText(document)
	const title = document.title ?? ""
	if (
		/\[Session\s+[^\]]+\]/i.test(content) ||
		/\[SAVE:[^\]]+\]/i.test(content)
	) {
		return "codex"
	}
	if (/\bCodex\b/i.test(title)) return "codex"

	return null
}

function getDocumentPreview(document: DocumentWithMemories): string | null {
	const summary =
		typeof document.summary === "string" ? compactText(document.summary) : ""
	if (summary) return summary

	const content = getDocumentText(document)
	if (!content) return document.title?.trim() || null

	const transcriptTurns = Array.from(
		content.matchAll(
			/\d+\.\s+\[(user|assistant)\]\s*([\s\S]*?)(?=\d+\.\s+\[(?:user|assistant|tool|system)\]|---|\[\/?[A-Za-z]|$)/gi,
		),
	)
		.slice(0, 2)
		.map((match) => {
			const role = match[1] === "assistant" ? "Assistant" : "You"
			const text = compactText(match[2] ?? "")
			return text ? `${role}: ${text}` : null
		})
		.filter(Boolean)

	if (transcriptTurns.length > 0) return transcriptTurns.join(" · ")

	const cleaned = compactText(
		content
			.replace(/\[Session\s+[^\]]+\]/gi, "")
			.replace(/\[SAVE:[^\]]+\]/gi, "")
			.replace(/\[\/SAVE\]/gi, ""),
	)
	return cleaned || document.title?.trim() || null
}

function getToolDocumentTitle(document: DocumentWithMemories): string {
	return document.title?.trim() || "Recent conversation"
}

// Parse API keys to extract tool usage data
function parseToolUsage(
	apiKeys: ToolUsageApiKey[],
	recentMcpDocuments: DocumentWithMemories[] = [],
): ToolUsageItem[] {
	const toolMap = new Map<string, ToolUsageItem>()
	let latestMcpClientName: string | null = null
	let latestMcpDocumentAt: Date | null = null

	const latestDocPerPlugin = new Map<
		string,
		{
			title: string
			id: string
			at: Date
			preview: string | null
			document: DocumentWithMemories
		}
	>()

	for (const key of apiKeys) {
		let meta: Record<string, unknown> = {}
		try {
			meta = key.metadata ? JSON.parse(key.metadata) : {}
		} catch {
			continue
		}

		const smType = meta.sm_type as string | undefined
		const smClient = meta.sm_client as string | undefined
		const smSource = meta.sm_source as string | undefined
		const smKind = meta.sm_kind as string | undefined

		// Plugin keys
		if (smType === "plugin_auth" && smClient) {
			const catalog = PLUGIN_DISPLAY_CATALOG[smClient]
			const existingItem = toolMap.get(`plugin_${smClient}`)
			const lastUsed =
				toValidDate(key.lastRequest) ?? toValidDate(key.createdAt)
			const existingLastUsed = existingItem?.lastUsedAt

			// Keep the most recent usage
			if (
				!existingItem ||
				(lastUsed &&
					(!existingLastUsed ||
						lastUsed.getTime() > existingLastUsed.getTime()))
			) {
				toolMap.set(`plugin_${smClient}`, {
					id: `plugin_${smClient}`,
					name: catalog?.name ?? smClient,
					type: "Plugin",
					icon: catalog?.icon ?? null,
					lastUsedAt: lastUsed,
					hasBeenUsed: !!key.lastRequest,
					connectedAt: toValidDate(key.createdAt),
					lastDocumentTitle: null,
					lastDocumentId: null,
					lastDocumentPreview: null,
					lastDocument: null,
				})
			}
		}

		// MCP keys
		if (smSource === "mcp" || smKind === "mcp_oauth_exchange") {
			const existingItem = toolMap.get("mcp")
			const lastUsed =
				toValidDate(key.lastRequest) ?? toValidDate(key.createdAt)
			const existingLastUsed = existingItem?.lastUsedAt

			// Keep the most recent usage
			if (
				!existingItem ||
				(lastUsed &&
					(!existingLastUsed ||
						lastUsed.getTime() > existingLastUsed.getTime()))
			) {
				toolMap.set("mcp", {
					id: "mcp",
					name: "Supermemory MCP",
					type: "MCP",
					icon: null,
					lastUsedAt: lastUsed,
					hasBeenUsed: !!key.lastRequest,
					connectedAt: toValidDate(key.createdAt),
					lastDocumentTitle: null,
					lastDocumentId: null,
					lastDocumentPreview: null,
					lastDocument: null,
				})
			}
		}
	}

	for (const doc of recentMcpDocuments) {
		const metadata =
			doc.metadata && typeof doc.metadata === "object" ? doc.metadata : {}
		const clientName =
			typeof metadata.sm_internal_mcp_client_name === "string"
				? metadata.sm_internal_mcp_client_name
				: null
		const pluginClient = getPluginClientFromDocument(doc)
		const isMcpDocument =
			doc.source === "mcp" ||
			metadata.sm_internal_event_from === "mcp" ||
			!!clientName
		const isPluginDocument = !!pluginClient && pluginClient !== "mcp"

		if (!isMcpDocument && !isPluginDocument) continue

		const createdAt = toValidDate(doc.createdAt)
		if (
			isMcpDocument &&
			clientName &&
			clientName !== "unknown" &&
			(!latestMcpDocumentAt ||
				(createdAt && createdAt.getTime() > latestMcpDocumentAt.getTime()))
		) {
			latestMcpClientName = clientName
			latestMcpDocumentAt = createdAt
		}

		if (isMcpDocument) {
			const existingItem = toolMap.get("mcp")
			const existingLastUsed = existingItem?.lastUsedAt
			if (
				!existingItem ||
				(createdAt &&
					(!existingLastUsed ||
						createdAt.getTime() > existingLastUsed.getTime()))
			) {
				toolMap.set("mcp", {
					id: "mcp",
					name:
						clientName && clientName !== "unknown"
							? clientName
							: "Supermemory MCP",
					type: "MCP",
					icon: null,
					lastUsedAt: createdAt,
					hasBeenUsed: true,
					connectedAt: toolMap.get("mcp")?.connectedAt ?? null,
					lastDocumentTitle: doc.title?.trim() || null,
					lastDocumentId: doc.id ?? null,
					lastDocumentPreview: getDocumentPreview(doc),
					lastDocument: doc,
				})
			}
		}

		if (pluginClient && createdAt && doc.id) {
			const existing = latestDocPerPlugin.get(pluginClient)
			if (!existing || createdAt.getTime() > existing.at.getTime()) {
				latestDocPerPlugin.set(pluginClient, {
					title: getToolDocumentTitle(doc),
					id: doc.id,
					at: createdAt,
					preview: getDocumentPreview(doc),
					document: doc,
				})
			}
		}
	}

	if (latestMcpClientName) {
		const existingItem = toolMap.get("mcp")
		if (existingItem) {
			toolMap.set("mcp", {
				...existingItem,
				name: latestMcpClientName,
			})
		}
	}

	// Attach latest document info to plugin items where available from MCP documents
	for (const [, item] of toolMap) {
		if (item.type === "Plugin" && !item.lastDocumentTitle) {
			const pluginId = item.id.replace(/^plugin_/, "")
			const docInfo = latestDocPerPlugin.get(pluginId)
			if (docInfo) {
				item.lastDocumentTitle = docInfo.title
				item.lastDocumentId = docInfo.id
				item.lastDocumentPreview = docInfo.preview
				item.lastDocument = docInfo.document
			}
		}
	}

	// Sort by lastUsedAt (most recent first), then by hasBeenUsed
	return Array.from(toolMap.values()).sort((a, b) => {
		// Items that have been used come first
		if (a.hasBeenUsed !== b.hasBeenUsed) {
			return a.hasBeenUsed ? -1 : 1
		}
		// Then sort by recency
		if (!a.lastUsedAt && !b.lastUsedAt) return 0
		if (!a.lastUsedAt) return 1
		if (!b.lastUsedAt) return -1
		return b.lastUsedAt.getTime() - a.lastUsedAt.getTime()
	})
}

// Format relative time for tool usage
function formatToolUsageTime(date: Date | null, hasBeenUsed: boolean): string {
	if (!hasBeenUsed) return "Never used"
	if (!date) return "Connected"
	const diffMs = Date.now() - date.getTime()
	const diffMins = Math.floor(diffMs / (1000 * 60))
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
	const diffDays = Math.floor(diffHours / 24)
	if (diffMins < 1) return "Just now"
	if (diffMins < 60) return `${diffMins}m ago`
	if (diffHours < 24) return `${diffHours}h ago`
	if (diffDays === 1) return "Yesterday"
	if (diffDays < 7) return `${diffDays}d ago`
	return date.toLocaleDateString()
}

function ToolUsageRecentRow({
	item,
	onOpenPlugins,
	onOpenToolDocument,
}: {
	item: ToolUsageItem
	onOpenPlugins: () => void
	onOpenToolDocument: (document: DocumentWithMemories) => void
}) {
	return (
		<li>
			<button
				type="button"
				onClick={() => {
					if (item.lastDocument) {
						onOpenToolDocument(item.lastDocument)
						return
					}
					onOpenPlugins()
				}}
				className="group flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-all hover:bg-surface-hover hover:py-2.5"
			>
				<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-card ring-1 ring-surface-border group-hover:bg-[#182333] transition-colors">
					{item.icon ? (
						<Image
							src={item.icon}
							alt={item.name}
							width={14}
							height={14}
							className="size-3.5"
						/>
					) : item.type === "MCP" ? (
						<MCPIcon className="size-3.5" />
					) : (
						<Plug className="size-3.5 text-fg-subtle" />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-center gap-2">
						<span className="min-w-0 flex-1 truncate text-sm text-fg-muted group-hover:text-white transition-colors">
							{item.name}
						</span>
						<span className="shrink-0 text-[10px] text-fg-faint">
							{formatToolUsageTime(item.lastUsedAt, item.hasBeenUsed)}
						</span>
					</div>
					<p className="mt-0.5 truncate text-[11px] text-fg-subtle">
						{item.lastDocumentTitle ?? "No saved memory yet"}
					</p>
					{item.lastDocumentPreview ? (
						<p className="mt-0 max-h-0 overflow-hidden text-[11px] leading-snug text-fg-subtle opacity-0 transition-all duration-200 line-clamp-2 group-hover:mt-1 group-hover:max-h-9 group-hover:opacity-100">
							{item.lastDocumentPreview}
						</p>
					) : null}
				</div>
			</button>
		</li>
	)
}

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
			notion: () => onOpenIntegrations("connections"),
			"google-drive": () => onOpenIntegrations("connections"),
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
			onClick: onClicks[p.id] ?? (() => {}),
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
			notion: () => onOpenIntegrations("connections"),
			"google-drive": () => onOpenIntegrations("connections"),
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
			onClick: onClicks[p.id] ?? (() => {}),
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
	onNavigateToMemories: _onNavigateToMemories,
	onNavigateToGraph,
	onOpenDocument,
	onOpenToolDocument,
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
	onOpenToolDocument: (document: DocumentWithMemories) => void
	onHighlightsChat: (seed: string) => void
	onHighlightsShowRelated: (query: string) => void
	onResetHighlights: () => void
	memoryOfDay: MemoryOfDay | null
}) {
	const { user, org } = useAuth()
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
		enabled: !!user && !!org?.id,
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

	// Fetch API keys for tool usage tracking
	const { data: apiKeysData } = useQuery({
		queryKey: ["api-keys-tool-usage", org?.id],
		queryFn: async () => {
			const API_URL =
				process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
			const res = await fetch(`${API_URL}/v3/auth/keys`, {
				credentials: "include",
			})
			if (!res.ok) return { keys: [] }
			return (await res.json()) as {
				keys: Array<{
					id: string
					name: string
					createdAt: string
					lastRequest: string | null
					metadata: string
				}>
			}
		},
		staleTime: 5 * 60 * 1000,
		enabled: !!user,
	})

	const { data: recentMcpDocumentsData } = useQuery({
		queryKey: ["dashboard-tool-documents", org?.id],
		queryFn: async (): Promise<DocumentsResponse> => {
			const response = await $fetch("@post/documents/documents", {
				body: {
					page: 1,
					limit: 50,
					sort: "createdAt",
					order: "desc",
				},
				disableValidation: true,
			})
			if (response.error) throw new Error(response.error?.message)
			return response.data as DocumentsResponse
		},
		staleTime: 5 * 60 * 1000,
		enabled: !!user,
	})

	const toolUsageItems = useMemo(
		() =>
			parseToolUsage(
				apiKeysData?.keys ?? [],
				recentMcpDocumentsData?.documents ?? [],
			),
		[apiKeysData, recentMcpDocumentsData],
	)

	const {
		copy: personalizedCopy,
		profession,
		setProfession,
	} = usePersonalization()

	const recents = recentsData?.documents ?? []
	const recentToolUsageItems = toolUsageItems
		.filter((item) => item.type === "Plugin")
		.slice(0, 3)
	const totalMemories = recentsData?.pagination?.totalItems ?? 0
	const hasMcp = mcpData?.previousLogin ?? false
	const connectedProviders = new Set(connections.map((c) => c.provider))

	const tip = useMemo(() => {
		const tips = TIPS[profession]
		return tips[Math.floor(Math.random() * tips.length)]
	}, [profession])

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
						<h1 className="text-xl font-medium tracking-tight text-white md:text-2xl">
							{spaceLabel}
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
					<div className="flex items-center gap-0.5 -mx-2.5">
						<button
							type="button"
							onClick={() => onAddMemory("link")}
							className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-fg-subtle hover:bg-surface-hover hover:text-white transition-colors cursor-pointer"
						>
							<Link2 className="size-3.5 shrink-0" />
							{personalizedCopy.saveLink}
						</button>
						<span className="text-[#3A4455] select-none">·</span>
						<button
							type="button"
							onClick={() => onAddMemory("note")}
							className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-fg-subtle hover:bg-surface-hover hover:text-white transition-colors cursor-pointer"
						>
							<FileText className="size-3.5 shrink-0" />
							{personalizedCopy.writeNote}
						</button>
						<span className="text-[#3A4455] select-none">·</span>
						<button
							type="button"
							onClick={() => {
								analytics.searchOpened({ source: "header" })
								onOpenSearch()
							}}
							className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-fg-subtle hover:bg-surface-hover hover:text-white transition-colors cursor-pointer"
						>
							<SearchIcon className="size-3.5 shrink-0" />
							Search
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
					{recents.length > 0 || recentToolUsageItems.length > 0 ? (
						<>
							{/* Shared header row — all labels aligned */}
							<div className="flex gap-4">
								<div className="flex-[4] min-w-0">
									<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-fg-faint">
										Recents
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
								<ul className="flex-[4] min-w-0 space-y-0.5">
									{recentToolUsageItems.map((item) => (
										<ToolUsageRecentRow
											key={item.id}
											item={item}
											onOpenPlugins={onOpenPlugins}
											onOpenToolDocument={onOpenToolDocument}
										/>
									))}
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
						/* No recents yet — show suggestions and tool usage */
						<>
							<div className="flex gap-4">
								<div className="flex-1 min-w-0">
									<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-fg-faint">
										Suggested for you
									</p>
								</div>
							</div>
							<div className="flex gap-4 items-start">
								<div className="flex-1 min-w-0 max-w-sm">
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
					)}
				</motion.section>
			</div>
		</div>
	)
}
