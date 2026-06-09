"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useCustomer } from "autumn-js/react"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { hasActivePlan } from "@lib/queries"
import { $fetch } from "@lib/api"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import type { ConnectionResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { Button } from "@ui/components/button"
import {
	ChromeIcon,
	AppleShortcutsIcon,
	RaycastIcon,
} from "@/components/integration-icons"
import { GoogleDrive, Notion, OneDrive, MCPIcon } from "@ui/assets/icons"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
	ArrowLeft,
	ArrowRight,
	BookOpen,
	Check,
	Loader,
	Plus,
	Search,
	X,
	Zap,
} from "lucide-react"
import { formatRelativeTime } from "@/components/settings/sync-utils"
import { CHROME_EXTENSION_URL, POKE_RECIPE_URL } from "@lib/constants"
import { analytics } from "@/lib/analytics"
import Image from "next/image"
import { useViewMode } from "@/lib/view-mode-context"
import type { ViewParamValue } from "@/lib/search-params"
import { parseAsString, parseAsStringEnum, useQueryState } from "nuqs"
import { addDocumentParam } from "@/lib/search-params"
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog"
import {
	PLUGIN_CATALOG,
	FREE_TIER_PLUGIN_IDS,
	isFreeTierPlugin,
	normalizePluginClientId,
	type InstallStep,
} from "@/lib/plugin-catalog"
import { INSET, InstallSteps, PillButton } from "./integrations/install-steps"
import { MCPSteps } from "./mcp-modal/mcp-detail-view"

type Connection = z.infer<typeof ConnectionResponseSchema>

type ConnectorProvider = "google-drive" | "notion" | "onedrive"

interface ConnectedKey {
	keyId: string
	keyStart: string | null
	pluginId: string
	lastRequest?: string | null
	createdAt?: string | null
}

function toIsoDate(value: string | Date | null | undefined): string | null {
	if (!value) return null
	const d = value instanceof Date ? value : new Date(value)
	if (Number.isNaN(d.getTime())) return null
	return d.toISOString()
}

function parsePluginAuthKeys(
	apiKeys: ListedApiKey[],
	keyPrefix: (key: ListedApiKey) => string | null,
): { active: ConnectedKey[]; setup: ConnectedKey[] } {
	const active: ConnectedKey[] = []
	const setup: ConnectedKey[] = []
	for (const key of apiKeys) {
		if (key.enabled === false) continue
		if (!key.metadata) continue
		try {
			const metadata =
				typeof key.metadata === "string"
					? (JSON.parse(key.metadata) as {
							sm_type?: string
							sm_client?: string
						})
					: (key.metadata as { sm_type?: string; sm_client?: string })
			if (metadata.sm_type !== "plugin_auth" || !metadata.sm_client) continue
			const entry: ConnectedKey = {
				keyId: key.id,
				keyStart: keyPrefix(key),
				pluginId: normalizePluginClientId(metadata.sm_client),
				lastRequest: toIsoDate(key.lastRequest),
				createdAt: toIsoDate(key.createdAt),
			}
			if (key.lastRequest) active.push(entry)
			else setup.push(entry)
		} catch {}
	}
	return { active, setup }
}

type ListedApiKey = {
	id: string
	name?: string | null
	createdAt?: string | Date | null
	enabled?: boolean
	lastRequest?: string | Date | null
	metadata: string | Record<string, unknown> | null
	start?: string | null
}

type ItemKind = "plugin" | "connector" | "client" | "mcp-client" | "import"

type MCPClientKey =
	| "chatgpt"
	| "codex"
	| "cursor"
	| "claude"
	| "vscode"
	| "cline"
	| "gemini-cli"
	| "claude-code"
	| "mcp-url"

const MCP_CLIENTS: Array<{
	key: MCPClientKey
	name: string
	tagline: string
	simpleTitle?: string
	dev?: boolean
}> = [
	{
		key: "cursor",
		name: "Cursor",
		tagline: "One-click MCP install in Cursor",
		simpleTitle: "Code with your saved knowledge nearby",
	},
	{
		key: "claude",
		name: "Claude Desktop",
		tagline: "Connect supermemory in Claude Desktop",
		simpleTitle: "Reference your notes during any Claude chat",
	},
	{
		key: "chatgpt",
		name: "ChatGPT",
		tagline: "Apps via ChatGPT developer mode",
		simpleTitle: "Let ChatGPT recall what you've saved",
	},
	{
		key: "vscode",
		name: "VS Code",
		tagline: "Native MCP support in VS Code",
		simpleTitle: "Pull your knowledge into VS Code while coding",
		dev: true,
	},
	{
		key: "cline",
		name: "Cline",
		tagline: "MCP via the Cline VS Code extension",
		simpleTitle: "Cline can read and add to your memory",
		dev: true,
	},
	{
		key: "gemini-cli",
		name: "Gemini CLI",
		tagline: "Google Gemini terminal client",
		simpleTitle: "Bring your memory into Gemini sessions",
		dev: true,
	},
	{
		key: "codex",
		name: "Codex (MCP)",
		tagline: "OpenAI Codex CLI via MCP config",
		simpleTitle: "Codex with access to your saved context",
		dev: true,
	},
	{
		key: "claude-code",
		name: "Claude Code (MCP)",
		tagline: "Connect via Claude Code MCP config",
		simpleTitle: "Claude Code with your project context",
		dev: true,
	},
	{
		key: "mcp-url",
		name: "MCP URL",
		tagline: "Use the URL in any custom MCP client",
		simpleTitle: "Connect any MCP-capable app to supermemory",
		dev: true,
	},
]

function mcpClientIconSrc(key: MCPClientKey): string {
	if (key === "mcp-url") return "/mcp-icon.svg"
	const file = key === "claude-code" ? "claude" : key
	return `/mcp-supported-tools/${file}.png`
}

const PLUGIN_SIMPLE_TITLES: Record<string, string> = {
	claude_code: "Remembers your code conventions and decisions",
	codex: "Codex sessions that remember your project",
	opencode: "OpenCode with persistent project memory",
	openclaw: "Save chats from Telegram, Discord and Slack",
	hermes: "Persistent memory for the Hermes agent",
}

type CategoryFilter =
	| "all"
	| "connected"
	| "plugins"
	| "knowledge-bases"
	| "apps-extensions"
	| "ai-clients"

const CATEGORY_VALUES: readonly CategoryFilter[] = [
	"all",
	"connected",
	"ai-clients",
	"plugins",
	"knowledge-bases",
	"apps-extensions",
] as const

const catParam = parseAsStringEnum<CategoryFilter>([
	...CATEGORY_VALUES,
]).withDefault("all")

const CATEGORY_LABEL: Record<CategoryFilter, string> = {
	all: "All",
	connected: "Active",
	plugins: "Plugins",
	"knowledge-bases": "Knowledge bases",
	"apps-extensions": "Apps & extensions",
	"ai-clients": "MCP",
}

const SECTION_ORDER: Array<Exclude<CategoryFilter, "all" | "connected">> = [
	"ai-clients",
	"plugins",
	"knowledge-bases",
	"apps-extensions",
]

function itemCategory(
	item: Item,
): Exclude<CategoryFilter, "all" | "connected"> {
	switch (item.kind) {
		case "plugin":
			return "plugins"
		case "connector":
			return "knowledge-bases"
		case "mcp-client":
			return "ai-clients"
		case "client":
		case "import":
			return "apps-extensions"
	}
}

interface BaseItem {
	id: string
	name: string
	tagline: string
	icon: ReactNode
	docsUrl?: string
	pro?: boolean
	kind: ItemKind
	simpleTitle?: string
	dev?: boolean
	isNew?: boolean
}

