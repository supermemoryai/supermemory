"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import type {
	DocumentsWithMemoriesResponseSchema,
	SearchResponseSchema,
} from "@repo/validation/api"
import type { z } from "zod"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { useIsMobile } from "@hooks/use-mobile"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"
import {
	SearchIcon,
	Settings,
	Home,
	Plus,
	Code2,
	Loader2,
} from "lucide-react"
import { DocumentIcon } from "@/components/new/document-icon"
import { $fetch } from "@lib/api"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]
type SearchResult = z.infer<typeof SearchResponseSchema>["results"][number]

type PaletteItem =
	| { kind: "action"; id: string; label: string; icon: React.ReactNode; action: () => void }
	| { kind: "document"; doc: DocumentWithMemories }
	| { kind: "search-result"; result: SearchResult }

interface DocumentsCommandPaletteProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	projectId: string
	onOpenDocument: (document: DocumentWithMemories) => void
	onAddMemory?: () => void
	onOpenIntegrations?: () => void
	initialSearch?: string
}

export function DocumentsCommandPalette({
	open,
	onOpenChange,
	projectId,
	onOpenDocument,
	onAddMemory,
	onOpenIntegrations,
	initialSearch = "",
}: DocumentsCommandPaletteProps) {
	const isMobile = useIsMobile()
	const router = useRouter()
	const queryClient = useQueryClient()
	const [search, setSearch] = useState("")
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [cachedDocs, setCachedDocs] = useState<DocumentWithMemories[]>([])
	const [searchResults, setSearchResults] = useState<SearchResult[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const abortRef = useRef<AbortController | null>(null)

	const close = useCallback((then?: () => void) => {
		onOpenChange(false)
		setSearch("")
		setSearchResults([])
		if (then) setTimeout(then, 0)
	}, [onOpenChange])

	const actions: PaletteItem[] = [
		{
			kind: "action",
			id: "home",
			label: "Go to Home",
			icon: <Home className="size-4 text-[#737373]" />,
			action: () => close(() => router.push("/")),
		},
		{
			kind: "action",
			id: "settings",
			label: "Go to Settings",
			icon: <Settings className="size-4 text-[#737373]" />,
			action: () => close(() => router.push("/settings")),
		},
		...(onAddMemory
			? [{
				kind: "action" as const,
				id: "add-memory",
				label: "Add Memory",
				icon: <Plus className="size-4 text-[#737373]" />,
				action: () => { close(); onAddMemory() },
			}]
			: []),
		...(onOpenIntegrations
			? [{
				kind: "action" as const,
				id: "integrations",
				label: "Open Integrations",
				icon: <Code2 className="size-4 text-[#737373]" />,
				action: () => { close(); onOpenIntegrations() },
			}]
			: []),
	]

	// Load cached docs when opening
	useEffect(() => {
		if (open) {
			const queryData = queryClient.getQueryData<{
				pages: DocumentsResponse[]
				pageParams: number[]
			}>(["documents-with-memories", projectId])

			if (queryData?.pages) {
				setCachedDocs(queryData.pages.flatMap((page) => page.documents ?? []))
			}
			setTimeout(() => inputRef.current?.focus(), 0)
			setSearch(initialSearch)
			setSelectedIndex(0)
			setSearchResults([])
		}
	}, [open, queryClient, projectId, initialSearch])

	// Debounced semantic search
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		if (abortRef.current) abortRef.current.abort()

		if (!search.trim()) {
			setSearchResults([])
			setIsSearching(false)
			return
		}

		setIsSearching(true)
		debounceRef.current = setTimeout(async () => {
			const controller = new AbortController()
			abortRef.current = controller

			try {
				const res = await $fetch("@post/search", {
					body: {
						q: search.trim(),
						limit: 10,
						containerTags: projectId ? [projectId] : undefined,
						includeSummary: true,
					},
					signal: controller.signal,
				})
				if (!controller.signal.aborted && res.data) {
					setSearchResults(res.data.results)
				}
			} catch {
				// aborted or failed - ignore
			} finally {
				if (!controller.signal.aborted) setIsSearching(false)
			}
		}, 250)

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [search, projectId])

	// Build the item list
	const hasQuery = search.trim().length > 0
	const items: PaletteItem[] = []

	if (hasQuery) {
		for (const r of searchResults) {
			items.push({ kind: "search-result", result: r })
		}
		const q = search.toLowerCase()
		for (const a of actions) {
			if (a.kind === "action" && a.label.toLowerCase().includes(q)) items.push(a)
		}
	} else {
		for (const doc of cachedDocs.slice(0, 10)) items.push({ kind: "document", doc })
		for (const a of actions) items.push(a)
	}

	// Reset selection on items change
	useEffect(() => {
		setSelectedIndex(0)
	}, [search, searchResults.length])

	// Scroll selected into view
	useEffect(() => {
		listRef.current
			?.querySelector(`[data-index="${selectedIndex}"]`)
			?.scrollIntoView({ block: "nearest" })
	}, [selectedIndex])

	const handleSelect = useCallback(
		(item: PaletteItem) => {
			if (item.kind === "action") {
				item.action()
			} else if (item.kind === "document") {
				if (!item.doc.id) return
				onOpenDocument(item.doc)
				close()
			} else {
				// search result -> convert to DocumentWithMemories shape for the modal
				onOpenDocument({
					id: item.result.documentId,
					title: item.result.title,
					type: item.result.type,
					createdAt: item.result.createdAt as unknown as string,
					updatedAt: item.result.updatedAt as unknown as string,
					url: (item.result.metadata?.url as string) ?? null,
					content: item.result.content ?? item.result.chunks?.[0]?.content ?? null,
					summary: item.result.summary ?? null,
				} as unknown as DocumentWithMemories)
				close()
			}
		},
		[onOpenDocument, close],
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "ArrowDown") {
				e.preventDefault()
				setSelectedIndex((i) => Math.min(i + 1, items.length - 1))
			} else if (e.key === "ArrowUp") {
				e.preventDefault()
				setSelectedIndex((i) => Math.max(i - 1, 0))
			} else if (e.key === "Enter") {
				e.preventDefault()
				const item = items[selectedIndex]
				if (item) handleSelect(item)
			}
		},
		[items, selectedIndex, handleSelect],
	)

	function renderItem(item: PaletteItem, index: number) {
		const isSelected = index === selectedIndex
		const baseClass = cn(
			"flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer text-left transition-colors",
			isSelected
				? "bg-[#293952]/40"
				: "opacity-70 hover:opacity-100 hover:bg-[#293952]/40",
		)

		if (item.kind === "action") {
			return (
				<button
					key={item.id}
					type="button"
					data-index={index}
					onClick={() => handleSelect(item)}
					onMouseEnter={() => setSelectedIndex(index)}
					className={baseClass}
				>
					<div className="flex items-center justify-center size-5 shrink-0">
						{item.icon}
					</div>
					<p className="text-sm font-medium text-white">{item.label}</p>
				</button>
			)
		}

		const title =
			item.kind === "document" ? item.doc.title : item.result.title
		const type =
			item.kind === "document" ? item.doc.type : item.result.type
		const url =
			item.kind === "document"
				? item.doc.url
				: (item.result.metadata?.url as string) ?? null
		const date =
			item.kind === "document"
				? item.doc.createdAt
				: item.result.createdAt
		const key =
			item.kind === "document" ? item.doc.id : item.result.documentId
		const snippet =
			item.kind === "search-result"
				? item.result.chunks?.find((c) => c.isRelevant)?.content
				: null

		return (
			<button
				key={key}
				type="button"
				data-index={index}
				onClick={() => handleSelect(item)}
				onMouseEnter={() => setSelectedIndex(index)}
				className={baseClass}
			>
				<div
					className="flex items-center justify-center size-5 rounded-md shrink-0"
					style={{
						background: "linear-gradient(180deg, #14161A 0%, #0D0F12 100%)",
						boxShadow:
							"inset 0px 1px 1px rgba(255,255,255,0.03), inset 0px -1px 1px rgba(0,0,0,0.1)",
					}}
				>
					<DocumentIcon type={type} url={url} className="size-4" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex gap-1 justify-between items-center">
						<p className="text-sm font-medium text-white truncate">
							{title || "Untitled"}
						</p>
						<p className="text-xs text-[#737373] text-nowrap">
							{new Date(date).toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
							})}
						</p>
					</div>
					{snippet && (
						<p className="text-xs text-[#737373] truncate mt-0.5">
							{snippet.slice(0, 120)}
						</p>
					)}
				</div>
			</button>
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"bg-[#1B1F24] flex flex-col p-0 gap-0 overflow-hidden top-[15%]! translate-y-0! scrollbar-thin border-none shadow-2xl",
					isMobile
						? "w-[calc(100vw-2rem)]! max-w-none! rounded-xl"
						: "w-[560px]! max-w-[560px]! rounded-xl",
					dmSansClassName(),
				)}
				style={{
					background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
					boxShadow: "0px 1.5px 20px 0px rgba(0,0,0,0.65)",
				}}
				showCloseButton={false}
				onKeyDown={handleKeyDown}
			>
				<DialogTitle className="sr-only">Search</DialogTitle>

				<div className="flex items-center gap-3 px-4 py-3">
					{isSearching ? (
						<Loader2 className="size-4 text-[#737373] shrink-0 animate-spin" />
					) : (
						<SearchIcon className="size-4 text-[#737373] shrink-0" />
					)}
					<input
						ref={inputRef}
						type="text"
						placeholder="Type to search your memories..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className={cn(
							"flex-1 bg-transparent text-white text-sm placeholder:text-[#737373] outline-none",
							dmSansClassName(),
						)}
					/>
				</div>

				<div
					ref={listRef}
					className="flex flex-col min-h-[200px] max-h-[400px] overflow-y-auto py-1.5 px-1.5"
				>
					{!hasQuery && cachedDocs.length > 0 && (
						<p className="px-3 pt-1 pb-1.5 text-[10px] uppercase tracking-wider text-[#737373]">
							Recent
						</p>
					)}
					{hasQuery && searchResults.length > 0 && (
						<p className="px-3 pt-1 pb-1.5 text-[10px] uppercase tracking-wider text-[#737373]">
							Results
						</p>
					)}
					{items
						.map((item, i) => ({ item, globalIndex: i }))
						.filter(({ item }) => item.kind !== "action")
						.map(({ item, globalIndex }) => renderItem(item, globalIndex))}

					{items.some((i) => i.kind === "action") && (
						<p className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-wider text-[#737373]">
							Actions
						</p>
					)}
					{items
						.map((item, i) => ({ item, globalIndex: i }))
						.filter(({ item }) => item.kind === "action")
						.map(({ item, globalIndex }) => renderItem(item, globalIndex))}

					{hasQuery && !isSearching && searchResults.length === 0 && items.every((i) => i.kind === "action") && (
						<div className="flex items-center justify-center py-12">
							<p className="text-[#737373] text-sm">No results found</p>
						</div>
					)}
				</div>

				<div className="flex items-center justify-between px-4 py-2.5 text-[11px] text-[#737373]">
					<div className="flex items-center gap-4">
						<span className="flex items-center gap-1.5">
							<span className="flex gap-0.5">
								<kbd className="px-1 py-0.5 rounded bg-[#14161A] border border-[#2E3033] text-[10px] font-medium">
									↑
								</kbd>
								<kbd className="px-1 py-0.5 rounded bg-[#14161A] border border-[#2E3033] text-[10px] font-medium">
									↓
								</kbd>
							</span>
							<span>Navigate</span>
						</span>
						<span className="flex items-center gap-1.5">
							<kbd className="px-1.5 py-0.5 rounded bg-[#14161A] border border-[#2E3033] text-[10px] font-medium">
								↵
							</kbd>
							<span>Open</span>
						</span>
						<span className="flex items-center gap-1.5">
							<kbd className="px-1.5 py-0.5 rounded bg-[#14161A] border border-[#2E3033] text-[10px] font-medium">
								Esc
							</kbd>
							<span>Close</span>
						</span>
					</div>
					{hasQuery && searchResults.length > 0 && (
						<span>{searchResults.length} results</span>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
