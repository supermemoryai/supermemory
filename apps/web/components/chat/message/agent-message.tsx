"use client"

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import type { UIMessage } from "@ai-sdk/react"
import { Streamdown } from "streamdown"
import {
	BookOpenIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	ClockIcon,
	CopyIcon,
	ExternalLinkIcon,
	GlobeIcon,
	ListIcon,
	Loader2,
	PlusIcon,
	SearchIcon,
	TerminalIcon,
	WrenchIcon,
	XCircleIcon,
	ZapIcon,
} from "lucide-react"
import { cn } from "@lib/utils"
import { isWebSearchToolName } from "@/lib/chat-web-search-tools"
import { modelNames, type ModelId } from "@/lib/models"
import { RelatedMemories } from "./related-memories"
import { MessageActions } from "./message-actions"

const TOOL_META: Record<string, { label: string; icon: typeof SearchIcon }> = {
	bash: { label: "Memory", icon: TerminalIcon },
	web_search: { label: "Web search", icon: GlobeIcon },
	google_search: { label: "Google search", icon: GlobeIcon },
	// legacy tool names kept for existing persisted messages
	searchMemories: { label: "Search Memories", icon: SearchIcon },
	addMemory: { label: "Add Memory", icon: PlusIcon },
	fetchMemory: { label: "Fetch Memory", icon: BookOpenIcon },
	scheduleTask: { label: "Schedule Task", icon: ClockIcon },
	listSchedules: { label: "List Schedules", icon: ListIcon },
	cancelSchedule: { label: "Cancel Schedule", icon: XCircleIcon },
}

type ToolCallDisplayPart = {
	type: string
	state: string
	input?: unknown
	output?: unknown
	toolCallId?: string
	errorText?: string
}

type SourceUrlPart = {
	type: "source-url"
	sourceId: string
	url: string
	title?: string
}

function sourceHost(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "")
	} catch {
		return url
	}
}

function faviconUrl(host: string): string {
	return `https://www.google.com/s2/favicons?sz=64&domain=${host}`
}

type NovaConnectorStatus =
	| "active"
	| "setup_pending"
	| "not_connected"
	| "upgrade_required"
	| "setup_available"

type NovaConnectorStep = {
	title?: string
	description?: string
	code?: string
	link?: { url: string; label: string }
	createPluginKey?: boolean
}

type NovaConnectorCardData = {
	kind?: "plugin" | "mcp"
	id?: string
	name?: string
	icon?: string
	description?: string
	features?: string[]
	docsUrl?: string
	repoUrl?: string
	installSteps?: NovaConnectorStep[]
	status?: NovaConnectorStatus
	requiresPro?: boolean
	canGenerateKey?: boolean
	keyPluginId?: string
}

type NovaConnectorToolOutput = {
	success?: boolean
	error?: string
	kind?: string
	connectors?: NovaConnectorCardData[]
	connector?: NovaConnectorCardData
	keyReveal?: { pluginId: string; label?: string } | null
	available?: Array<{ kind: "plugin" | "mcp"; id: string; name: string }>
}

const NOVA_CONNECTOR_TOOLS = new Set([
	"listNovaConnectors",
	"getNovaConnectorSetup",
	"prepareNovaPluginSetup",
])

const CONNECTOR_ICON_FALLBACKS: Record<string, string> = {
	codex: "/images/plugins/codex.png",
	cursor: "/images/plugins/cursor.png",
	mcp_cursor: "/mcp-supported-tools/cursor.png",
}

const STATUS_COPY: Record<
	NovaConnectorStatus,
	{ label: string; className: string }
> = {
	active: {
		label: "Active",
		className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
	},
	setup_pending: {
		label: "Finish setup",
		className: "border-amber-400/20 bg-amber-400/10 text-amber-300",
	},
	not_connected: {
		label: "Not connected",
		className: "border-white/10 bg-white/[0.05] text-white/55",
	},
	upgrade_required: {
		label: "Pro required",
		className: "border-[#4BA0FA]/25 bg-[#4BA0FA]/10 text-[#4BA0FA]",
	},
	setup_available: {
		label: "Setup available",
		className: "border-white/10 bg-white/[0.05] text-white/65",
	},
}

function connectorToolName(part: ToolCallDisplayPart): string {
	return part.type.startsWith("tool-")
		? part.type.slice("tool-".length)
		: part.type
}