interface PluginItem extends BaseItem {
	kind: "plugin"
	pluginId: string
}

interface ConnectorItem extends BaseItem {
	kind: "connector"
	provider: ConnectorProvider
}

interface ClientItem extends BaseItem {
	kind: "client"
	action:
		| { type: "external"; href: string }
		| { type: "view"; viewMode: ViewParamValue }
}

interface MCPClientItem extends BaseItem {
	kind: "mcp-client"
	clientKey: MCPClientKey
}

interface ImportItem extends BaseItem {
	kind: "import"
	viewMode: ViewParamValue
}

type Item = PluginItem | ConnectorItem | ClientItem | MCPClientItem | ImportItem

const SECTIONS: Array<{
	label: string
	items: (plugin: typeof PLUGIN_CATALOG) => Item[]
}> = [
	{
		label: "MCP",
		items: () =>
			MCP_CLIENTS.map<MCPClientItem>((c) => ({
				kind: "mcp-client",
				clientKey: c.key,
				id: `mcp-${c.key}`,
				name: c.name,
				tagline: c.tagline,
				simpleTitle: c.simpleTitle,
				dev: c.dev,
				icon:
					c.key === "mcp-url" ? (
						<MCPIcon className="size-6" />
					) : (
						<Image
							src={mcpClientIconSrc(c.key)}
							alt={c.name}
							width={24}
							height={24}
							unoptimized
							className="size-6 rounded object-contain"
						/>
					),
				docsUrl: "https://docs.supermemory.ai/supermemory-mcp/introduction",
			})),
	},
	{
		label: "Plugins",
		items: (catalog) =>
			Object.keys(catalog).map<PluginItem>((id) => {
				const plugin = catalog[id]
				if (!plugin) throw new Error(`Missing plugin ${id}`)
				return {
					kind: "plugin",
					id: `plugin-${id}`,
					pluginId: id,
					name: plugin.name,
					tagline: plugin.tagline,
					icon: (
						<Image
							src={plugin.icon}
							alt={plugin.name}
							width={24}
							height={24}
							className="size-6 rounded"
						/>
					),
					docsUrl: plugin.docsUrl,
					pro: !FREE_TIER_PLUGIN_IDS.includes(id),
					simpleTitle: PLUGIN_SIMPLE_TITLES[id],
					dev: true,
				}
			}),
	},
	{
		label: "Knowledge bases",
		items: () => [
			{
				kind: "connector",
				id: "google-drive",
				provider: "google-drive",
				name: "Google Drive",
				tagline: "Sync Docs, Sheets and Slides into your memory",
				simpleTitle: "Your Docs, Sheets and Slides, searchable",
				icon: <GoogleDrive className="size-6" />,
				pro: true,
			},
			{
				kind: "connector",
				id: "notion",
				provider: "notion",
				name: "Notion",
				tagline: "Import Notion pages and databases",
				simpleTitle: "All your Notion pages, in supermemory",
				icon: <Notion className="size-6" />,
				pro: true,
			},
			{
				kind: "connector",
				id: "onedrive",
				provider: "onedrive",
				name: "OneDrive",
				tagline: "Bring in Office documents from OneDrive",
				simpleTitle: "Your OneDrive files, ready to recall",
				icon: <OneDrive className="size-6" />,
				pro: true,
			},
		],
	},
	{
		label: "Apps & extensions",
		items: () => [
			{
				kind: "client",
				id: "chrome",
				name: "Chrome Extension",
				tagline: "Save webpages, import bookmarks, sync ChatGPT memories",
				simpleTitle: "Save any webpage with one click",
				icon: <ChromeIcon className="size-6" />,
				action: { type: "external", href: CHROME_EXTENSION_URL },
			},
			{
				kind: "client",
				id: "poke",
				name: "Poke",
				tagline: "Recall and save memories from Poke over text",
				simpleTitle: "Text Poke to recall and save your memories",
				isNew: true,
				icon: (
					<div className="relative size-10 shrink-0 overflow-hidden rounded-lg">
						<Image
							src="/images/poke.png"
							alt="Poke"
							width={40}
							height={40}
							className="object-cover"
						/>
					</div>
				),
				action: { type: "external", href: POKE_RECIPE_URL },
			},
			{
				kind: "client",
				id: "shortcuts",
				name: "Apple Shortcuts",
				tagline: "Add memories from iPhone, iPad or Mac",
				simpleTitle: "Save anything from your phone or Mac",
				icon: <AppleShortcutsIcon />,
				action: { type: "view", viewMode: "shortcuts" as ViewParamValue },
			},
			{
				kind: "client",
				id: "raycast",
				name: "Raycast",
				tagline: "Add and search memories from Raycast on Mac",
				simpleTitle: "Save and search from Raycast on Mac",
				icon: <RaycastIcon className="size-6" />,
				action: { type: "view", viewMode: "raycast" as ViewParamValue },
				dev: true,
			},
			{
				kind: "import",
				id: "x-bookmarks",
				name: "Import X bookmarks",
				tagline: "Turn your X/Twitter bookmarks into memories",
				simpleTitle: "Turn your X bookmarks into memory",
				icon: <Image src="/onboarding/x.png" alt="X" width={24} height={24} />,
				viewMode: "import" as ViewParamValue,
			},
		],
	},
]

export function DetailWrapper({
	onBack,
	children,
}: {
	onBack: () => void
	children: ReactNode
}) {
	return (
		<div className="flex-1 p-4 md:p-6 pt-2">
			<div className="max-w-3xl mx-auto">
				<Button
					variant="link"
					className="text-white hover:text-gray-300 p-0 hover:no-underline cursor-pointer mb-4"
					onClick={onBack}
				>
					<ArrowLeft className="size-4 mr-1" />
					Back to Integrations
				</Button>
				{children}
			</div>
		</div>
	)
}

function ProChip() {
	return (
		<span
			className={cn(
				dmSans125ClassName(),
				"ml-auto shrink-0 pl-2 text-[10px] font-semibold uppercase tracking-wide text-[#4BA0FA]",
			)}
		>
			Pro
		</span>
	)
}

function NewChip() {
	return (
		<span
			className={cn(
				dmSans125ClassName(),
				"shrink-0 rounded-full bg-[#4BA0FA]/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#4BA0FA]",
			)}
		>
			New
		</span>
	)
}

function IconBox({ children }: { children: ReactNode }) {
	return (
		<div
			className={cn(
				"flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#080B0F]",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]",
			)}
		>
			{children}
		</div>
	)
}

function DocsLink({ href }: { href: string }) {
	return (
		<a
			aria-label="Open docs"
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			onClick={(e) => e.stopPropagation()}
			className={cn(
				dmSans125ClassName(),
				"flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] text-[#A1A1AA] transition-colors hover:text-white sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-none",
			)}
		>
			<BookOpen className="size-3.5" />
			<span className="hidden sm:inline">Docs</span>
		</a>
	)
}

function DisconnectButton({ onConfirm }: { onConfirm: () => void }) {
	const [confirming, setConfirming] = useState(false)
	useEffect(() => {
		if (!confirming) return
		const t = setTimeout(() => setConfirming(false), 3000)
		return () => clearTimeout(t)
	}, [confirming])
	return (
		<button
			type="button"
			onClick={() => (confirming ? onConfirm() : setConfirming(true))}
			className={cn(
				dmSans125ClassName(),
				"shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
				confirming
					? "bg-red-500/15 text-red-400"
					: "text-[#737373] hover:bg-white/5 hover:text-red-400",
			)}
		>
			{confirming ? "Confirm" : "Disconnect"}
		</button>
	)
}

