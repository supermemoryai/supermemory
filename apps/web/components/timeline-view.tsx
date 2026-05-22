"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { SyncLogoIcon } from "@ui/assets/icons"
import { DocumentIcon } from "@/components/document-icon"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

// ─── Time period helpers ─────────────────────────────────────────────────────

function getTimePeriodLabel(date: Date, now: Date): string {
	const docDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const diffDays = Math.round(
		(todayDay.getTime() - docDay.getTime()) / 86400000,
	)

	if (diffDays === 0) return "Today"
	if (diffDays === 1) return "Yesterday"
	if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "long" })
	if (date.getFullYear() === now.getFullYear())
		return date.toLocaleDateString("en-US", { month: "long", day: "numeric" })
	return date.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	})
}

// ─── Document type helpers ────────────────────────────────────────────────────

type CategoryInfo = { label: string; singularLabel: string; key: string }

function getDocumentTypeInfo(doc: DocumentWithMemories): CategoryInfo {
	if (doc.source === "mcp")
		return { label: "MCP Items", singularLabel: "MCP Item", key: "mcp" }
	if (doc.url?.includes("youtube.com") || doc.url?.includes("youtu.be"))
		return {
			label: "YouTube Videos",
			singularLabel: "YouTube Video",
			key: "youtube",
		}
	switch (doc.type) {
		case "tweet":
			return { label: "Tweets", singularLabel: "Tweet", key: "tweet" }
		case "google_doc":
			return {
				label: "Google Docs",
				singularLabel: "Google Doc",
				key: "google_doc",
			}
		case "google_slide":
			return {
				label: "Google Slides",
				singularLabel: "Google Slide",
				key: "google_slide",
			}
		case "google_sheet":
			return {
				label: "Google Sheets",
				singularLabel: "Google Sheet",
				key: "google_sheet",
			}
		case "notion_doc":
			return {
				label: "Notion Docs",
				singularLabel: "Notion Doc",
				key: "notion_doc",
			}
		case "text":
			return { label: "Notes", singularLabel: "Note", key: "text" }
		case "pdf":
			return { label: "PDFs", singularLabel: "PDF", key: "pdf" }
		case "image":
			return { label: "Images", singularLabel: "Image", key: "image" }
		case "video":
			return { label: "Videos", singularLabel: "Video", key: "video" }
		case "onedrive":
			return {
				label: "OneDrive Files",
				singularLabel: "OneDrive File",
				key: "onedrive",
			}
		case "webpage":
			return { label: "Web Pages", singularLabel: "Web Page", key: "webpage" }
		default:
			return doc.url?.startsWith("https://")
				? { label: "Web Pages", singularLabel: "Web Page", key: "webpage" }
				: { label: "Notes", singularLabel: "Note", key: "text" }
	}
}

function getPreviewText(doc: DocumentWithMemories): string {
	return doc.summary || doc.content || doc.title || ""
}

function isTemporaryId(id: string | null | undefined): boolean {
	if (!id) return false
	return id.startsWith("temp-") || id.startsWith("temp-file-")
}

function SelectionBox({
	isSelected,
	isPartial = false,
}: {
	isSelected: boolean
	isPartial?: boolean
}) {
	return (
		<span
			className={cn(
				"flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
				isSelected
					? "border-[#369BFD] bg-[#369BFD]"
					: isPartial
						? "border-[#369BFD] bg-[#369BFD]/20"
						: "border-[#737373] bg-transparent",
			)}
			aria-hidden
		>
			{isSelected ? (
				<CheckIcon className="size-3 text-white" strokeWidth={3} />
			) : isPartial ? (
				<span className="h-0.5 w-2 rounded-full bg-[#369BFD]" />
			) : null}
		</span>
	)
}

// ─── Grouped data structures ─────────────────────────────────────────────────

type TypeGroup = { categoryInfo: CategoryInfo; docs: DocumentWithMemories[] }
type PeriodGroup = { label: string; typeGroups: TypeGroup[] }

