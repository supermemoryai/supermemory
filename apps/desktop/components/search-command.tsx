"use client"

import { useQuery } from "@tanstack/react-query"
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@ui/components/command"
import { FileText, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { searchMemories, type SearchResult } from "@/lib/search"

export function SearchCommand({
	open,
	onOpenChange,
	onOpenResult,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	onOpenResult?: (result: SearchResult) => void
}) {
	const [query, setQuery] = useState("")
	const trimmedQuery = query.trim()
	const searchQuery = useQuery({
		queryKey: ["desktop-search", trimmedQuery],
		queryFn: () => searchMemories(trimmedQuery),
		enabled: open && trimmedQuery.length > 0,
		staleTime: 30 * 1000,
	})
	const results = searchQuery.data?.results ?? []

	useEffect(() => {
		if (!open) setQuery("")
	}, [open])

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandInput
				placeholder="Search your memories..."
				value={query}
				onValueChange={setQuery}
			/>
			<CommandList>
				{trimmedQuery ? (
					<CommandEmpty>
						{searchQuery.isFetching ? "Searching..." : "No results found."}
					</CommandEmpty>
				) : (
					<div className="px-4 py-6 text-center text-muted-foreground text-sm">
						Type to search your memories.
					</div>
				)}
				<CommandGroup heading="Memories">
					{searchQuery.isFetching ? (
						<CommandItem disabled value="searching">
							<Loader2 className="animate-spin" />
							Searching...
						</CommandItem>
					) : null}
					{searchQuery.isError ? (
						<CommandItem disabled value="search-error">
							<FileText />
							Search failed. Check your token and API URL.
						</CommandItem>
					) : null}
					{results.map((result) => {
						const title = result.title ?? result.documentId
						const preview =
							result.summary ??
							result.chunks.find((chunk) => chunk.isRelevant)?.content
						return (
							<CommandItem
								key={result.documentId}
								value={`${title} ${preview ?? ""}`}
								onSelect={() => {
									onOpenResult?.(result)
									onOpenChange(false)
								}}
								className="items-start"
							>
								<FileText className="mt-0.5" />
								<div className="min-w-0">
									<div className="truncate font-medium">{title}</div>
									{preview ? (
										<div className="line-clamp-2 text-muted-foreground text-xs">
											{preview}
										</div>
									) : null}
								</div>
							</CommandItem>
						)
					})}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	)
}

// In-app Cmd/Ctrl+K toggles the palette. (The OS-global hotkey arrives in Phase 5
// from the Rust side; this is the in-window shortcut.)
export function useCommandK() {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault()
				setOpen((prev) => !prev)
			}
		}
		const onOpenSearch = () => setOpen(true)
		document.addEventListener("keydown", onKeyDown)
		window.addEventListener("supermemory:open-search", onOpenSearch)
		return () => {
			document.removeEventListener("keydown", onKeyDown)
			window.removeEventListener("supermemory:open-search", onOpenSearch)
		}
	}, [])

	return { open, setOpen }
}