function ActiveButton({
	count,
	lastActive,
	onClick,
}: {
	count: number
	lastActive?: string | null
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				dmSans125ClassName(),
				"group flex shrink-0 cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[#00AC3F] transition-colors sm:text-[13px]",
			)}
		>
			<span className="size-[7px] rounded-full bg-[#00AC3F]" />
			<span className="group-hover:underline">
				{count > 1 ? `${count} active` : "Active"}
			</span>
			{count <= 1 && lastActive && (
				<span className="text-[11px] font-normal text-[#737373]">
					· {formatRelativeTime(lastActive)}
				</span>
			)}
		</button>
	)
}

function FinishSetupButton({ onClick }: { onClick: () => void }) {
	return (
		<PillButton onClick={onClick}>
			<span className="size-[7px] rounded-full bg-[#EAB308]" />
			Finish setup
		</PillButton>
	)
}

function ConnectionsCountPill({ count }: { count: number }) {
	return (
		<span
			className={cn(
				dmSans125ClassName(),
				"flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#00AC3F] sm:text-[13px]",
			)}
		>
			<span className="size-[7px] rounded-full bg-[#00AC3F]" />
			{count > 1 ? `${count} connected` : "Connected"}
		</span>
	)
}

function ItemCard({
	icon,
	name,
	tagline,
	pro,
	isNew,
	docsUrl,
	leftIndicator,
	rightSlot,
}: {
	icon: ReactNode
	name: string
	tagline: string
	pro?: boolean
	isNew?: boolean
	docsUrl?: string
	leftIndicator?: ReactNode
	rightSlot: ReactNode
}) {
	return (
		<div
			className={cn(
				"flex h-full flex-col gap-4 rounded-[12px] bg-[#14161A] p-4 transition-colors hover:bg-[#16181D]",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<IconBox>{icon}</IconBox>
				{docsUrl && (
					// biome-ignore lint/a11y/noStaticElementInteractions: wrapper to stop event propagation
					<div
						role="presentation"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						<DocsLink href={docsUrl} />
					</div>
				)}
			</div>
			<div className="flex flex-1 flex-col justify-end gap-3">
				<div className="min-w-0">
					<div className="flex min-w-0 items-center gap-1">
						{leftIndicator}
						<span
							className={cn(
								dmSans125ClassName(),
								"min-w-0 truncate text-[14px] font-medium text-[#FAFAFA]",
							)}
						>
							{name}
						</span>
						{isNew && <NewChip />}
						{pro && <ProChip />}
					</div>
					<p
						className={cn(
							dmSans125ClassName(),
							"mt-1 line-clamp-2 text-[12px] leading-snug text-[#A1A1AA]",
						)}
					>
						{tagline}
					</p>
				</div>
				<div className="flex justify-end">{rightSlot}</div>
			</div>
		</div>
	)
}

interface FeaturedPick {
	id: string
	name: string
	emoji?: string
	headline: string
	support: string
	tagline: string
	icon: ReactNode
	backdrop?: ReactNode
	docsUrl?: string
	ctaLabel: string
	onCta: () => void
}

const FEATURED_ROTATE_MS = 7000

function FeaturedHero({ picks }: { picks: FeaturedPick[] }) {
	const [index, setIndex] = useState(0)
	const [paused, setPaused] = useState(false)
	const [manualOverride, setManualOverride] = useState(false)

	useEffect(() => {
		if (picks.length <= 1) return
		if (paused || manualOverride) return
		const t = setInterval(() => {
			setIndex((i) => (i + 1) % picks.length)
		}, FEATURED_ROTATE_MS)
		return () => clearInterval(t)
	}, [picks.length, paused, manualOverride])

	if (picks.length === 0) return null
	const pick = picks[index] ?? picks[0]
	if (!pick) return null

	return (
		// biome-ignore lint/a11y/useSemanticElements: card wraps nested dot buttons, so it can't be a <button>
		<div
			role="button"
			tabIndex={0}
			onClick={pick.onCta}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault()
					pick.onCta()
				}
			}}
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocus={() => setPaused(true)}
			onBlur={() => setPaused(false)}
			className={cn(
				"group relative flex w-full flex-col items-start justify-center overflow-hidden rounded-[14px] px-5 py-5 sm:px-6 sm:py-6 text-left cursor-pointer",
				"bg-[#191D24]",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
				"min-h-[160px]",
			)}
		>
			{pick.backdrop && (
				<AnimatePresence mode="wait">
					<motion.div
						key={`bg-${pick.id}`}
						initial={{ opacity: 0, x: 12 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 8 }}
						transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
						aria-hidden
						className="pointer-events-none absolute inset-y-0 right-0 w-3/5 sm:w-2/3"
					>
						<div className="absolute -right-8 -top-10 sm:right-0 sm:-top-4 opacity-55">
							{pick.backdrop}
						</div>
						<div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#191D24]/40 to-[#191D24]" />
						<div className="absolute inset-0 bg-gradient-to-t from-[#191D24]/60 via-transparent to-transparent" />
					</motion.div>
				</AnimatePresence>
			)}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
				style={{
					backgroundImage:
						"url(\"data:image/svg+xml;utf8,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
				}}
			/>

			<span
				className={cn(
					dmSans125ClassName(),
					"relative z-1 mb-3 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#06121A]",
					"shadow-[0_0_14px_rgba(54,253,253,0.30)]",
				)}
				style={{
					background:
						"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
				}}
			>
				Featured
			</span>
			{picks.length > 1 && (
				<div className="absolute right-5 top-5 sm:right-6 sm:top-6 z-1 flex shrink-0 items-center gap-1.5">
					{picks.map((p, i) => {
						const active = i === index
						return (
							<button
								key={p.id}
								type="button"
								aria-label={`Show featured ${p.name}`}
								onClick={(e) => {
									e.stopPropagation()
									setIndex(i)
									setManualOverride(true)
								}}
								className={cn(
									"rounded-full transition-all cursor-pointer",
									active
										? "w-3 h-1 bg-[#4BA0FA]"
										: "size-1 bg-[#2A3040] hover:bg-[#3A4455]",
								)}
							/>
						)
					})}
				</div>
			)}

			<AnimatePresence mode="wait">
				<motion.div
					key={pick.id}
					initial={{ opacity: 0, y: 4 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -3 }}
					transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
					className="relative flex max-w-[55%] flex-col gap-1.5"
				>
					<h3
						className={cn(
							dmSans125ClassName(),
							"text-[18px] font-semibold leading-tight tracking-[-0.15px] text-[#FAFAFA]",
						)}
					>
						{pick.headline}
					</h3>
					<p
						className={cn(
							dmSans125ClassName(),
							"text-[13px] leading-snug text-[#A1A1AA]",
						)}
					>
						<span className="font-medium text-[#CBD5E1]">
							{pick.emoji ? `${pick.emoji} ` : ""}
							{pick.name}
						</span>{" "}
						· {pick.support}
					</p>
				</motion.div>
			</AnimatePresence>
		</div>
	)
}

function SearchToggle({
	value,
	onChange,
	expanded,
	setExpanded,
}: {
	value: string
	onChange: (next: string) => void
	expanded: boolean
	setExpanded: (next: boolean) => void
}) {
	const inputRef = useRef<HTMLInputElement>(null)

	const open = () => {
		setExpanded(true)
		requestAnimationFrame(() => inputRef.current?.focus())
	}

	const close = () => {
		onChange("")
		setExpanded(false)
	}

	if (!expanded && !value) {
		return (
			<button
				type="button"
				aria-label="Search integrations"
				onClick={open}
				className={cn(
					"flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0D121A] text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]",
					"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.5)]",
				)}
			>
				<Search className="size-3.5" />
			</button>
		)
	}

	return (
		<div
			className={cn(
				"flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-[#0D121A] px-3",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.5)]",
			)}
		>
			<Search className="size-3.5 shrink-0 text-[#A1A1AA]" />
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Escape") close()
				}}
				onBlur={() => {
					if (!value) setExpanded(false)
				}}
				placeholder="Search integrations"
				className={cn(
					dmSans125ClassName(),
					"min-w-0 flex-1 bg-transparent text-[12px] text-[#FAFAFA] placeholder:text-[#525D6E] focus:outline-none",
				)}
			/>
			{value && (
				<button
					type="button"
					aria-label="Clear search"
					onClick={close}
					className="shrink-0 text-[#737373] transition-colors hover:text-[#FAFAFA]"
				>
					<X className="size-3.5" />
				</button>
			)}
		</div>
	)
}

