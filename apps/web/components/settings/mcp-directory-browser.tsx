"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { McpDirectoryEntry } from "@/lib/mcp-directory"
import { brainConnectorIcon } from "../brain-connector-icons"
import { ConnectorCard, ScopeChip } from "../directory/connector-card"
import { PillButton } from "../integrations/install-steps"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

let directoryCache: McpDirectoryEntry[] | null = null

function isDirectoryEntry(value: unknown): value is McpDirectoryEntry {
	if (!value || typeof value !== "object") return false
	const entry = value as Partial<McpDirectoryEntry>
	return (
		typeof entry.id === "string" &&
		typeof entry.name === "string" &&
		(entry.type === "remote" || entry.type === "local") &&
		(entry.url === null || typeof entry.url === "string") &&
		typeof entry.auth === "string" &&
		(entry.note === null || typeof entry.note === "string") &&
		Array.isArray(entry.categories) &&
		entry.categories.every((category) => typeof category === "string") &&
		typeof entry.popularity === "number" &&
		(entry.iconDomain === null || typeof entry.iconDomain === "string") &&
		["custom", "unsupported"].includes(entry.setup ?? "") &&
		(entry.oauthCapability === null ||
			["dcr", "preregistered"].includes(entry.oauthCapability ?? "")) &&
		Array.isArray(entry.authMethods) &&
		entry.authMethods.every((method) =>
			["oauth", "api-key"].includes(method),
		) &&
		["fixed", "tenant", "unavailable", "local"].includes(
			entry.availability ?? "",
		)
	)
}

function parseDirectory(value: unknown) {
	if (!value || typeof value !== "object") throw new Error("invalid catalog")
	const entries = (value as { entries?: unknown }).entries
	if (!Array.isArray(entries) || !entries.every(isDirectoryEntry)) {
		throw new Error("invalid catalog")
	}
	return entries
}

async function loadDirectory(signal: AbortSignal) {
	if (directoryCache) return directoryCache
	const response = await fetch(`${BACKEND}/brain/mcp-connections/directory`, {
		signal,
		cache: "default",
		credentials: "include",
	})
	if (!response.ok) throw new Error("catalog request failed")
	directoryCache = parseDirectory(await response.json())
	return directoryCache
}

export function useMcpDirectory() {
	const [entries, setEntries] = useState<McpDirectoryEntry[]>(
		() => directoryCache ?? [],
	)
	const [error, setError] = useState(false)

	useEffect(() => {
		const controller = new AbortController()
		void loadDirectory(controller.signal)
			.then((data) => {
				setEntries(data)
				setError(false)
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") return
				setError(true)
			})
		return () => controller.abort()
	}, [])

	return { entries, error }
}

export function categoryLabel(value: string) {
	return value
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")
}

export function entrySlug(entry: McpDirectoryEntry) {
	return entry.name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 63)
}

