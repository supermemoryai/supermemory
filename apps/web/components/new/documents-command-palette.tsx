"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { useIsMobile } from "@hooks/use-mobile"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"
import { SearchIcon } from "lucide-react"
import { DocumentIcon } from "@/components/new/document-icon"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

interface DocumentsCommandPaletteProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	projectId: string
	onOpenDocument: (document: DocumentWithMemories) => void
}

export function DocumentsCommandPalette({
	open,
	onOpenChange,
	projectId,
	onOpenDocument,
}: DocumentsCommandPaletteProps) {
	const isMobile = useIsMobile()
	const queryClient = useQueryClient()
	const [search, setSearch] = useState("")
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [documents, setDocuments] = useState<DocumentWithMemories[]>([])
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)

	// Get documents from the existing query cache when dialog opens
	useEffect(() => {
		if (open) {
			const queryData = queryClient.getQueryData<{
				pages: DocumentsResponse[]
				pageParams: number[]
			}>(["documents-with-memories", projectId])

			if (queryData?.pages) {
				setDocuments(queryData.pages.flatMap((page) => page.documents ?? []))
			}
			setTimeout(() => inputRef.current?.focus(), 0)
			setSearch("")
			setSelectedIndex(0)
		}
	}, [open, queryClient, projectId])

	const filteredDocuments = useMemo(() => {
		if (!search.trim()) return documents
		const searchLower = search.toLowerCase()
		return documents.filter((doc) =>
			doc.title?.toLowerCase().includes(searchLower),
		)
	}, [documents, search])

	// Reset selection when filtered results change
	const handleSearchChange = useCallback((value: string) => {
		setSearch(value)
		setSelectedIndex(0)
	}, [])

	// Scroll selected item into view
	useEffect(() => {
		const selectedElement = listRef.current?.querySelector(
			`[data-index="${selectedIndex}"]`,
		)
		selectedElement?.scrollIntoView({ block: "nearest" })
	}, [selectedIndex])

	const handleSelect = useCallback(
		(document: DocumentWithMemories) => {
			if (!document.id) return
			onOpenDocument(document)
			onOpenChange(false)
			setSearch("")
		},
		[onOpenDocument, onOpenChange],
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "ArrowDown") {
				e.preventDefault()
				setSelectedIndex((i) => (i < filteredDocuments.length - 1 ? i + 1 : i))
			} else if (e.key === "ArrowUp") {
				e.preventDefault()
				setSelectedIndex((i) => (i > 0 ? i - 1 : i))
			} else if (e.key === "Enter") {
				e.preventDefault()
				const document = filteredDocuments[selectedIndex]
				if (document) handleSelect(document)
			}
		},
		[filteredDocuments, selectedIndex, handleSelect],
	)

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
				<DialogTitle className="sr-only">Search Documents</DialogTitle>

				<div
					id="search-input-container"
					className="flex items-center gap-3 px-4 py-3"
				>
					<SearchIcon className="size-4 text-[#737373] shrink-0" />
					<input
						ref={inputRef}
						type="text"
						placeholder="Search documents by title..."
						value={search}
						onChange={(e) => handleSearchChange(e.target.value)}
						className={cn(
							"flex-1 bg-transparent text-white text-sm placeholder:text-[#737373] outline-none",
							dmSansClassName(),
						)}
					/>
				</div>

				<div
					ref={listRef}
					id="search-results"
					className="flex flex-col min-h-[300px] max-h-[400px] overflow-y-auto py-1.5 px-1.5"
				>
					{filteredDocuments.length === 0 ? (
						<div className="flex items-center justify-center py-12">
							<p className="text-[#737373] text-sm">No documents found</p>
						</div>
					) : (
						filteredDocuments.map((doc, index) => {
							const isSelected = index === selectedIndex
							return (
								<button
									key={doc.id}
									type="button"
									data-index={index}
									onClick={() => handleSelect(doc)}
									onMouseEnter={() => setSelectedIndex(index)}
									className={cn(
										"flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer text-left transition-colors",
										isSelected
											? "bg-[#293952]/40"
											: "opacity-70 hover:opacity-100 hover:bg-[#293952]/40",
									)}
								>
									<div
										className="flex items-center justify-center size-5 rounded-md shrink-0"
										style={{
											background:
												"linear-gradient(180deg, #14161A 0%, #0D0F12 100%)",
											boxShadow:
												"inset 0px 1px 1px rgba(255,255,255,0.03), inset 0px -1px 1px rgba(0,0,0,0.1)",
										}}
									>
										<DocumentIcon
											type={doc.type}
											url={doc.url}
											className="size-4"
										/>
									</div>
									<div className="flex-1 min-w-0 flex gap-1 justify-between items-center">
										<p className="text-sm font-medium text-white truncate">
											{doc.title || "Untitled"}
										</p>
										<p className="text-xs text-[#737373] text-nowrap">
											{new Date(doc.createdAt).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
											})}
										</p>
									</div>
								</button>
							)
						})
					)}
				</div>

				<div
					id="search-footer"
					className="flex items-center justify-between px-4 py-2.5 text-[11px] text-[#737373]"
				>
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
					<span>{filteredDocuments.length} documents</span>
				</div>
			</DialogContent>
		</Dialog>
	)
}