function CategoryFilterToggle({
	value,
	onChange,
	counts,
	compact,
}: {
	value: CategoryFilter
	onChange: (next: CategoryFilter) => void
	counts: Record<CategoryFilter, number>
	compact?: boolean
}) {
	const visible = compact
		? [value]
		: CATEGORY_VALUES.filter((v) => v === "all" || counts[v] > 0)
	return (
		<div
			className={cn(
				"scrollbar-none flex items-center gap-0.5 overflow-x-auto rounded-full bg-[#0D121A] p-0.5",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.5)]",
			)}
		>
			{visible.map((v) => {
				const active = value === v
				return (
					<button
						key={v}
						type="button"
						onClick={() => onChange(v)}
						className={cn(
							dmSans125ClassName(),
							"flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors",
							active
								? "bg-white/[0.10] text-[#FAFAFA]"
								: "text-[#A1A1AA] hover:text-[#FAFAFA]",
						)}
					>
						{CATEGORY_LABEL[v]}
						{v !== "all" && (
							<span
								className={cn(
									"text-[10px] font-semibold tabular-nums",
									active ? "text-[#A1A1AA]" : "text-[#525D6E]",
								)}
							>
								{counts[v]}
							</span>
						)}
					</button>
				)
			})}
		</div>
	)
}

function SectionRail({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const [canScrollLeft, setCanScrollLeft] = useState(false)
	const [canScrollRight, setCanScrollRight] = useState(false)

	const update = useCallback(() => {
		const el = scrollRef.current
		if (!el) return
		setCanScrollLeft(el.scrollLeft > 4)
		setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
	}, [])

	useEffect(() => {
		update()
		const el = scrollRef.current
		if (!el) return
		el.addEventListener("scroll", update, { passive: true })
		el.addEventListener("scrollend", update)
		const ro = new ResizeObserver(update)
		ro.observe(el)
		return () => {
			el.removeEventListener("scroll", update)
			el.removeEventListener("scrollend", update)
			ro.disconnect()
		}
	}, [update])

	const scrollBy = (dir: 1 | -1) => {
		scrollRef.current?.scrollBy({ left: 292 * dir, behavior: "smooth" })
		setTimeout(update, 450)
	}

	const arrowClass = cn(
		"flex size-7 items-center justify-center rounded-full bg-[#0D121A] text-[#FAFAFA] transition-opacity",
		"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]",
		"hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30",
	)

	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3">
				<h3
					className={cn(
						dmSans125ClassName(),
						"text-[13px] font-semibold tracking-[-0.01em] text-[#A1A1AA]",
					)}
				>
					{label}
				</h3>
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						aria-label="Show previous"
						disabled={!canScrollLeft}
						onClick={() => scrollBy(-1)}
						className={arrowClass}
					>
						<ArrowLeft className="size-3.5" />
					</button>
					<button
						type="button"
						aria-label="Show more"
						disabled={!canScrollRight}
						onClick={() => scrollBy(1)}
						className={arrowClass}
					>
						<ArrowRight className="size-3.5" />
					</button>
				</div>
			</div>
			<div
				ref={scrollRef}
				className="scrollbar-none flex gap-3 overflow-x-auto -mx-1 px-1"
			>
				{children}
			</div>
		</section>
	)
}