function connectorToolNameFromPart(part: unknown): string | null {
	if (!part || typeof part !== "object") return null
	const record = part as { type?: string; toolName?: string }
	if (record.type === "dynamic-tool") return record.toolName ?? null
	if (record.type?.startsWith("tool-")) return record.type.slice("tool-".length)
	return null
}

function parseConnectorOutput(value: string): NovaConnectorToolOutput | null {
	try {
		return JSON.parse(value) as NovaConnectorToolOutput
	} catch {
		return null
	}
}

function unwrapToolOutput(output: unknown): NovaConnectorToolOutput | null {
	if (typeof output === "string") {
		return parseConnectorOutput(output)
	}
	if (!output || typeof output !== "object") return null
	const record = output as Record<string, unknown>
	for (const key of ["value", "result", "data", "output"]) {
		const nested = record[key]
		if (nested && nested !== output) {
			const parsed = unwrapToolOutput(nested)
			if (parsed) return parsed
		}
	}
	if (
		record.type === "json" &&
		record.value &&
		typeof record.value === "object"
	) {
		return record.value as NovaConnectorToolOutput
	}
	if (record.type === "text" && typeof record.value === "string") {
		return parseConnectorOutput(record.value)
	}
	if (typeof record.text === "string") {
		return parseConnectorOutput(record.text)
	}
	return record as NovaConnectorToolOutput
}

function connectorIconSrc(
	connector: NovaConnectorCardData,
): string | undefined {
	if (connector.id && CONNECTOR_ICON_FALLBACKS[connector.id]) {
		return CONNECTOR_ICON_FALLBACKS[connector.id]
	}
	if (connector.icon?.endsWith("/codex.svg"))
		return CONNECTOR_ICON_FALLBACKS.codex
	if (connector.icon?.endsWith("/cursor.svg"))
		return CONNECTOR_ICON_FALLBACKS.cursor
	return connector.icon
}

function connectorIdentity(
	output: NovaConnectorToolOutput | null,
): string | null {
	if (!output) return null
	if (output.connectors && output.connectors.length !== 1) return null
	const connector = output.connector ?? output.connectors?.[0]
	if (!connector) return null
	return `${connector.kind ?? "connector"}:${connector.id ?? connector.name ?? ""}`
}

function connectorOutputFromPart(
	part: unknown,
): NovaConnectorToolOutput | null {
	if (!part || typeof part !== "object") return null
	const record = part as {
		type?: string
		toolName?: string
		output?: unknown
	}
	const toolName = connectorToolNameFromPart(record)
	if (!toolName || !NOVA_CONNECTOR_TOOLS.has(toolName)) return null
	return unwrapToolOutput(record.output)
}

function connectorToolPriority(toolName: string | null): number {
	if (toolName === "prepareNovaPluginSetup") return 2
	if (toolName === "getNovaConnectorSetup") return 1
	return 0
}

function shouldSkipNovaConnectorPart(parts: unknown[], index: number): boolean {
	const part = parts[index]
	const toolName = connectorToolNameFromPart(part)
	if (!toolName || !NOVA_CONNECTOR_TOOLS.has(toolName)) return false
	const identity = connectorIdentity(connectorOutputFromPart(part))
	if (!identity) return false
	const priority = connectorToolPriority(toolName)

	for (let i = 0; i < parts.length; i++) {
		if (i === index) continue
		const otherTool = connectorToolNameFromPart(parts[i])
		if (!otherTool || !NOVA_CONNECTOR_TOOLS.has(otherTool)) continue
		const otherIdentity = connectorIdentity(connectorOutputFromPart(parts[i]))
		if (otherIdentity !== identity) continue
		const otherPriority = connectorToolPriority(otherTool)
		if (i < index && otherPriority >= priority) return true
		if (i > index && otherPriority > priority) return true
	}
	return false
}

function StatusPill({ status }: { status?: NovaConnectorStatus }) {
	const copy =
		STATUS_COPY[status ?? "not_connected"] ?? STATUS_COPY.not_connected
	return (
		<span
			className={cn(
				"inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[11px] font-medium",
				copy.className,
			)}
		>
			{copy.label}
		</span>
	)
}

function MiniCopyButton({ text, label }: { text: string; label?: string }) {
	const [copied, setCopied] = useState(false)
	return (
		<button
			type="button"
			aria-label={`Copy ${label ?? "value"}`}
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(text)
					setCopied(true)
					setTimeout(() => setCopied(false), 1800)
				} catch {
					setCopied(false)
				}
			}}
			className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0D121A] text-white/45 transition-colors hover:text-white/80"
		>
			{copied ? (
				<CheckIcon className="size-3.5 text-emerald-300" />
			) : (
				<CopyIcon className="size-3.5" />
			)}
		</button>
	)
}

