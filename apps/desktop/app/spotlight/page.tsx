"use client"

import { useQuery } from "@tanstack/react-query"
import { FileText, Loader2, Search, Sparkles } from "lucide-react"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { searchMemories, type SearchResult } from "@/lib/search"
import {
	hideSpotlight,
	openSpotlightResult,
	SPOTLIGHT_SHOWN_EVENT,
	type SpotlightMemory,
} from "@/lib/spotlight"

export default function SpotlightPage() {
	const inputRef = useRef<HTMLInputElement>(null)
	const [query, setQuery] = useState("")
	const [activeIndex, setActiveIndex] = useState(0)
	const trimmedQuery = query.trim()
	const searchQuery = useQuery({
		queryKey: ["spotlight-search", trimmedQuery],
		queryFn: () => searchMemories(trimmedQuery),
		enabled: trimmedQuery.length > 0,
		staleTime: 30 * 1000,
	})
	const results = useMemo(
		() => searchQuery.data?.results.slice(0, 6) ?? [],
		[searchQuery.data?.results],
	)

	useEffect(() => {
		let unlisten: (() => void) | undefined

		const focusInput = () => {
			setTimeout(() => inputRef.current?.focus(), 0)
		}

		focusInput()
		import("@tauri-apps/api/event")
			.then(({ listen }) => listen(SPOTLIGHT_SHOWN_EVENT, focusInput))
			.then((handler) => {
				unlisten = handler
			})
			.catch(() => {
				unlisten = undefined
			})

		return () => {
			unlisten?.()
		}
	}, [])

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Escape") {
			event.preventDefault()
			void hideSpotlight()
			return
		}

		if (event.key === "ArrowDown") {
			event.preventDefault()
			setActiveIndex((index) => Math.min(index + 1, results.length - 1))
			return
		}

		if (event.key === "ArrowUp") {
			event.preventDefault()
			setActiveIndex((index) => Math.max(index - 1, 0))
			return
		}

		if (event.key === "Enter" && results[activeIndex]) {
			event.preventDefault()
			void openResult(results[activeIndex])
		}
	}

	async function openResult(result: SearchResult) {
		await openSpotlightResult(searchResultToSpotlightMemory(result))
		setQuery("")
	}

	return (
		<div className="flex h-screen items-start justify-center bg-transparent p-3">
			<div className="w-full overflow-hidden rounded-2xl border border-white/[0.10] bg-[#090D14]/96 shadow-[0_26px_90px_rgba(0,0,0,0.44),inset_1px_1px_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl">
				<div className="flex items-center gap-3 border-white/[0.06] border-b px-4 py-3">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#4BA0FA]/12 text-[#8BC6FF]">
						<Search className="size-4" />
					</div>
					<input
						ref={inputRef}
						aria-label="Ask or search your memories"
						value={query}
						onChange={(event) => {
							setQuery(event.target.value)
							setActiveIndex(0)
						}}
						onKeyDown={onKeyDown}
						placeholder="Ask or search your memories..."
						className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#6F7885]"
					/>
					<div className="hidden items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] text-fg-subtle sm:flex">
						<Sparkles className="size-3 text-[#4BA0FA]" />
						Spotlight
					</div>
				</div>

				<div className="min-h-[220px] p-2">
					{!trimmedQuery ? (
						<div className="flex h-[220px] flex-col items-center justify-center text-center">
							<p className="font-medium text-fg-primary text-sm">
								Search by meaning, title, or question.
							</p>
							<p className="mt-1 text-[12px] text-fg-subtle">
								Press Enter to open a result in the main window.
							</p>
						</div>
					) : null}

					{searchQuery.isFetching ? (
						<div className="flex items-center gap-2 px-3 py-2.5 text-fg-subtle text-sm">
							<Loader2 className="size-4 animate-spin" />
							Searching...
						</div>
					) : null}

					{searchQuery.isError ? (
						<div className="px-3 py-2.5 text-destructive text-sm">
							Search failed. Check your token and API URL.
						</div>
					) : null}

					{trimmedQuery && !searchQuery.isFetching && results.length === 0 ? (
						<div className="px-3 py-2.5 text-fg-subtle text-sm">
							No results found.
						</div>
					) : null}

					<ul className="space-y-0.5">
						{results.map((result, index) => {
							const title = result.title ?? result.documentId
							const preview =
								result.summary ??
								result.content ??
								result.chunks.find((chunk) => chunk.isRelevant)?.content
							const active = index === activeIndex

							return (
								<li key={result.documentId}>
									<button
										type="button"
										onMouseEnter={() => setActiveIndex(index)}
										onClick={() => void openResult(result)}
										className={[
											"group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
											active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
										].join(" ")}
									>
										<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-card ring-1 ring-surface-border">
											<FileText className="size-3.5 text-fg-subtle" />
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate font-medium text-fg-primary text-sm">
												{title}
											</span>
											{preview ? (
												<span className="mt-0.5 line-clamp-2 block text-[12px] text-fg-subtle leading-relaxed">
													{preview}
												</span>
											) : null}
										</span>
									</button>
								</li>
							)
						})}
					</ul>
				</div>
			</div>
		</div>
	)
}

function searchResultToSpotlightMemory(result: SearchResult): SpotlightMemory {
	return {
		id: result.documentId,
		title: result.title,
		summary: result.summary,
		content:
			result.content ??
			result.chunks.find((chunk) => chunk.isRelevant)?.content ??
			null,
		type: result.type,
		createdAt: normalizeDate(result.createdAt),
	}
}

function normalizeDate(value: string | Date) {
	return value instanceof Date ? value.toISOString() : value
}
