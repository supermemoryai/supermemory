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
	ChevronDown,
	Loader,
	Search,
	X,
	Zap,
} from "lucide-react"
import { CHROME_EXTENSION_URL } from "@lib/constants"
import { analytics } from "@/lib/analytics"
import Image from "next/image"
import { useViewMode } from "@/lib/view-mode-context"
import type { ViewParamValue } from "@/lib/search-params"
import { parseAsString, parseAsStringEnum, useQueryState } from "nuqs"
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
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import {
	PLUGIN_CATALOG,
	FREE_TIER_PLUGIN_IDS,
	isFreeTierPlugin,
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
	connected: "Connected",
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
				"shrink-0 rounded-[4px] border border-[#4BA0FA]/25 bg-[#4BA0FA]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4BA0FA]",
			)}
		>
			Pro
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

function ConnectedPill({
	keys,
	onRevoke,
}: {
	keys: ConnectedKey[]
	onRevoke: (keyId: string) => void
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					onClick={(e) => e.stopPropagation()}
					className={cn(
						dmSans125ClassName(),
						"flex h-8 min-w-[104px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] font-medium text-[#00AC3F] sm:h-9 sm:min-w-[116px] sm:gap-2 sm:px-4 sm:text-[13px]",
						"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80",
					)}
				>
					<span className="size-[7px] rounded-full bg-[#00AC3F]" />
					Connected
					<ChevronDown className="size-3 text-[#737373]" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				onClick={(e) => e.stopPropagation()}
				className={cn(
					dmSans125ClassName(),
					"w-[260px] rounded-xl border border-white/10 bg-[#1B1F24] p-2 text-[#FAFAFA]",
				)}
			>
				<p className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-[#737373]">
					{keys.length > 1 ? `${keys.length} connections` : "Connection"}
				</p>
				<div className="flex flex-col">
					{keys.map((k) => (
						<div
							key={k.keyId}
							className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
						>
							<span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#A1A1AA]">
								{k.keyStart ? `${k.keyStart}…` : "API key"}
							</span>
							<DisconnectButton onConfirm={() => onRevoke(k.keyId)} />
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	)
}

function ConnectionsCountPill({ count }: { count: number }) {
	return (
		<span
			className={cn(
				dmSans125ClassName(),
				"flex h-8 min-w-[104px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] font-medium text-[#00AC3F] sm:h-9 sm:min-w-[116px] sm:gap-2 sm:px-4 sm:text-[13px]",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
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
	docsUrl,
	leftIndicator,
	rightSlot,
}: {
	icon: ReactNode
	name: string
	tagline: string
	pro?: boolean
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
					<div className="flex min-w-0 items-center gap-1.5">
						{leftIndicator}
						<span
							className={cn(
								dmSans125ClassName(),
								"min-w-0 truncate text-[14px] font-medium text-[#FAFAFA]",
							)}
						>
							{name}
						</span>
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
		<button
			type="button"
			onClick={pick.onCta}
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocus={() => setPaused(true)}
			onBlur={() => setPaused(false)}
			className={cn(
				"group relative w-full overflow-hidden rounded-[14px] px-5 py-5 sm:px-6 sm:py-6 text-left cursor-pointer",
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
						<span className="font-medium text-[#CBD5E1]">{pick.name}</span> ·{" "}
						{pick.support}
					</p>
				</motion.div>
			</AnimatePresence>
		</button>
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

	type ApiKey = {
		id: string
		metadata: Record<string, unknown> | null
		start: string | null
	}
	const { data: apiKeys = [], refetch: refetchKeys } = useQuery({
		queryKey: ["api-keys", org?.id],
		queryFn: async () => {
			if (!org?.id) return []
			const data = (await authClient.apiKey.list({
				fetchOptions: { query: { metadata: { organizationId: org.id } } },
			})) as unknown as ApiKey[]
			return data.filter((key) => key.metadata?.organizationId === org.id)
		},
		enabled: !!org?.id,
		staleTime: 30 * 1000,
	})

	const connectedPlugins = useMemo<ConnectedKey[]>(() => {
		const out: ConnectedKey[] = []
		for (const key of apiKeys) {
			if (!key.metadata) continue
			try {
				const metadata =
					typeof key.metadata === "string"
						? (JSON.parse(key.metadata) as {
								sm_type?: string
								sm_client?: string
							})
						: (key.metadata as { sm_type?: string; sm_client?: string })
				if (metadata.sm_type === "plugin_auth" && metadata.sm_client) {
					out.push({
						keyId: key.id,
						keyStart: key.start ?? null,
						pluginId: metadata.sm_client,
					})
				}
			} catch {}
		}
		return out
	}, [apiKeys])

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
		onMutate: (provider) => setConnectingProvider(provider),
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
				return connectedPlugins.some((k) => k.pluginId === item.pluginId)
			}
			if (item.kind === "connector") {
				return connectionsByProvider[item.provider].length > 0
			}
			return false
		},
		[connectedPlugins, connectionsByProvider],
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

	const claudeCodeConnected = connectedPlugins.some(
		(k) => k.pluginId === "claude_code",
	)
	const claudeCodeNeedsPro =
		!isAutumnLoading && !hasProProduct && !isFreeTierPlugin("claude_code")

	const featuredPicks: FeaturedPick[] = [
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
				? "Connected"
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

	const renderRight = (item: Item): ReactNode => {
		switch (item.kind) {
			case "plugin": {
				const keys = connectedPlugins.filter(
					(k) => k.pluginId === item.pluginId,
				)
				const needsProUpgrade =
					!isAutumnLoading && !hasProProduct && !isFreeTierPlugin(item.pluginId)
				if (keys.length > 0) {
					return <ConnectedPill keys={keys} onRevoke={handleRevokePluginKey} />
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
						onClick={() => createPluginKeyMutation.mutate(item.pluginId)}
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
				if (count > 0) return <ConnectionsCountPill count={count} />
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
						onClick={() => addConnectionMutation.mutate(item.provider)}
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
								window.open(
									(item.action as { type: "external"; href: string }).href,
									"_blank",
									"noopener,noreferrer",
								)
								analytics.onboardingChromeExtensionClicked({
									source: "integrations",
								})
							}}
						>
							Connect
						</PillButton>
					)
				}
				return (
					<PillButton
						onClick={() =>
							setViewMode(
								(item.action as { type: "view"; viewMode: ViewParamValue })
									.viewMode,
							)
						}
					>
						Connect
					</PillButton>
				)
			}
			case "mcp-client":
				return (
					<PillButton onClick={() => openMcpClient(item.clientKey)}>
						Connect
					</PillButton>
				)
			case "import":
				return (
					<PillButton onClick={() => setViewMode(item.viewMode)}>
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
			docsUrl={item.docsUrl}
			leftIndicator={renderLeftIndicator(item)}
			rightSlot={renderRight(item)}
		/>
	)

	const renderLeftIndicator = (item: Item): ReactNode => {
		if (item.kind === "plugin") {
			const isConnected = connectedPlugins.some(
				(k) => k.pluginId === item.pluginId,
			)
			return isConnected ? (
				<span className="size-1.5 shrink-0 rounded-full bg-[#00AC3F]" />
			) : null
		}
		if (item.kind === "connector") {
			const count = connectionsByProvider[item.provider].length
			return count > 0 ? (
				<span className="size-1.5 shrink-0 rounded-full bg-[#00AC3F]" />
			) : null
		}
		return null
	}

	const dialogPlugin = newKey.pluginId
		? PLUGIN_CATALOG[newKey.pluginId]
		: undefined
	const pluginSteps = dialogPlugin?.installSteps ?? []
	const stepsEmbedKey = pluginSteps.some((s) => s.code?.includes("sm_..."))
	const setupSteps: InstallStep[] = stepsEmbedKey
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
				{!q && category !== "connected" && (
					<FeaturedHero picks={featuredPicks} />
				)}

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
					) : q ? (
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