function ConnectorCodeBlock({
	code,
	apiKey,
}: {
	code: string
	apiKey?: string
}) {
	const rendered = apiKey ? code.replaceAll("sm_...", apiKey) : code
	return (
		<div className="group flex min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-[#080B10] px-3 py-2.5">
			<pre
				className={cn(
					"scrollbar-none min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-[12px] leading-[1.6] text-[#E4E4E7]",
					code.includes("sm_...") &&
						!apiKey &&
						"select-none blur-[4px] transition-[filter] group-hover:blur-none",
				)}
			>
				{rendered}
			</pre>
			<MiniCopyButton text={rendered} label="setup step" />
		</div>
	)
}

function RevealPluginKeyButton({
	pluginId,
	onReveal,
}: {
	pluginId: string
	onReveal: (key: string) => void
}) {
	const [state, setState] = useState<"idle" | "loading" | "copied" | "error">(
		"idle",
	)
	return (
		<button
			type="button"
			disabled={state === "loading"}
			onClick={async () => {
				setState("loading")
				try {
					const API_URL =
						process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
					const params = new URLSearchParams({ client: pluginId })
					const res = await fetch(`${API_URL}/v3/auth/key?${params}`, {
						credentials: "include",
					})
					if (!res.ok) throw new Error("Failed to create plugin key")
					const data = (await res.json()) as { key?: string }
					if (!data.key) throw new Error("Plugin key missing")
					onReveal(data.key)
					await navigator.clipboard.writeText(data.key).catch(() => undefined)
					setState("copied")
					setTimeout(() => setState("idle"), 2200)
				} catch {
					setState("error")
					setTimeout(() => setState("idle"), 2200)
				}
			}}
			className={cn(
				"inline-flex h-8 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] font-medium text-[#FAFAFA]",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80 disabled:opacity-60",
			)}
		>
			{state === "loading" ? (
				<Loader2 className="size-3.5 animate-spin" />
			) : state === "copied" ? (
				<CheckIcon className="size-3.5 text-emerald-300" />
			) : state === "error" ? (
				<XCircleIcon className="size-3.5 text-red-300" />
			) : null}
			{state === "copied"
				? "Key copied"
				: state === "error"
					? "Try again"
					: state === "loading"
						? "Generating"
						: "Generate key"}
		</button>
	)
}