export function IntegrationsView() {
	const { setViewMode } = useViewMode()
	const queryClient = useQueryClient()
	const { org } = useAuth()
	const autumn = useCustomer()
	const hasProProduct = hasActivePlan(autumn.data?.subscriptions, "api_pro")
	const isAutumnLoading = autumn.isLoading

	const [connectingPlugin, setConnectingPlugin] = useState<string | null>(null)
	const [connectingProvider, setConnectingProvider] =
		useState<ConnectorProvider | null>(null)
	const [newKey, setNewKey] = useState<{
		open: boolean
		key: string
		pluginId: string | null
	}>({ open: false, key: "", pluginId: null })
	const [connectedPluginId, setConnectedPluginId] = useState<string | null>(
		null,
	)
	const [finishSetupPluginId, setFinishSetupPluginId] = useState<string | null>(
		null,
	)

	const { data: pluginsData } = useQuery({
		queryFn: async () => {
			const API_URL =
				process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
			const res = await fetch(`${API_URL}/v3/auth/plugins`, {
				credentials: "include",
			})
			if (!res.ok) throw new Error("Failed to fetch plugins")
			return (await res.json()) as { plugins: string[] }
		},
		queryKey: ["plugins"],
	})

	const { data: connections = [] } = useQuery({
		queryKey: ["connections"],
		queryFn: async () => {
			const response = await $fetch("@post/connections/list", {
				body: { containerTags: [] },
			})
			if (response.error)
				throw new Error(response.error?.message || "Failed to load connections")
			return response.data as Connection[]
		},
		staleTime: 30 * 1000,
		enabled: hasProProduct,
	})

	const { data: apiKeys = [], refetch: refetchKeys } = useQuery<ListedApiKey[]>(
		{
			queryKey: ["api-keys", org?.id],
			queryFn: async () => {
				if (!org?.id) return []
				const API_URL =
					process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
				const res = await fetch(`${API_URL}/v3/auth/keys`, {
					credentials: "include",
				})
				if (!res.ok) return []
				const data = (await res.json()) as { keys?: ListedApiKey[] }
				return data.keys ?? []
			},
			enabled: !!org?.id,
			staleTime: 30 * 1000,
		},
	)

	const keyPrefix = useCallback((key: ListedApiKey): string | null => {
		return key.start ?? (key.name?.startsWith("sm_") ? key.name : null)
	}, [])

	const { active: activePlugins, setup: setupPlugins } = useMemo(
		() => parsePluginAuthKeys(apiKeys, keyPrefix),
		[apiKeys, keyPrefix],
	)

	const activePluginById = useMemo(() => {
		const map = new Map<string, ConnectedKey>()
		for (const key of activePlugins) {
			const existing = map.get(key.pluginId)
			if (!existing) {
				map.set(key.pluginId, key)
				continue
			}
			const a = key.lastRequest ? new Date(key.lastRequest).getTime() : 0
			const b = existing.lastRequest
				? new Date(existing.lastRequest).getTime()
				: 0
			if (a >= b) map.set(key.pluginId, key)
		}
		return map
	}, [activePlugins])

	const activeCountByPlugin = useMemo(() => {
		const map = new Map<string, number>()
		for (const key of activePlugins) {
			map.set(key.pluginId, (map.get(key.pluginId) ?? 0) + 1)
		}
		return map
	}, [activePlugins])

	const setupPluginIds = useMemo(
		() => new Set(setupPlugins.map((k) => k.pluginId)),
		[setupPlugins],
	)

	const connectionsByProvider = useMemo(() => {
		const out: Record<ConnectorProvider, Connection[]> = {
			"google-drive": [],
			notion: [],
			onedrive: [],
		}
		for (const c of connections) {
			const p = c.provider as ConnectorProvider
			if (p in out) out[p].push(c)
		}
		return out
	}, [connections])

	const createPluginKeyMutation = useMutation({
		mutationFn: async (pluginId: string) => {
			const API_URL =
				process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
			const params = new URLSearchParams({ client: pluginId })
			const res = await fetch(`${API_URL}/v3/auth/key?${params}`, {
				credentials: "include",
			})
			if (!res.ok) {
				if (res.status === 403) {
					throw new Error(
						"This plugin requires a Pro plan. Hermes and Codex are available on the Free plan.",
					)
				}
				const errorData = (await res.json().catch(() => ({}))) as {
					message?: string
				}
				throw new Error(errorData.message || "Failed to create plugin key")
			}
			return (await res.json()) as { key: string }
		},
		onMutate: (pluginId) => setConnectingPlugin(pluginId),
		onError: (err) => {
			toast.error("Failed to connect plugin", {
				description: err instanceof Error ? err.message : "Unknown error",
			})
		},
		onSettled: () => {
			setConnectingPlugin(null)
			queryClient.invalidateQueries({ queryKey: ["api-keys", org?.id] })
		},
		onSuccess: (data, pluginId) => {
			setNewKey({ open: true, key: data.key, pluginId })
		},
	})

	const addConnectionMutation = useMutation({
		mutationFn: async (provider: ConnectorProvider) => {
			const response = await $fetch("@post/connections/:provider", {
				params: { provider },
				body: {
					redirectUrl: window.location.href,
					containerTags: [],
				},
			})
			if ("data" in response && response.data && !("error" in response.data)) {
				return response.data
			}
			throw new Error(response.error?.message || "Failed to connect")
		},
		onMutate: (provider) => {
			setConnectingProvider(provider)
			analytics.connectionAuthStarted({ provider })
		},
		onError: (err) => {
			setConnectingProvider(null)
			toast.error("Failed to connect", {
				description: err instanceof Error ? err.message : "Unknown error",
			})
		},
		onSuccess: (data) => {
			if (data?.authLink) {
				window.location.href = data.authLink
				return
			}
			setConnectingProvider(null)
			toast.error("Connect link missing — try again.")
		},
	})

	const handleRevokePluginKey = async (keyId: string) => {
		try {
			await authClient.apiKey.delete({ keyId })
			toast.success("Plugin disconnected")
			refetchKeys()
		} catch {
			toast.error("Failed to disconnect plugin")
		}
	}

	const handleUpgrade = async () => {
		try {
			const result = await autumn.attach({
				planId: "api_pro",
				successUrl: `${window.location.origin}/?view=integrations`,
			})
			if (result?.paymentUrl) {
				window.open(result.paymentUrl, "_self")
				return
			}
			autumn.refetch?.()
		} catch (error) {
			console.error(error)
			toast.error("Failed to start checkout. Please try again.")
		}
	}

	const availablePluginIds = pluginsData?.plugins ?? Object.keys(PLUGIN_CATALOG)
	const enabledPluginIds = new Set(
		availablePluginIds.filter((id) => PLUGIN_CATALOG[id]),
	)

	const [category, setCategory] = useQueryState("cat", catParam)
	const [, setAddDoc] = useQueryState("add", addDocumentParam)
	const [mcpClient, setMcpClient] = useQueryState("mcpClient", parseAsString)
	const [mcpModalOpen, setMcpModalOpen] = useState(false)
	const [search, setSearch] = useState("")
	const [searchExpanded, setSearchExpanded] = useState(false)

	const openMcpClient = (key: MCPClientKey) => {
		void setMcpClient(key)
		setMcpModalOpen(true)
	}

	const closeMcpModal = () => {
		setMcpModalOpen(false)
		void setMcpClient(null)
	}

	const activeMcpClient = mcpClient
		? MCP_CLIENTS.find((c) => c.key === mcpClient)
		: undefined

	const allItems = useMemo<Item[]>(
		() =>
			SECTIONS.flatMap((s) => s.items(PLUGIN_CATALOG)).filter(
				(item) => item.kind !== "plugin" || enabledPluginIds.has(item.pluginId),
			),
		[enabledPluginIds],
	)

	const isItemConnected = useCallback(
		(item: Item): boolean => {
			if (item.kind === "plugin") {
				return activePluginById.has(item.pluginId)
			}
			if (item.kind === "connector") {
				return connectionsByProvider[item.provider].length > 0
			}
			return false
		},
		[activePluginById, connectionsByProvider],
	)

	const counts = useMemo<Record<CategoryFilter, number>>(
		() => ({
			all: allItems.length,
			connected: allItems.filter(isItemConnected).length,
			plugins: allItems.filter((i) => itemCategory(i) === "plugins").length,
			"knowledge-bases": allItems.filter(
				(i) => itemCategory(i) === "knowledge-bases",
			).length,
			"apps-extensions": allItems.filter(
				(i) => itemCategory(i) === "apps-extensions",
			).length,
			"ai-clients": allItems.filter((i) => itemCategory(i) === "ai-clients")
				.length,
		}),
		[allItems, isItemConnected],
	)

	useEffect(() => {
		if (category !== "all" && counts[category] === 0) {
			void setCategory("all")
		}
	}, [category, counts, setCategory])

	const claudeCodeConnected = activePluginById.has("claude_code")
	const claudeCodeNeedsPro =
		!isAutumnLoading && !hasProProduct && !isFreeTierPlugin("claude_code")

	const featuredPicks: FeaturedPick[] = [
		{
			id: "feat-poke",
			name: "Poke",
			emoji: "🌴",
			headline: "Your memory, one text away.",
			support: "recall and save anything by texting Poke",
			tagline: "Connect Poke to recall and save memories over text.",
			icon: (
				<Image
					src="/images/poke.png"
					alt="Poke"
					width={32}
					height={32}
					className="rounded"
				/>
			),
			backdrop: (
				<Image
					src="/images/poke.png"
					alt=""
					width={360}
					height={360}
					className="object-contain"
				/>
			),
			ctaLabel: "Connect",
			onCta: () => {
				window.open(POKE_RECIPE_URL, "_blank", "noopener,noreferrer")
			},
		},
		{
			id: "feat-mcp",
			name: "Supermemory MCP",
			headline: "Your AI tools forget everything between chats.",
			support: "one setup gives Cursor, Claude & ChatGPT your memory",
			tagline: "Plug your memory into any MCP client.",
			icon: <MCPIcon className="size-8" />,
			backdrop: (
				<Image
					src="/onboarding/mcp.png"
					alt=""
					width={380}
					height={380}
					className="object-contain"
				/>
			),
			docsUrl: "https://docs.supermemory.ai/supermemory-mcp/introduction",
			ctaLabel: "Connect",
			onCta: () => {
				void setMcpClient(null)
				setViewMode("mcp")
			},
		},
		{
			id: "feat-claude-code",
			name: "Claude Code plugin",
			headline: "Stop re-explaining your codebase every session.",
			support: "remembers your conventions, decisions & project context",
			tagline: "Long-term memory for your Claude Code sessions.",
			icon: (
				<Image
					src="/images/plugins/claude-code.svg"
					alt="Claude Code"
					width={32}
					height={32}
					className="rounded"
				/>
			),
			backdrop: (
				<Image
					src="/images/plugins/claude-code.svg"
					alt=""
					width={360}
					height={360}
					className="object-contain"
				/>
			),
			docsUrl: "https://docs.supermemory.ai/integrations/claude-code",
			ctaLabel: claudeCodeConnected
				? "Active"
				: claudeCodeNeedsPro
					? "Upgrade"
					: "Connect",
			onCta: () => {
				if (claudeCodeConnected) return
				if (claudeCodeNeedsPro) {
					handleUpgrade()
					return
				}
				createPluginKeyMutation.mutate("claude_code")
			},
		},
		{
			id: "feat-chrome",
			name: "Chrome Extension",
			headline: "That article you'll “read later”? Gone by next week.",
			support: "save anything on the web in one click",
			tagline: "Save anything on the web, straight from your browser.",
			icon: <ChromeIcon className="size-8" />,
			backdrop: <ChromeIcon className="size-96" />,
			ctaLabel: "Connect",
			onCta: () => {
				window.open(CHROME_EXTENSION_URL, "_blank", "noopener,noreferrer")
				analytics.onboardingChromeExtensionClicked({ source: "integrations" })
			},
		},
	]

	const q = search.trim().toLowerCase()
	const visibleItems = allItems.filter((item) => {
		if (category === "connected" && !isItemConnected(item)) return false
		if (
			category !== "all" &&
			category !== "connected" &&
			itemCategory(item) !== category
		)
			return false
		if (q) {
			const hay = `${item.name} ${item.tagline}`.toLowerCase()
			if (!hay.includes(q)) return false
		}
		return true
	})

	const trackCard = (item: Item) =>
		analytics.integrationCardClicked({
			kind: item.kind,
			id: item.id,
			name: item.name,
		})

	const renderRight = (item: Item): ReactNode => {
		switch (item.kind) {
			case "plugin": {
				const activeKey = activePluginById.get(item.pluginId)
				const activeCount = activeCountByPlugin.get(item.pluginId) ?? 0
				const needsProUpgrade =
					!isAutumnLoading && !hasProProduct && !isFreeTierPlugin(item.pluginId)
				if (activeKey) {
					const busy = connectingPlugin === item.pluginId
					return (
						<div className="flex w-full items-center justify-between gap-2">
							<ActiveButton
								count={activeCount}
								lastActive={activeKey.lastRequest}
								onClick={() => {
									trackCard(item)
									setConnectedPluginId(item.pluginId)
								}}
							/>
							<button
								type="button"
								aria-label={`Connect ${item.name} to another agent`}
								title="Connect another agent"
								onClick={() => {
									if (needsProUpgrade) {
										handleUpgrade()
										return
									}
									trackCard(item)
									createPluginKeyMutation.mutate(item.pluginId)
								}}
								disabled={!!connectingPlugin}
								className={cn(
									"flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0D121A] text-[#A1A1AA] transition-colors hover:text-[#FAFAFA] disabled:opacity-50 sm:size-9",
									"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
								)}
							>
								{busy ? (
									<Loader className="size-3.5 animate-spin" />
								) : (
									<Plus className="size-4" />
								)}
							</button>
						</div>
					)
				}
				if (setupPluginIds.has(item.pluginId)) {
					return (
						<FinishSetupButton
							onClick={() => {
								trackCard(item)
								setFinishSetupPluginId(item.pluginId)
							}}
						/>
					)
				}
				if (needsProUpgrade) {
					return (
						<PillButton onClick={handleUpgrade}>
							<Zap className="size-3.5 text-[#4BA0FA]" /> Upgrade
						</PillButton>
					)
				}
				const busy = connectingPlugin === item.pluginId
				return (
					<PillButton
						onClick={() => {
							trackCard(item)
							createPluginKeyMutation.mutate(item.pluginId)
						}}
						disabled={!!connectingPlugin}
					>
						{busy ? (
							<>
								<Loader className="size-3.5 animate-spin" /> Connecting…
							</>
						) : (
							"Connect"
						)}
					</PillButton>
				)
			}
			case "connector": {
				const count = connectionsByProvider[item.provider].length
				const needsProUpgrade = !isAutumnLoading && !hasProProduct
				if (count > 0) {
					return (
						<div className="flex w-full items-center justify-between gap-2">
							<ConnectionsCountPill count={count} />
							<button
								type="button"
								aria-label="Add another knowledge source"
								title="Add another knowledge source"
								onClick={() => {
									trackCard(item)
									void setAddDoc("connect")
								}}
								className={cn(
									"flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0D121A] text-[#A1A1AA] transition-colors hover:text-[#FAFAFA] sm:size-9",
									"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
								)}
							>
								<Plus className="size-4" />
							</button>
						</div>
					)
				}
				if (needsProUpgrade) {
					return (
						<PillButton onClick={handleUpgrade}>
							<Zap className="size-3.5 text-[#4BA0FA]" /> Upgrade
						</PillButton>
					)
				}
				const busy = connectingProvider === item.provider
				return (
					<PillButton
						onClick={() => {
							trackCard(item)
							addConnectionMutation.mutate(item.provider)
						}}
						disabled={!!connectingProvider}
					>
						{busy ? (
							<>
								<Loader className="size-3.5 animate-spin" /> Connecting…
							</>
						) : (
							"Connect"
						)}
					</PillButton>
				)
			}
			case "client": {
				if (item.action.type === "external") {
					return (
						<PillButton
							onClick={() => {
								trackCard(item)
								window.open(
									(item.action as { type: "external"; href: string }).href,
									"_blank",
									"noopener,noreferrer",
								)
								if (item.id === "chrome") {
									analytics.onboardingChromeExtensionClicked({
										source: "integrations",
									})
								}
							}}
						>
							Connect
						</PillButton>
					)
				}
				return (
					<PillButton
						onClick={() => {
							trackCard(item)
							setViewMode(
								(item.action as { type: "view"; viewMode: ViewParamValue })
									.viewMode,
							)
						}}
					>
						Connect
					</PillButton>
				)
			}
			case "mcp-client":
				return (
					<PillButton
						onClick={() => {
							trackCard(item)
							openMcpClient(item.clientKey)
						}}
					>
						Connect
					</PillButton>
				)
			case "import":
				return (
					<PillButton
						onClick={() => {
							trackCard(item)
							setViewMode(item.viewMode)
						}}
					>
						Connect
					</PillButton>
				)
		}
	}

	const renderItemCard = (item: Item) => (
		<ItemCard
			key={item.id}
			icon={item.icon}
			name={item.name}
			tagline={item.tagline}
			pro={item.pro}
			isNew={item.isNew}
			docsUrl={item.docsUrl}
			leftIndicator={renderLeftIndicator(item)}
			rightSlot={renderRight(item)}
		/>
	)

	const renderLeftIndicator = (_item: Item): ReactNode => {
		return null
	}

	const dialogPlugin = newKey.pluginId
		? PLUGIN_CATALOG[newKey.pluginId]
		: undefined
	const connectedDialogPlugin = connectedPluginId
		? PLUGIN_CATALOG[connectedPluginId]
		: undefined
	const connectedDialogKeys = connectedPluginId
		? activePlugins.filter((key) => key.pluginId === connectedPluginId)
		: []
	const connectedDialogNeedsPro =
		!!connectedPluginId &&
		!isAutumnLoading &&
		!hasProProduct &&
		!isFreeTierPlugin(connectedPluginId)
	const finishSetupPlugin = finishSetupPluginId
		? PLUGIN_CATALOG[finishSetupPluginId]
		: undefined
	const finishSetupSteps = finishSetupPlugin?.installSteps ?? []
	const pluginSteps = dialogPlugin?.installSteps ?? []
	const stepsEmbedKey = pluginSteps.some((s) => s.code?.includes("sm_..."))
	const skipGeneratedKeyStep = stepsEmbedKey || !!dialogPlugin?.usesOAuth
	const setupSteps: InstallStep[] = skipGeneratedKeyStep
		? pluginSteps
		: [
				{
					title: "Copy your API key",
					description:
						"You won't be able to see it again — store it somewhere safe.",
					code: newKey.key,
					copyLabel: "API key",
					secret: true,
				},
				...pluginSteps,
			]

	return (
		<div className="flex-1 p-4 md:p-6 pt-2">
			<div className="mx-auto flex max-w-5xl flex-col gap-5">
				{!q && <FeaturedHero picks={featuredPicks} />}

				<div
					className={cn(
						"relative overflow-hidden rounded-[14px] bg-[#191D24] p-4 sm:p-6",
						"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
					)}
				>
					<div className="mb-4 flex items-center justify-between gap-2">
						<div className="min-w-0 shrink">
							<CategoryFilterToggle
								value={category}
								onChange={(v) => void setCategory(v)}
								counts={counts}
								compact={searchExpanded || !!search}
							/>
						</div>
						<SearchToggle
							value={search}
							onChange={setSearch}
							expanded={searchExpanded}
							setExpanded={setSearchExpanded}
						/>
					</div>
					{visibleItems.length === 0 ? (
						<p
							className={cn(
								dmSans125ClassName(),
								"py-6 text-center text-[13px] text-[#A1A1AA]",
							)}
						>
							{q
								? `No integrations match “${search}”.`
								: "Nothing in this category yet."}
						</p>
					) : q || category !== "all" ? (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{visibleItems.map((item) => renderItemCard(item))}
						</div>
					) : (
						<div className="flex flex-col gap-6">
							{SECTION_ORDER.map((cat) => {
								const items = visibleItems.filter(
									(i) => itemCategory(i) === cat,
								)
								if (items.length === 0) return null
								return (
									<SectionRail key={cat} label={CATEGORY_LABEL[cat]}>
										{items.map((item) => (
											<div key={item.id} className="w-[280px] shrink-0">
												{renderItemCard(item)}
											</div>
										))}
									</SectionRail>
								)
							})}
						</div>
					)}
				</div>
			</div>

			<Dialog
				open={newKey.open}
				onOpenChange={(open) =>
					setNewKey((s) => ({
						open,
						key: open ? s.key : "",
						pluginId: open ? s.pluginId : null,
					}))
				}
			>
				<DialogContent
					showCloseButton={false}
					style={{
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0,0,0,0.25), 0.711px 0.711px 0.711px 0 rgba(255,255,255,0.10) inset",
					}}
					className={cn(
						dmSans125ClassName(),
						"flex max-h-[88dvh] flex-col gap-3 overflow-hidden border border-white/[0.12] bg-[#1B1F24] p-0 px-3 pt-3 pb-4 rounded-2xl md:px-4 sm:max-w-[560px] sm:rounded-[22px]",
					)}
				>
					<DialogTitle className="sr-only">
						Set up {dialogPlugin?.name ?? "your plugin"}
					</DialogTitle>
					<div className="flex shrink-0 items-center gap-3">
						{dialogPlugin && (
							<IconBox>
								<Image
									src={dialogPlugin.icon}
									alt={dialogPlugin.name}
									width={24}
									height={24}
								/>
							</IconBox>
						)}
						<div className="min-w-0 flex-1">
							<p className="truncate text-[16px] font-semibold leading-tight text-[#FAFAFA]">
								Set up {dialogPlugin?.name ?? "your plugin"}
							</p>
							<p className="mt-0.5 truncate text-[12px] text-[#A1A1AA]">
								Copy your key and run these steps to finish.
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							{dialogPlugin?.docsUrl && (
								<a
									href={dialogPlugin.docsUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={cn(
										dmSans125ClassName(),
										"flex h-7 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] text-[#A1A1AA] transition-colors hover:text-white",
										INSET,
									)}
								>
									<BookOpen className="size-3.5" /> Docs
								</a>
							)}
							<DialogPrimitive.Close
								type="button"
								aria-label="Close"
								className={cn(
									"flex size-7 items-center justify-center rounded-full bg-[#0D121A] transition-opacity hover:opacity-80 focus:outline-none",
									INSET,
								)}
							>
								<X className="size-4 text-[#737373]" />
							</DialogPrimitive.Close>
						</div>
					</div>
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
						<div
							className={cn(
								"min-w-0 rounded-[14px] bg-[#14161A] p-4 sm:p-5",
								INSET,
							)}
						>
							<InstallSteps steps={setupSteps} apiKey={newKey.key} />
						</div>
					</div>
					<div className="flex shrink-0 items-center justify-end">
						<button
							type="button"
							onClick={() =>
								setNewKey({ open: false, key: "", pluginId: null })
							}
							className={cn(
								dmSans125ClassName(),
								"flex h-9 items-center gap-1.5 rounded-full bg-[#0D121A] px-5 text-[13px] font-medium text-[#FAFAFA] transition-opacity hover:opacity-80",
								INSET,
							)}
						>
							<Check className="size-3.5 text-[#4BA0FA]" /> Done
						</button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!connectedPluginId}
				onOpenChange={(open) => {
					if (!open) setConnectedPluginId(null)
				}}
			>
				<DialogContent
					showCloseButton={false}
					style={{
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0,0,0,0.25), 0.711px 0.711px 0.711px 0 rgba(255,255,255,0.10) inset",
					}}
					className={cn(
						dmSans125ClassName(),
						"flex max-h-[88dvh] flex-col gap-3 overflow-hidden border border-white/[0.12] bg-[#1B1F24] p-0 px-3 pt-3 pb-4 rounded-2xl md:px-4 sm:max-w-[520px] sm:rounded-[22px]",
					)}
				>
					<DialogTitle className="sr-only">
						{connectedDialogPlugin?.name ?? "Plugin"} connection
					</DialogTitle>
					<div className="flex shrink-0 items-center gap-3">
						{connectedDialogPlugin && (
							<IconBox>
								<Image
									src={connectedDialogPlugin.icon}
									alt={connectedDialogPlugin.name}
									width={24}
									height={24}
								/>
							</IconBox>
						)}
						<div className="min-w-0 flex-1">
							<p className="truncate text-[16px] font-semibold leading-tight text-[#FAFAFA]">
								{connectedDialogPlugin?.name ?? "Plugin"}
							</p>
							<p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#00AC3F]">
								<span className="size-[7px] rounded-full bg-[#00AC3F]" />
								Active
								{activePluginById.get(connectedPluginId ?? "")?.lastRequest && (
									<span className="text-[#737373]">
										·{" "}
										{formatRelativeTime(
											activePluginById.get(connectedPluginId ?? "")
												?.lastRequest,
										)}
									</span>
								)}
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							{connectedDialogPlugin?.docsUrl && (
								<a
									href={connectedDialogPlugin.docsUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={cn(
										dmSans125ClassName(),
										"flex h-7 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] text-[#A1A1AA] transition-colors hover:text-white",
										INSET,
									)}
								>
									<BookOpen className="size-3.5" /> Docs
								</a>
							)}
							<DialogPrimitive.Close
								type="button"
								aria-label="Close"
								className={cn(
									"flex size-7 items-center justify-center rounded-full bg-[#0D121A] transition-opacity hover:opacity-80 focus:outline-none",
									INSET,
								)}
							>
								<X className="size-4 text-[#737373]" />
							</DialogPrimitive.Close>
						</div>
					</div>
					<div
						className={cn(
							"flex min-w-0 flex-col gap-2 rounded-[14px] bg-[#14161A] p-4",
							INSET,
						)}
					>
						<p className="text-[11px] font-medium uppercase tracking-wide text-[#737373]">
							{connectedDialogKeys.length > 1
								? `${connectedDialogKeys.length} connections`
								: "Connection"}
						</p>
						{connectedDialogKeys.length > 0 ? (
							<div className="flex flex-col gap-1.5">
								{connectedDialogKeys.map((key) => (
									<div
										key={key.keyId}
										className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-[#0D121A]/70 px-3 py-2"
									>
										<span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#A1A1AA]">
											{key.keyStart ? `${key.keyStart}...` : "API key"}
										</span>
										<DisconnectButton
											onConfirm={() => void handleRevokePluginKey(key.keyId)}
										/>
									</div>
								))}
							</div>
						) : (
							<p className="text-[12px] text-[#A1A1AA]">
								No active connection was found.
							</p>
						)}
						<p className="mt-1 text-[12px] text-[#737373]">
							Connect this plugin to another agent to run them in parallel.
						</p>
					</div>
					<div className="flex shrink-0 items-center justify-between gap-2">
						{connectedDialogNeedsPro ? (
							<PillButton onClick={handleUpgrade}>
								<Zap className="size-3.5 text-[#4BA0FA]" /> Upgrade to connect
								more
							</PillButton>
						) : (
							<PillButton
								onClick={() => {
									if (!connectedPluginId) return
									const pluginId = connectedPluginId
									setConnectedPluginId(null)
									createPluginKeyMutation.mutate(pluginId)
								}}
								disabled={!!connectingPlugin}
							>
								{connectingPlugin === connectedPluginId ? (
									<>
										<Loader className="size-3.5 animate-spin" /> Connecting…
									</>
								) : (
									<>
										<Plus className="size-3.5 text-[#4BA0FA]" /> Connect another
									</>
								)}
							</PillButton>
						)}
						<DialogPrimitive.Close asChild>
							<button
								type="button"
								className={cn(
									dmSans125ClassName(),
									"flex h-9 items-center gap-1.5 rounded-full bg-[#0D121A] px-5 text-[13px] font-medium text-[#FAFAFA] transition-opacity hover:opacity-80",
									INSET,
								)}
							>
								<Check className="size-3.5 text-[#4BA0FA]" /> Done
							</button>
						</DialogPrimitive.Close>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!finishSetupPluginId}
				onOpenChange={(open) => {
					if (!open) setFinishSetupPluginId(null)
				}}
			>
				<DialogContent
					showCloseButton={false}
					style={{
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0,0,0,0.25), 0.711px 0.711px 0.711px 0 rgba(255,255,255,0.10) inset",
					}}
					className={cn(
						dmSans125ClassName(),
						"flex max-h-[88dvh] flex-col gap-3 overflow-hidden border border-white/[0.12] bg-[#1B1F24] p-0 px-3 pt-3 pb-4 rounded-2xl md:px-4 sm:max-w-[560px] sm:rounded-[22px]",
					)}
				>
					<DialogTitle className="sr-only">
						Finish setup {finishSetupPlugin?.name ?? "plugin"}
					</DialogTitle>
					<div className="flex shrink-0 items-center gap-3">
						{finishSetupPlugin && (
							<IconBox>
								<Image
									src={finishSetupPlugin.icon}
									alt={finishSetupPlugin.name}
									width={24}
									height={24}
								/>
							</IconBox>
						)}
						<div className="min-w-0 flex-1">
							<p className="truncate text-[16px] font-semibold leading-tight text-[#FAFAFA]">
								Finish setup {finishSetupPlugin?.name ?? "plugin"}
							</p>
							<p className="mt-0.5 truncate text-[12px] text-[#A1A1AA]">
								Complete install in the tool — this card turns active after the
								first API call.
							</p>
						</div>
						<DialogPrimitive.Close
							type="button"
							aria-label="Close"
							className={cn(
								"flex size-7 items-center justify-center rounded-full bg-[#0D121A] transition-opacity hover:opacity-80 focus:outline-none",
								INSET,
							)}
						>
							<X className="size-4 text-[#737373]" />
						</DialogPrimitive.Close>
					</div>
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
						<div
							className={cn(
								"min-w-0 rounded-[14px] bg-[#14161A] p-4 sm:p-5",
								INSET,
							)}
						>
							{finishSetupSteps.length > 0 ? (
								<InstallSteps steps={finishSetupSteps} />
							) : (
								<p className="text-[13px] text-[#A1A1AA]">
									Open {finishSetupPlugin?.name ?? "the plugin"} and finish
									authentication, then send a test memory.
								</p>
							)}
						</div>
					</div>
					<div className="flex shrink-0 items-center justify-end">
						<DialogPrimitive.Close asChild>
							<button
								type="button"
								className={cn(
									dmSans125ClassName(),
									"flex h-9 items-center gap-1.5 rounded-full bg-[#0D121A] px-5 text-[13px] font-medium text-[#FAFAFA] transition-opacity hover:opacity-80",
									INSET,
								)}
							>
								<Check className="size-3.5 text-[#4BA0FA]" /> Done
							</button>
						</DialogPrimitive.Close>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={mcpModalOpen}
				onOpenChange={(open) => {
					if (!open) closeMcpModal()
					else setMcpModalOpen(true)
				}}
			>
				<DialogContent
					showCloseButton={false}
					style={{
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0,0,0,0.25), 0.711px 0.711px 0.711px 0 rgba(255,255,255,0.10) inset",
					}}
					className={cn(
						dmSans125ClassName(),
						"flex max-h-[88dvh] flex-col gap-3 overflow-hidden border border-white/[0.12] bg-[#1B1F24] p-0 px-3 pt-3 pb-4 rounded-2xl md:px-4 sm:max-w-[640px] sm:rounded-[22px]",
					)}
				>
					<DialogTitle className="sr-only">
						Set up {activeMcpClient?.name ?? "MCP client"}
					</DialogTitle>
					<div className="flex shrink-0 items-center gap-3">
						<IconBox>
							{activeMcpClient && activeMcpClient.key !== "mcp-url" ? (
								<Image
									src={mcpClientIconSrc(activeMcpClient.key)}
									alt={activeMcpClient.name}
									width={24}
									height={24}
									unoptimized
									className="size-6 rounded object-contain"
								/>
							) : (
								<MCPIcon className="size-6" />
							)}
						</IconBox>
						<div className="min-w-0 flex-1">
							<p className="truncate text-[16px] font-semibold leading-tight text-[#FAFAFA]">
								Set up {activeMcpClient?.name ?? "MCP client"}
							</p>
							<p className="mt-0.5 truncate text-[12px] text-[#A1A1AA]">
								Connect supermemory MCP to{" "}
								{activeMcpClient?.name ?? "your client"}.
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<a
								href="https://docs.supermemory.ai/supermemory-mcp/introduction"
								target="_blank"
								rel="noopener noreferrer"
								className={cn(
									dmSans125ClassName(),
									"flex h-7 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] text-[#A1A1AA] transition-colors hover:text-white",
									INSET,
								)}
							>
								<BookOpen className="size-3.5" /> Docs
							</a>
							<DialogPrimitive.Close
								type="button"
								aria-label="Close"
								className={cn(
									"flex size-7 items-center justify-center rounded-full bg-[#0D121A] transition-opacity hover:opacity-80 focus:outline-none",
									INSET,
								)}
							>
								<X className="size-4 text-[#737373]" />
							</DialogPrimitive.Close>
						</div>
					</div>
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
						<div
							className={cn(
								"min-w-0 rounded-[14px] bg-[#14161A] p-4 sm:p-5",
								INSET,
							)}
						>
							<MCPSteps variant="embedded" />
						</div>
					</div>
					<div className="flex shrink-0 items-center justify-end">
						<button
							type="button"
							onClick={closeMcpModal}
							className={cn(
								dmSans125ClassName(),
								"flex h-9 items-center gap-1.5 rounded-full bg-[#0D121A] px-5 text-[13px] font-medium text-[#FAFAFA] transition-opacity hover:opacity-80",
								INSET,
							)}
						>
							<Check className="size-3.5 text-[#4BA0FA]" /> Done
						</button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