function groupDocuments(
	documents: DocumentWithMemories[],
	now: Date,
): PeriodGroup[] {
	const sorted = [...documents].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	)

	const periodMap = new Map<string, DocumentWithMemories[]>()
	const periodOrder: string[] = []

	for (const doc of sorted) {
		const label = getTimePeriodLabel(new Date(doc.createdAt), now)
		if (!periodMap.has(label)) {
			periodMap.set(label, [])
			periodOrder.push(label)
		}
		periodMap.get(label)?.push(doc)
	}

	return periodOrder.map((label) => {
		const docs = periodMap.get(label) ?? []
		const categoryMap = new Map<
			string,
			{ info: CategoryInfo; docs: DocumentWithMemories[] }
		>()
		const categoryOrder: string[] = []

		for (const doc of docs) {
			const info = getDocumentTypeInfo(doc)
			if (!categoryMap.has(info.key)) {
				categoryMap.set(info.key, { info, docs: [] })
				categoryOrder.push(info.key)
			}
			categoryMap.get(info.key)?.docs.push(doc)
		}

		return {
			label,
			typeGroups: categoryOrder.flatMap((key) => {
				const entry = categoryMap.get(key)
				return entry ? [{ categoryInfo: entry.info, docs: entry.docs }] : []
			}),
		}
	})
}

// ─── Individual timeline card ─────────────────────────────────────────────────

function TimelineCard({
	doc,
	onOpenDocument,
	isSelectionMode = false,
	isSelected = false,
	onToggleSelection,
	indent = false,
}: {
	doc: DocumentWithMemories
	onOpenDocument: (doc: DocumentWithMemories) => void
	isSelectionMode?: boolean
	isSelected?: boolean
	onToggleSelection?: (doc: DocumentWithMemories) => void
	indent?: boolean
}) {
	const preview = getPreviewText(doc)
	const typeLabel = doc.type
		? doc.type.charAt(0).toUpperCase() + doc.type.slice(1).replace(/_/g, " ")
		: "Document"
	const totalMemories = doc.memoryEntries.length
	const canSelect = !isTemporaryId(doc.id) && !isTemporaryId(doc.customId)

	const handleClick = () => {
		if (isSelectionMode && canSelect) {
			onToggleSelection?.(doc)
			return
		}
		onOpenDocument(doc)
	}

	return (
		<button
			type="button"
			className={cn(
				"relative w-full text-left px-4 py-3 cursor-pointer transition-colors",
				indent
					? "bg-transparent hover:bg-white/[0.04]"
					: "rounded-2xl border border-[#252B35] bg-[#1B1F24] hover:bg-[#21262D]",
				isSelectionMode && canSelect && "pl-10",
				isSelectionMode && isSelected && "border-[#369BFD]/70 bg-[#00173C]/45",
				dmSansClassName(),
			)}
			onClick={handleClick}
			aria-pressed={isSelectionMode ? isSelected : undefined}
		>
			{isSelectionMode && canSelect && (
				<span className="absolute left-4 top-4">
					<SelectionBox isSelected={isSelected} />
				</span>
			)}

			{/* Type label */}
			<div className="flex items-center gap-1.5 mb-2">
				<DocumentIcon
					type={doc.type}
					source={doc.source ?? undefined}
					url={doc.url ?? undefined}
					className="size-3.5 shrink-0 opacity-60"
				/>
				<span className="text-[10px] text-white/40 uppercase tracking-widest">
					{typeLabel}
				</span>
			</div>

			{/* Title */}
			{doc.title && (
				<p className="text-[13px] text-white/85 font-medium leading-snug line-clamp-2 mb-1.5">
					{doc.title}
				</p>
			)}

			{/* Preview */}
			{preview && (
				<p className="text-[12px] text-white/45 line-clamp-3 leading-relaxed">
					{preview}
				</p>
			)}

			{/* Footer */}
			{totalMemories > 0 && (
				<div className="flex items-center gap-1 mt-2.5">
					<SyncLogoIcon
						className="w-[11px] h-[9px]"
						style={{
							filter:
								"brightness(0) saturate(100%) invert(58%) sepia(69%) saturate(535%) hue-rotate(181deg) brightness(101%) contrast(98%)",
						}}
					/>
					<span
						className="text-[11px] font-medium"
						style={{
							background:
								"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
							backgroundClip: "text",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
						}}
					>
						{totalMemories}
					</span>
				</div>
			)}
		</button>
	)
}