function NovaConnectorCard({
	connector,
}: {
	connector: NovaConnectorCardData
}) {
	const [revealedKey, setRevealedKey] = useState<string | undefined>()
	const needsKey = Boolean(connector.canGenerateKey && connector.keyPluginId)
	const isUpgrade = connector.status === "upgrade_required"
	const iconSrc = connectorIconSrc(connector)
	return (
		<div className="rounded-xl border border-white/[0.08] bg-[#0D121A] p-3 text-sm text-white/90 shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.55)]">
			<div className="flex items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#080B0F]">
					{iconSrc ? (
						<img
							src={iconSrc}
							alt=""
							className="size-6 rounded object-contain"
							onError={(event) => {
								const img = event.currentTarget
								const fallback = connector.id
									? CONNECTOR_ICON_FALLBACKS[connector.id]
									: undefined
								if (fallback && img.dataset.fallbackApplied !== "true") {
									img.dataset.fallbackApplied = "true"
									img.src = fallback
								} else {
									img.style.display = "none"
								}
							}}
						/>
					) : (
						<WrenchIcon className="size-5 text-white/50" />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-center gap-2">
						<p className="truncate text-[14px] font-semibold text-[#FAFAFA]">
							{connector.name ?? connector.id ?? "Connector"}
						</p>
						<StatusPill status={connector.status} />
					</div>
					{connector.description ? (
						<p className="mt-1 text-[12px] leading-snug text-[#A1A1AA]">
							{connector.description}
						</p>
					) : null}
				</div>
			</div>

			{connector.installSteps?.length ? (
				<ol className="mt-3 space-y-3">
					{connector.installSteps.map((step, index) => (
						<li key={`${step.title}-${index}`} className="flex gap-2.5">
							<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#080B10] text-[10px] font-semibold text-[#4BA0FA]">
								{index + 1}
							</span>
							<div className="min-w-0 flex-1 space-y-1.5">
								<p className="text-[12px] font-medium text-[#FAFAFA]">
									{step.title}
								</p>
								{step.description ? (
									<p className="text-[12px] leading-snug text-[#A1A1AA]">
										{step.description}
									</p>
								) : null}
								{step.code ? (
									<ConnectorCodeBlock code={step.code} apiKey={revealedKey} />
								) : null}
								{step.link ? (
									<a
										href={step.link.url}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 text-[12px] text-[#4BA0FA] hover:text-[#86C5FF]"
									>
										{step.link.label}
										<ExternalLinkIcon className="size-3" />
									</a>
								) : null}
							</div>
						</li>
					))}
				</ol>
			) : null}

			<div className="mt-3 flex flex-wrap items-center gap-2">
				{needsKey && connector.keyPluginId && !isUpgrade ? (
					<RevealPluginKeyButton
						pluginId={connector.keyPluginId}
						onReveal={setRevealedKey}
					/>
				) : null}
				{isUpgrade ? (
					<span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] font-medium text-[#4BA0FA]">
						<ZapIcon className="size-3.5" />
						Upgrade to connect
					</span>
				) : null}
				{connector.docsUrl ? (
					<a
						href={connector.docsUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] text-[#A1A1AA] transition-colors hover:text-white"
					>
						<BookOpenIcon className="size-3.5" />
						Docs
					</a>
				) : null}
			</div>
		</div>
	)
}

function NovaConnectorCompactCard({
	connector,
}: {
	connector: NovaConnectorCardData
}) {
	const iconSrc = connectorIconSrc(connector)
	return (
		<div className="group min-w-0 rounded-xl focus-within:sm:col-span-2 hover:sm:col-span-2">
			<button
				type="button"
				className="flex min-h-14 w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0D121A] px-2.5 py-2 text-left transition-colors hover:border-white/[0.14] hover:bg-[#111820] focus:outline-none focus-visible:border-[#4BA0FA]/50"
			>
				<div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#080B0F]">
					{iconSrc ? (
						<img
							src={iconSrc}
							alt=""
							className="size-5 rounded object-contain"
							onError={(event) => {
								event.currentTarget.style.display = "none"
							}}
						/>
					) : (
						<WrenchIcon className="size-4 text-white/50" />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-[12px] font-semibold text-[#FAFAFA]">
						{connector.name ?? connector.id ?? "Connector"}
					</p>
					<p className="mt-0.5 truncate text-[11px] text-[#737373]">
						{connector.kind === "mcp" ? "MCP" : "Plugin"}
					</p>
				</div>
				<StatusPill status={connector.status} />
			</button>
			<div className="hidden pt-2 group-hover:block group-focus-within:block">
				<NovaConnectorCard connector={connector} />
			</div>
		</div>
	)
}

function NovaConnectorToolDisplay({ part }: { part: ToolCallDisplayPart }) {
	const toolName = connectorToolName(part)
	const output = unwrapToolOutput(part.output)
	const isLoading =
		part.state === "input-streaming" || part.state === "input-available"
	const isError = part.state === "error" || part.state === "output-error"
	if (isLoading) {
		return (
			<div className="my-2 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0D121A] px-3 py-2 text-xs text-white/55">
				<Loader2 className="size-3.5 animate-spin text-[#4BA0FA]" />
				<span>Checking Supermemory setup…</span>
			</div>
		)
	}
	if (isError) {
		return (
			<div className="my-2 rounded-xl border border-red-400/15 bg-red-400/10 px-3 py-2 text-xs text-red-200">
				Couldn't load connector setup.
			</div>
		)
	}
	if (!output) return null
	if (output.success === false) {
		return (
			<div className="my-2 rounded-xl border border-white/[0.08] bg-[#0D121A] p-3 text-sm text-white/80">
				<p className="font-medium text-[#FAFAFA]">
					{output.error ?? "Connector not found"}
				</p>
				{output.available?.length ? (
					<p className="mt-1 text-xs text-[#A1A1AA]">
						Try one of: {output.available.map((item) => item.name).join(", ")}
					</p>
				) : null}
			</div>
		)
	}
	const connectors = output.connector
		? [output.connector]
		: (output.connectors ?? [])
	const isConnectorList =
		toolName === "listNovaConnectors" && connectors.length > 1
	return (
		<div className="my-2 space-y-2">
			{isConnectorList ? (
				<p className="px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#737373]">
					Supermemory setup options
				</p>
			) : null}
			<div
				className={cn(
					isConnectorList && "grid grid-cols-1 gap-2 sm:grid-cols-2",
					!isConnectorList && "space-y-2",
				)}
			>
				{connectors.map((connector) =>
					isConnectorList ? (
						<NovaConnectorCompactCard
							key={`${connector.kind}-${connector.id}-${connector.name}`}
							connector={connector}
						/>
					) : (
						<NovaConnectorCard
							key={`${connector.kind}-${connector.id}-${connector.name}`}
							connector={connector}
						/>
					),
				)}
			</div>
		</div>
	)
}

function isWebSearchPart(part: { type: string; toolName?: string }): boolean {
	if (part.type === "dynamic-tool") {
		return isWebSearchToolName(part.toolName ?? "")
	}
	if (part.type.startsWith("tool-")) {
		return isWebSearchToolName(part.type.slice("tool-".length))
	}
	return false
}

function CitationLink({
	href,
	label,
	source,
}: {
	href: string
	label: string
	source?: SourceUrlPart
}) {
	const url = source?.url ?? href
	const host = sourceHost(url)
	const rawTitle = source?.title?.trim()
	const hasTitle =
		!!rawTitle && rawTitle !== host && !/^https?:\/\//i.test(rawTitle)
	let path = ""
	try {
		path = new URL(url).pathname.replace(/\/$/, "")
	} catch {}
	return (
		<span className="group/cite relative inline">
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-400 no-underline hover:text-blue-300"
			>
				{label}
			</a>
			<span className="pointer-events-none absolute bottom-full left-1/2 z-[1000] hidden -translate-x-1/2 pb-1.5 group-hover/cite:block">
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="pointer-events-auto block w-64 overflow-hidden rounded-lg border border-white/10 bg-[#0B0F16]/95 p-2.5 no-underline shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
				>
					<span className="flex items-center gap-2">
						<img
							src={faviconUrl(host)}
							alt=""
							className="size-4 shrink-0 rounded bg-white/10"
							loading="lazy"
							referrerPolicy="no-referrer"
						/>
						<span className="truncate text-xs font-medium text-white/85">
							{host}
						</span>
					</span>
					{hasTitle ? (
						<span className="mt-1.5 block line-clamp-2 text-xs leading-snug text-white/60">
							{rawTitle}
						</span>
					) : path ? (
						<span className="mt-1 block truncate text-[11px] text-white/35">
							{path}
						</span>
					) : null}
				</a>
			</span>
		</span>
	)
}

function makeMarkdownComponents(sources: SourceUrlPart[]) {
	return {
		a: ({ href, children }: { href?: string; children?: ReactNode }) => {
			const label =
				typeof children === "string"
					? children
					: Array.isArray(children)
						? children.join("")
						: ""
			const match = label.match(/^\[?(\d+)\]?$/)
			if (match && href) {
				const n = Number(match[1])
				const source = sources.find((s) => s.url === href) ?? sources[n - 1]
				return <CitationLink href={href} label={label} source={source} />
			}
			return (
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-400 hover:underline"
				>
					{children}
				</a>
			)
		},
	}
}

function WebSourcesPill({ sources }: { sources: SourceUrlPart[] }) {
	const [expanded, setExpanded] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!expanded) return
		const onDown = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setExpanded(false)
			}
		}
		document.addEventListener("mousedown", onDown)
		return () => document.removeEventListener("mousedown", onDown)
	}, [expanded])

	if (sources.length === 0) return null

	const faviconHosts: string[] = []
	for (const s of sources) {
		const host = sourceHost(s.url)
		if (!faviconHosts.includes(host)) faviconHosts.push(host)
		if (faviconHosts.length >= 3) break
	}
	const count = sources.length

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-2.5 pl-1.5 text-xs text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white/80"
				aria-expanded={expanded}
				aria-label={`${count} web ${count === 1 ? "source" : "sources"}`}
			>
				<span className="flex -space-x-1.5">
					{faviconHosts.length > 0 ? (
						faviconHosts.map((host) => (
							<img
								key={host}
								src={faviconUrl(host)}
								alt=""
								className="size-4 rounded-full border border-[#0B0F16] bg-white/10 object-cover"
								loading="lazy"
								referrerPolicy="no-referrer"
							/>
						))
					) : (
						<GlobeIcon className="size-3.5 text-emerald-400" />
					)}
				</span>
				<span>{count === 1 ? "1 source" : `${count} sources`}</span>
			</button>
			{expanded && (
				<div className="absolute bottom-full left-0 z-[1000] mb-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-[#0B0F16]/95 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
					<ul className="max-h-72 list-none space-y-0.5 overflow-y-auto">
						{sources.map((s) => {
							const host = sourceHost(s.url)
							return (
								<li key={s.sourceId}>
									<a
										href={s.url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.06]"
									>
										<img
											src={faviconUrl(host)}
											alt=""
											className="mt-0.5 size-4 shrink-0 rounded-full bg-white/10"
											loading="lazy"
											referrerPolicy="no-referrer"
										/>
										<span className="min-w-0">
											<span className="block truncate text-white/80">
												{s.title?.trim() || host}
											</span>
											<span className="block truncate text-[11px] text-white/40">
												{host}
											</span>
										</span>
									</a>
								</li>
							)
						})}
					</ul>
				</div>
			)}
		</div>
	)
}

function BashToolDisplay({ part }: { part: ToolCallDisplayPart }) {
	const [expanded, setExpanded] = useState(false)
	const isLoading =
		part.state === "input-streaming" || part.state === "input-available"
	const isDone = part.state === "output-available"
	const isError = part.state === "error" || part.state === "output-error"

	const cmd =
		part.input && typeof part.input === "object" && "cmd" in part.input
			? String((part.input as { cmd: string }).cmd)
			: undefined

	const output =
		isDone && part.output && typeof part.output === "object"
			? (part.output as { stdout?: string; stderr?: string; exitCode?: number })
			: undefined

	const hasOutput =
		output &&
		((output.stdout && output.stdout.length > 0) ||
			(output.stderr && output.stderr.length > 0))
	const errorText = part.errorText
	const hasExpandable = hasOutput || (isError && errorText)

	return (
		<div className="rounded-lg border border-[#1E2128] bg-[#0D121A] text-xs my-1 overflow-hidden font-mono">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className={cn(
					"flex items-center gap-2 w-full px-3 py-2 cursor-pointer hover:bg-[#141922] transition-colors",
					expanded && hasExpandable && "border-b border-[#1E2128]",
				)}
			>
				{isLoading ? (
					<Loader2 className="size-3 animate-spin text-blue-400 shrink-0" />
				) : (
					<TerminalIcon
						className={cn(
							"size-3 shrink-0",
							isDone
								? output?.exitCode === 0
									? "text-emerald-400"
									: "text-amber-400"
								: isError
									? "text-red-400"
									: "text-white/50",
						)}
					/>
				)}
				<span className={cn("text-white/50", isLoading && "text-blue-400/60")}>
					$
				</span>
				<span
					className={cn(
						"flex-1 text-left truncate",
						isDone
							? output?.exitCode === 0
								? "text-emerald-300"
								: "text-amber-300"
							: isLoading
								? "text-blue-300"
								: isError
									? "text-red-300"
									: "text-white/70",
					)}
				>
					{cmd ?? "…"}
				</span>
				{isLoading && <span className="text-white/30 shrink-0">running…</span>}
				{isDone && !hasOutput && (
					<span className="text-white/30 shrink-0">done</span>
				)}
				{isError && <span className="text-red-400/60 shrink-0">error</span>}
				{hasExpandable &&
					(expanded ? (
						<ChevronDownIcon className="size-3 text-white/30 shrink-0" />
					) : (
						<ChevronRightIcon className="size-3 text-white/30 shrink-0" />
					))}
			</button>

			{expanded && (hasOutput || (isError && errorText)) && (
				<div className="px-3 py-2 space-y-1">
					{output?.stdout && output.stdout.length > 0 && (
						<pre className="text-white/70 bg-[#080B10] rounded p-2 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all text-[11px]">
							{output.stdout}
						</pre>
					)}
					{output?.stderr && output.stderr.length > 0 && (
						<pre className="text-amber-300/70 bg-[#080B10] rounded p-2 overflow-x-auto max-h-24 overflow-y-auto whitespace-pre-wrap break-all text-[11px]">
							{output.stderr}
						</pre>
					)}
					{isError && errorText && (
						<pre className="text-red-300/90 bg-[#080B10] rounded p-2 overflow-x-auto max-h-24 overflow-y-auto whitespace-pre-wrap break-all text-[11px]">
							{errorText}
						</pre>
					)}
				</div>
			)}
		</div>
	)
}

function ToolCallDisplay({ part }: { part: ToolCallDisplayPart }) {
	const [expanded, setExpanded] = useState(false)
	const toolName = connectorToolName(part)
	if (NOVA_CONNECTOR_TOOLS.has(toolName)) {
		return <NovaConnectorToolDisplay part={part} />
	}
	if (toolName === "bash") {
		return <BashToolDisplay part={part} />
	}
	if (isWebSearchToolName(toolName)) {
		if (part.state === "output-available") return null
		if (part.state === "error" || part.state === "output-error") {
			return (
				<div className="my-1 flex items-center gap-2 text-xs text-red-400/80">
					<GlobeIcon className="size-3.5 shrink-0" />
					<span>Web search failed</span>
				</div>
			)
		}
		return (
			<div className="my-1 flex items-center gap-2 text-xs text-white/50">
				<Loader2 className="size-3.5 shrink-0 animate-spin text-emerald-400/80" />
				<span>Searching the web…</span>
			</div>
		)
	}
	const meta =
		TOOL_META[toolName] ??
		(isWebSearchToolName(toolName)
			? { label: "Web search", icon: GlobeIcon }
			: undefined)
	const Icon = meta?.icon ?? WrenchIcon
	const label = meta?.label ?? toolName

	const isLoading =
		part.state === "input-streaming" || part.state === "input-available"
	const isDone = part.state === "output-available"
	const isError = part.state === "error" || part.state === "output-error"
	const errorText = part.errorText

	return (
		<div className="rounded-lg border border-[#1E2128] bg-[#0D121A] text-xs my-1 overflow-hidden">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className={cn(
					"flex items-center gap-2 w-full px-3 py-2 cursor-pointer hover:bg-[#141922] transition-colors",
					expanded && "border-b border-[#1E2128]",
				)}
			>
				{isLoading ? (
					<Loader2 className="size-3 animate-spin text-blue-400 shrink-0" />
				) : (
					<Icon
						className={cn(
							"size-3 shrink-0",
							isDone
								? "text-emerald-400"
								: isError
									? "text-red-400"
									: "text-white/50",
						)}
					/>
				)}
				<span
					className={cn(
						"font-medium",
						isDone
							? "text-emerald-400"
							: isError
								? "text-red-400"
								: "text-blue-400",
					)}
				>
					{label}
				</span>
				{isLoading && <span className="text-white/40 ml-auto">running…</span>}
				{isDone && <span className="text-white/40 ml-auto">done</span>}
				{isError && <span className="text-red-400/60 ml-auto">error</span>}
				{expanded ? (
					<ChevronDownIcon className="size-3 text-white/30 shrink-0" />
				) : (
					<ChevronRightIcon className="size-3 text-white/30 shrink-0" />
				)}
			</button>

			{expanded && (
				<div className="px-3 py-2 space-y-2">
					{part.input !== undefined && (
						<div>
							<div className="text-white/40 mb-1">Input</div>
							<pre className="text-white/70 bg-[#080B10] rounded p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
								{typeof part.input === "string"
									? part.input
									: JSON.stringify(part.input, null, 2)}
							</pre>
						</div>
					)}
					{isDone && part.output !== undefined && (
						<div>
							<div className="text-white/40 mb-1">Output</div>
							<pre className="text-white/70 bg-[#080B10] rounded p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
								{typeof part.output === "string"
									? part.output
									: JSON.stringify(part.output, null, 2)}
							</pre>
						</div>
					)}
					{isError && errorText && (
						<div>
							<div className="text-red-400/80 mb-1">Error</div>
							<pre className="text-red-300/90 bg-[#080B10] rounded p-2 overflow-x-auto max-h-24 whitespace-pre-wrap break-all text-xs">
								{errorText}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

interface AgentMessageProps {
	message: UIMessage
	index: number
	messagesLength: number
	hoveredMessageId: string | null
	copiedMessageId: string | null
	messageFeedback: Record<string, "like" | "dislike" | null>
	expandedMemories: string | null
	responseModel: ModelId | null
	onCopy: (messageId: string, text: string) => void
	onLike: (messageId: string) => void
	onDislike: (messageId: string) => void
	onToggleMemories: (messageId: string) => void
}

export function AgentMessage({
	message,
	index,
	messagesLength,
	hoveredMessageId,
	copiedMessageId,
	messageFeedback,
	expandedMemories,
	responseModel,
	onCopy,
	onLike,
	onDislike,
	onToggleMemories,
}: AgentMessageProps) {
	const isLastAgentMessage =
		index === messagesLength - 1 && message.role === "assistant"
	const isHovered = hoveredMessageId === message.id
	const messageText = message.parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join(" ")
	const webSources = (() => {
		const seen = new Set<string>()
		const out: SourceUrlPart[] = []
		for (const part of message.parts) {
			if (part.type !== "source-url") continue
			const source = part as SourceUrlPart
			if (seen.has(source.url)) continue
			seen.add(source.url)
			out.push(source)
		}
		return out
	})()
	const hasAssistantText = message.parts.some(
		(p) => p.type === "text" && (p as { text?: string }).text?.trim(),
	)
	const sourceKey = webSources.map((s) => s.url).join("|")
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed by stable source urls
	const markdownComponents = useMemo(
		() => makeMarkdownComponents(webSources),
		[sourceKey],
	)
	const responseModelLabel = responseModel
		? `${modelNames[responseModel].name} ${modelNames[responseModel].version}`
		: null

	return (
		<div className="flex flex-col gap-1 w-full">
			<div className="flex gap-2">
				<div className="flex flex-col gap-2 w-full">
					<RelatedMemories
						message={message}
						expandedMemories={expandedMemories}
						onToggle={onToggleMemories}
					/>

					{message.parts.map((part, partIndex) => {
						if (part.type === "source-url") {
							return null
						}
						if (isWebSearchPart(part)) {
							return null
						}
						if (part.type === "source-document") {
							const doc = part as {
								type: "source-document"
								sourceId: string
								title: string
								filename?: string
							}
							return (
								<div
									key={`${message.id}-doc-${doc.sourceId}-${partIndex}`}
									className="rounded-lg border border-[#1E2128] bg-[#0D121A] px-3 py-2 text-xs my-1"
								>
									<div className="text-white/40 mb-0.5">Document</div>
									<div className="text-white/80">{doc.title}</div>
									{doc.filename && (
										<div className="text-white/50 text-[11px] mt-0.5">
											{doc.filename}
										</div>
									)}
								</div>
							)
						}
						if (part.type === "text") {
							// Skip fragments mid-run — source-url citations split one answer into
							// many text parts; rendering each separately tears markdown (lists etc.).
							let prev = partIndex - 1
							while (prev >= 0 && message.parts[prev]?.type === "source-url") {
								prev--
							}
							if (prev >= 0 && message.parts[prev]?.type === "text") {
								return null
							}
							let runText = ""
							for (let j = partIndex; j < message.parts.length; j++) {
								const p = message.parts[j]
								if (p?.type === "text") runText += p.text
								else if (p?.type === "source-url") continue
								else break
							}
							return (
								<div
									key={`${message.id}-${partIndex}`}
									className="text-sm text-white/90 chat-markdown-content"
								>
									<Streamdown components={markdownComponents}>
										{runText}
									</Streamdown>
								</div>
							)
						}
						if (part.type === "dynamic-tool") {
							if (shouldSkipNovaConnectorPart(message.parts, partIndex)) {
								return null
							}
							const dt = part as {
								type: "dynamic-tool"
								toolName: string
								toolCallId: string
								state: string
								input?: unknown
								output?: unknown
								errorText?: string
							}
							const displayState =
								dt.state === "output-error" ? "error" : dt.state
							return (
								<ToolCallDisplay
									key={`${message.id}-${dt.toolCallId}-${partIndex}`}
									part={{
										type: `tool-${dt.toolName}`,
										state: displayState,
										input: dt.input,
										output:
											dt.state === "output-available" ? dt.output : undefined,
										toolCallId: dt.toolCallId,
										errorText: dt.errorText,
									}}
								/>
							)
						}
						if (part.type.startsWith("tool-")) {
							if (shouldSkipNovaConnectorPart(message.parts, partIndex)) {
								return null
							}
							return (
								<ToolCallDisplay
									key={`${message.id}-${partIndex}`}
									part={part as ToolCallDisplayPart}
								/>
							)
						}
						return null
					})}
				</div>
			</div>
			{hasAssistantText && (
				<div className="flex min-h-7 items-center gap-2">
					<MessageActions
						messageId={message.id}
						messageText={messageText}
						isLastMessage={isLastAgentMessage}
						isHovered={isHovered}
						copiedMessageId={copiedMessageId}
						messageFeedback={messageFeedback}
						onCopy={onCopy}
						onLike={onLike}
						onDislike={onDislike}
					/>
					{webSources.length > 0 && (
						<div
							className={cn(
								"transition-opacity duration-200",
								isHovered || isLastAgentMessage ? "opacity-100" : "opacity-0",
							)}
						>
							<WebSourcesPill sources={webSources} />
						</div>
					)}
					{responseModelLabel && (
						<span
							className={cn(
								"text-[10px] leading-none text-white/25 transition-opacity duration-200",
								isHovered ? "opacity-100" : "opacity-0",
							)}
						>
							{responseModelLabel}
						</span>
					)}
				</div>
			)}
		</div>
	)
}
