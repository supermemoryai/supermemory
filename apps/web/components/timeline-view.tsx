"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { AnimatePresence, motion } from "motion/react"
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
	isLast = false,
}: {
	doc: DocumentWithMemories
	onOpenDocument: (doc: DocumentWithMemories) => void
	isSelectionMode?: boolean
	isSelected?: boolean
	onToggleSelection?: (doc: DocumentWithMemories) => void
	indent?: boolean
	isLast?: boolean
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
				"relative w-full text-left px-3 py-3 cursor-pointer transition-colors sm:px-4",
				indent
					? "bg-[#121820]/95 hover:bg-[#17202A]"
					: "rounded-xl border border-[#252B35] bg-[#1B1F24] hover:bg-[#21262D] sm:rounded-2xl",
				indent && !isLast && "border-b border-[#252B35]/70",
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
					"flex w-full items-stretch rounded-xl border border-[#252B35] bg-[#1B1F24] transition-colors hover:bg-[#21262D] sm:rounded-2xl",
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
						"flex min-w-0 flex-1 cursor-pointer items-start justify-between gap-2 py-3 pr-3 text-left sm:items-center sm:gap-3 sm:pr-4",
						isSelectionMode && selectableDocs.length > 0
							? "pl-0"
							: "pl-3 sm:pl-4",
						dmSansClassName(),
					)}
					onClick={onToggle}
					aria-expanded={isExpanded}
				>
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
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
							<span className="basis-full text-[12px] leading-relaxed text-white/35 line-clamp-2 sm:basis-auto sm:truncate sm:leading-normal">
								· {preview}
							</span>
						)}
						{totalMemories > 0 && (
							<span
								className="shrink-0 text-[11px] font-medium sm:ml-auto"
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
							"mt-0.5 size-3.5 text-white/20 shrink-0 transition-transform duration-200 sm:mt-0",
							isExpanded && "rotate-180",
						)}
					/>
				</button>
			</div>

			<AnimatePresence initial={false}>
				{isExpanded && (
					<motion.div
						id={`group-${expandKey}`}
						className="overflow-hidden rounded-b-2xl border border-t-0 border-[#252B35] bg-[#121820]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
						initial={{ height: 0, opacity: 0, y: -4 }}
						animate={{ height: "auto", opacity: 1, y: 0 }}
						exit={{ height: 0, opacity: 0, y: -3 }}
						transition={{
							height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
							opacity: { duration: 0.18 },
							y: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
						}}
					>
						{group.docs.map((doc, index) => (
							<motion.div
								key={doc.id}
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -3 }}
								transition={{
									duration: 0.18,
									delay: Math.min(index * 0.025, 0.12),
									ease: [0.4, 0, 0.2, 1],
								}}
							>
								<TimelineCard
									doc={doc}
									onOpenDocument={onOpenDocument}
									isSelectionMode={isSelectionMode}
									isSelected={doc.id ? selectedDocumentIds.has(doc.id) : false}
									onToggleSelection={(doc) => {
										if (doc.id) onToggleSelection?.(doc.id)
									}}
									indent
									isLast={index === group.docs.length - 1}
								/>
							</motion.div>
						))}
					</motion.div>
				)}
			</AnimatePresence>
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
				"w-full max-w-[820px] mx-auto py-3 pb-12 space-y-5 sm:py-4 sm:space-y-7",
				dmSansClassName(),
			)}
		>
			{periodGroups.map((period, periodIndex) => {
				const periodHasExpandedGroup = period.typeGroups.some((group) =>
					expandedGroups.has(`${period.label}::${group.categoryInfo.key}`),
				)

				return (
					<div
						key={period.label}
						className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-2 gap-y-2 sm:grid-cols-[96px_24px_minmax(0,1fr)] sm:gap-x-3 sm:gap-y-0"
					>
						<div className="col-start-2 row-start-1 shrink-0 pt-0 sm:col-start-1 sm:row-start-1 sm:pt-3 sm:text-right">
							<span className="inline-flex rounded-full border border-[#252B35] bg-[#0D121A] px-2.5 py-1 text-[10px] font-medium uppercase leading-none tracking-[0.15em] text-white/45 sm:border-transparent sm:bg-transparent sm:px-0 sm:py-0 sm:text-white/30">
								{period.label}
							</span>
						</div>

						<div className="relative col-start-1 row-start-1 row-span-2 flex justify-center sm:col-start-2 sm:row-start-1 sm:row-span-1">
							<div
								className={cn(
									"absolute top-4 bottom-[-20px] w-px bg-[#1F2835] sm:top-5 sm:bottom-[-28px]",
									periodIndex === periodGroups.length - 1 && "bottom-2",
								)}
							/>
							<motion.div
								className={cn(
									"absolute top-4 bottom-[-20px] w-px origin-top bg-linear-to-b from-[#369BFD] via-[#369BFD]/70 to-transparent sm:top-5 sm:bottom-[-28px]",
									periodIndex === periodGroups.length - 1 && "bottom-2",
								)}
								initial={false}
								animate={{
									scaleY: periodHasExpandedGroup ? 1 : 0,
									opacity: periodHasExpandedGroup ? 1 : 0,
								}}
								transition={{ duration: 0.34, ease: [0.4, 0, 0.2, 1] }}
							/>
							<motion.div
								className="relative mt-1.5 flex size-3 items-center justify-center rounded-full border border-[#369BFD]/35 bg-[#0D121A] shadow-[0_0_0_4px_rgba(54,155,253,0.06)] sm:mt-3"
								initial={false}
								animate={{
									borderColor: periodHasExpandedGroup
										? "rgba(54,155,253,0.8)"
										: "rgba(54,155,253,0.35)",
									boxShadow: periodHasExpandedGroup
										? "0 0 0 7px rgba(54,155,253,0.09)"
										: "0 0 0 4px rgba(54,155,253,0.06)",
								}}
								transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
							>
								<AnimatePresence>
									{periodHasExpandedGroup && (
										<motion.div
											className="absolute inset-[-6px] rounded-full border border-[#369BFD]/35"
											initial={{ scale: 0.6, opacity: 0.8 }}
											animate={{ scale: 1.45, opacity: 0 }}
											exit={{ opacity: 0 }}
											transition={{
												duration: 0.52,
												ease: [0.2, 0.8, 0.2, 1],
											}}
										/>
									)}
								</AnimatePresence>
								<motion.div
									className="size-1.5 rounded-full bg-[#369BFD]"
									initial={false}
									animate={{ scale: periodHasExpandedGroup ? 1.15 : 1 }}
									transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
								/>
							</motion.div>
						</div>

						<div className="col-start-2 row-start-2 min-w-0 space-y-1.5 sm:col-start-3 sm:row-start-1">
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
				)
			})}

			<div ref={sentinelRef} className="h-1" />
		</div>
	)
}