// ─── Collapsed group card ─────────────────────────────────────────────────────

function GroupCard({
	group,
	isExpanded,
	onToggle,
	onOpenDocument,
	isSelectionMode,
	selectedDocumentIds,
	onToggleSelection,
	expandKey,
}: {
	group: TypeGroup
	isExpanded: boolean
	onToggle: () => void
	onOpenDocument: (doc: DocumentWithMemories) => void
	isSelectionMode: boolean
	selectedDocumentIds: Set<string>
	onToggleSelection?: (documentId: string) => void
	expandKey: string
}) {
	const firstDoc = group.docs[0]
	if (!firstDoc) return null

	const preview = getPreviewText(firstDoc)
	const count = group.docs.length
	const { label, singularLabel } = group.categoryInfo
	const countLabel = count === 1 ? `1 ${singularLabel}` : `${count} ${label}`
	const totalMemories = group.docs.reduce(
		(sum, d) => sum + d.memoryEntries.length,
		0,
	)
	const selectableDocs = group.docs.filter(
		(doc) => !isTemporaryId(doc.id) && !isTemporaryId(doc.customId) && doc.id,
	)
	const selectedCount = selectableDocs.filter(
		(doc) => doc.id && selectedDocumentIds.has(doc.id),
	).length
	const isGroupSelected =
		selectableDocs.length > 0 && selectedCount === selectableDocs.length
	const isGroupPartial = selectedCount > 0 && !isGroupSelected

	const handleGroupSelect = () => {
		for (const doc of selectableDocs) {
			if (!doc.id) continue
			const shouldToggle = isGroupSelected
				? selectedDocumentIds.has(doc.id)
				: !selectedDocumentIds.has(doc.id)
			if (shouldToggle) onToggleSelection?.(doc.id)
		}
	}

	return (
		<div>
			<div
				className={cn(
					"flex w-full items-stretch rounded-2xl border border-[#252B35] bg-[#1B1F24] transition-colors hover:bg-[#21262D]",
					isExpanded && "rounded-b-none border-b-transparent",
					isSelectionMode &&
						(isGroupSelected || isGroupPartial) &&
						"border-[#369BFD]/70 bg-[#00173C]/45",
				)}
			>
				{isSelectionMode && selectableDocs.length > 0 && (
					<button
						type="button"
						className="flex shrink-0 items-start px-4 py-4 cursor-pointer"
						onClick={handleGroupSelect}
						aria-label={isGroupSelected ? "Deselect group" : "Select group"}
						aria-pressed={isGroupSelected}
					>
						<SelectionBox
							isSelected={isGroupSelected}
							isPartial={isGroupPartial}
						/>
					</button>
				)}

				<button
					type="button"
					className={cn(
						"flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 py-3 pr-4 text-left",
						isSelectionMode && selectableDocs.length > 0 ? "pl-0" : "pl-4",
						dmSansClassName(),
					)}
					onClick={onToggle}
					aria-expanded={isExpanded}
				>
					<div className="flex items-center gap-2.5 min-w-0 flex-1">
						<DocumentIcon
							type={firstDoc.type}
							source={firstDoc.source ?? undefined}
							url={firstDoc.url ?? undefined}
							className="size-3.5 shrink-0 opacity-60"
						/>
						<span className="text-[13px] text-white/75 font-medium whitespace-nowrap shrink-0">
							{countLabel}
						</span>
						{preview && (
							<span className="text-[12px] text-white/35 truncate">
								· {preview}
							</span>
						)}
						{totalMemories > 0 && (
							<span
								className="text-[11px] font-medium shrink-0 ml-auto"
								style={{
									background:
										"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
									backgroundClip: "text",
									WebkitBackgroundClip: "text",
									WebkitTextFillColor: "transparent",
								}}
							>
								{totalMemories}
							</span>
						)}
					</div>

					<ChevronDownIcon
						className={cn(
							"size-3.5 text-white/20 shrink-0 transition-transform duration-200",
							isExpanded && "rotate-180",
						)}
					/>
				</button>
			</div>

			{isExpanded && (
				<div
					id={`group-${expandKey}`}
					className="border border-t-0 border-[#252B35] rounded-b-2xl overflow-hidden divide-y divide-[#252B35]"
				>
					{group.docs.map((doc) => (
						<TimelineCard
							key={doc.id}
							doc={doc}
							onOpenDocument={onOpenDocument}
							isSelectionMode={isSelectionMode}
							isSelected={doc.id ? selectedDocumentIds.has(doc.id) : false}
							onToggleSelection={(doc) => {
								if (doc.id) onToggleSelection?.(doc.id)
							}}
							indent
						/>
					))}
				</div>
			)}
		</div>
	)
}