// Mirrors the backend's URL normalization so connection rows match entries.
export function normalizeServerUrl(value: string) {
	try {
		const url = new URL(value)
		return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`.toLowerCase()
	} catch {
		return value.toLowerCase()
	}
}

// An entry we can actually take the user through connecting.
export function isEntrySetUppable(entry: McpDirectoryEntry) {
	return (
		entry.setup !== "unsupported" &&
		entry.authMethods.length > 0 &&
		(entry.availability === "fixed" || entry.availability === "tenant")
	)
}

// Entries worth listing at all — servers with no reachable URL are dropped.
export function listableDirectoryEntries(entries: McpDirectoryEntry[]) {
	return entries.filter((entry) => entry.availability !== "unavailable")
}

export function entryMatchesQuery(entry: McpDirectoryEntry, needle: string) {
	return [entry.name, entry.url, entry.note, ...entry.categories]
		.filter(Boolean)
		.some((value) => value?.toLowerCase().includes(needle))
}

function DirectoryIcon({ entry }: { entry: McpDirectoryEntry }) {
	const [failed, setFailed] = useState(false)
	if (!entry.iconDomain || failed) {
		return brainConnectorIcon(entrySlug(entry), entry.name, "size-4")
	}
	return (
		<img
			src={`/api/mcp-icon?domain=${encodeURIComponent(entry.iconDomain)}`}
			alt=""
			className="size-5 object-contain"
			loading="lazy"
			onError={() => setFailed(true)}
		/>
	)
}

export function DirectoryEntryCard({
	entry,
	connected,
	onSetUp,
}: {
	entry: McpDirectoryEntry
	connected: boolean
	onSetUp: (entry: McpDirectoryEntry) => void
}) {
	const canSetUp = !connected && isEntrySetUppable(entry)
	const status = connected
		? "Connected"
		: canSetUp
			? "Not connected"
			: entry.availability === "local"
				? "Desktop only"
				: "Coming soon"
	return (
		<ConnectorCard
			icon={<DirectoryIcon entry={entry} />}
			name={entry.name}
			subtitle={entrySubtitle(entry)}
			footerLeft={<ScopeChip label={status} connected={connected} />}
			footerRight={
				canSetUp ? (
					<PillButton onClick={() => onSetUp(entry)}>Set up</PillButton>
				) : null
			}
		/>
	)
}

function entrySubtitle(entry: McpDirectoryEntry) {
	if (entry.categories.length > 0) {
		return entry.categories.slice(0, 2).map(categoryLabel).join(" · ")
	}
	return entry.type === "local" ? "Desktop extension" : "MCP server"
}

// One directory listing: a dense single-line row. The default state carries no
// status text — in a marketplace, "not connected" is implied. Only connection,
// or the reason there's no button, earns words.
export function DirectoryEntryRow({
	entry,
	connected,
	onSetUp,
}: {
	entry: McpDirectoryEntry
	connected: boolean
	onSetUp: (entry: McpDirectoryEntry) => void
}) {
	const canSetUp = !connected && isEntrySetUppable(entry)
	return (
		<div className="group flex min-w-0 items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-[#14161A]">
			<div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[#080B0F] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]">
				<DirectoryIcon entry={entry} />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-[13px] font-semibold text-[#FAFAFA]">
					{entry.name}
				</p>
				<p className="mt-px truncate text-[11px] font-medium text-[#616875]">
					{entrySubtitle(entry)}
				</p>
			</div>
			{connected ? (
				<span className="flex shrink-0 items-center gap-1.5 pr-1 text-[11px] font-medium text-[#FAFAFA]">
					<span className="size-[6px] rounded-full bg-[#00AC3F]" />
					Connected
				</span>
			) : canSetUp ? (
				<button
					type="button"
					onClick={() => onSetUp(entry)}
					className="h-7 shrink-0 cursor-pointer rounded-full bg-[#1B2028] px-3 text-[12px] font-medium text-[#FAFAFA]/70 transition-colors group-hover:bg-[#252C37] group-hover:text-[#FAFAFA] hover:bg-[#2B3340]"
				>
					Set up
				</button>
			) : (
				<span className="shrink-0 pr-1 text-[11px] font-medium text-[#4E5560]">
					{entry.availability === "local" ? "Desktop only" : "Coming soon"}
				</span>
			)}
		</div>
	)
}

const GRID_PAGE_SIZE = 24

// Paged card grid over the MCP directory. With a query it renders matching
// servers; without one it renders the whole marketplace.
export function McpDirectoryGrid({
	query = "",
	entries,
	loadError,
	excludeSlugs,
	isEntryConnected,
	onSetUp,
	suppressEmpty,
}: {
	query?: string
	entries: McpDirectoryEntry[]
	loadError: boolean
	// entries already rendered elsewhere (e.g. the built-in app catalog)
	excludeSlugs?: Set<string>
	isEntryConnected: (entry: McpDirectoryEntry) => boolean
	onSetUp: (entry: McpDirectoryEntry) => void
	// the caller rendered its own matches, so an empty grid isn't "no results"
	suppressEmpty?: boolean
}) {
	const [visibleCount, setVisibleCount] = useState(GRID_PAGE_SIZE)
	const needle = query.trim().toLowerCase()

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset paging per query
	useEffect(() => {
		setVisibleCount(GRID_PAGE_SIZE)
	}, [needle])

	// Connected first, then connectable, then "coming soon"/desktop-only.
	const matches = useMemo(() => {
		const found = entries.filter(
			(entry) =>
				!excludeSlugs?.has(entrySlug(entry)) &&
				(!needle || entryMatchesQuery(entry, needle)),
		)
		return found.sort(
			(a, b) =>
				Number(isEntryConnected(b)) - Number(isEntryConnected(a)) ||
				Number(isEntrySetUppable(b)) - Number(isEntrySetUppable(a)),
		)
	}, [entries, excludeSlugs, isEntryConnected, needle])

	if (loadError) {
		if (suppressEmpty) return null
		return (
			<div className="rounded-xl border border-[#252B34] border-dashed px-4 py-10 text-center text-[13px] font-medium text-[#737373]">
				The MCP directory couldn't be loaded. Refresh to try again.
			</div>
		)
	}
	if (entries.length === 0) {
		if (suppressEmpty) return null
		return (
			<div className="flex items-center justify-center gap-2 rounded-xl border border-[#252B34] border-dashed px-4 py-10 text-[13px] font-medium text-[#737373]">
				<Loader2 className="size-4 animate-spin" />
				Loading MCP directory
			</div>
		)
	}
	if (matches.length === 0) {
		if (suppressEmpty) return null
		return (
			<div className="rounded-xl border border-[#252B34] border-dashed px-4 py-10 text-center text-[13px] font-medium text-[#737373]">
				No integrations match “{query.trim()}”.
			</div>
		)
	}
	return (
		<div className="space-y-4">
			<div className="grid gap-x-3 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
				{matches.slice(0, visibleCount).map((entry) => (
					<DirectoryEntryRow
						key={entry.id}
						entry={entry}
						connected={isEntryConnected(entry)}
						onSetUp={onSetUp}
					/>
				))}
			</div>
			{visibleCount < matches.length ? (
				<button
					type="button"
					onClick={() => setVisibleCount((count) => count + GRID_PAGE_SIZE)}
					className="mx-auto flex h-9 cursor-pointer items-center rounded-full border border-[#2A313C] px-5 text-[12px] font-semibold text-[#D4D4D8] transition-colors hover:border-[#3A4150] hover:text-[#FAFAFA]"
				>
					Show {Math.min(GRID_PAGE_SIZE, matches.length - visibleCount)} more ·{" "}
					{visibleCount} of {matches.length.toLocaleString()}
				</button>
			) : null}
		</div>
	)
}