// ─── Main TimelineView ────────────────────────────────────────────────────────

interface TimelineViewProps {
	documents: DocumentWithMemories[]
	onOpenDocument: (document: DocumentWithMemories) => void
	hasNextPage?: boolean
	isFetchingNextPage?: boolean
	onLoadMore?: () => void
	isSelectionMode?: boolean
	selectedDocumentIds?: Set<string>
	onToggleSelection?: (documentId: string) => void
}

export function TimelineView({
	documents,
	onOpenDocument,
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
	isSelectionMode = false,
	selectedDocumentIds = new Set(),
	onToggleSelection,
}: TimelineViewProps) {
	const [now] = useState(() => new Date())
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
	const sentinelRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!sentinelRef.current || !onLoadMore) return
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					onLoadMore()
				}
			},
			{ threshold: 0.1 },
		)
		observer.observe(sentinelRef.current)
		return () => observer.disconnect()
	}, [hasNextPage, isFetchingNextPage, onLoadMore])

	const toggleGroup = useCallback((key: string) => {
		setExpandedGroups((prev) => {
			const next = new Set(prev)
			if (next.has(key)) next.delete(key)
			else next.add(key)
			return next
		})
	}, [])

	const periodGroups = groupDocuments(documents, now)
	const handleTimelineCardSelection = useCallback(
		(doc: DocumentWithMemories) => {
			if (doc.id) onToggleSelection?.(doc.id)
		},
		[onToggleSelection],
	)

	return (
		<div
			className={cn(
				"w-full max-w-[780px] mx-auto py-4 pb-12 space-y-6",
				dmSansClassName(),
			)}
		>
			{periodGroups.map((period) => (
				<div key={period.label} className="grid grid-cols-[88px_1fr] gap-x-4">
					<div className="pt-3 text-right shrink-0">
						<span className="text-[10px] text-white/30 font-medium uppercase tracking-[0.15em] leading-none">
							{period.label}
						</span>
					</div>

					<div className="space-y-1.5 min-w-0">
						{period.typeGroups.map((group) => {
							const expandKey = `${period.label}::${group.categoryInfo.key}`

							if (group.docs.length === 1) {
								const doc = group.docs[0]
								if (!doc) return null

								return (
									<TimelineCard
										key={expandKey}
										doc={doc}
										onOpenDocument={onOpenDocument}
										isSelectionMode={isSelectionMode}
										isSelected={
											doc.id ? selectedDocumentIds.has(doc.id) : false
										}
										onToggleSelection={handleTimelineCardSelection}
									/>
								)
							}

							return (
								<GroupCard
									key={expandKey}
									group={group}
									expandKey={expandKey}
									isExpanded={expandedGroups.has(expandKey)}
									onToggle={() => toggleGroup(expandKey)}
									onOpenDocument={onOpenDocument}
									isSelectionMode={isSelectionMode}
									selectedDocumentIds={selectedDocumentIds}
									onToggleSelection={onToggleSelection}
								/>
							)
						})}
					</div>
				</div>
			))}

			<div ref={sentinelRef} className="h-1" />
		</div>
	)
}
