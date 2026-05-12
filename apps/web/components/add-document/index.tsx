"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useQueryState } from "nuqs"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { FileTextIcon, GlobeIcon, ZapIcon, Loader2, XIcon } from "lucide-react"
import { Button } from "@ui/components/button"
import { ConnectContent } from "./connections"
import { NoteContent } from "./note"
import { LinkContent, type LinkData } from "./link"
import {
	FileContent,
	type FileData,
	type FileQueueItem,
	fileQueueKey,
} from "./file"
import { useProject } from "@/stores"
import { toast } from "sonner"
import { useDocumentMutations } from "../../hooks/use-document-mutations"
import { normalizeUrl } from "@/lib/url-helpers"
import { SpaceSelector } from "../space-selector"
import { useIsMobile } from "@hooks/use-mobile"
import { addDocumentParam } from "@/lib/search-params"

type TabType = "note" | "link" | "file" | "connect"

interface AddDocumentModalProps {
	isOpen: boolean
	onClose: () => void
}

export function AddDocumentModal({ isOpen, onClose }: AddDocumentModalProps) {
	const isMobile = useIsMobile()
	const hasUnsavedContentRef = useRef<() => boolean>(() => false)
	const isSubmittingRef = useRef(false)

	const confirmThenClose = useCallback(() => {
		if (isSubmittingRef.current) return // Block close during submission
		if (hasUnsavedContentRef.current()) {
			const confirmed = window.confirm(
				"You have unsaved content. Are you sure you want to close?",
			)
			if (!confirmed) return
		}
		onClose()
	}, [onClose])

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open: boolean) => !open && confirmThenClose()}
		>
			<DialogContent
				className={cn(
					"border-none bg-[#1B1F24] flex flex-col",
					isMobile
						? "top-2! left-2! translate-x-0! translate-y-0! w-[calc(100vw-1rem)]! h-[calc(100dvh-1rem)]! max-w-none! max-h-none! rounded-[18px] p-0 gap-0 overflow-hidden"
						: "w-[80%]! max-w-[1000px]! h-[80%]! max-h-[800px]! rounded-[22px] p-4 gap-3",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">Add Document</DialogTitle>
				<div className="min-h-0 flex-1 overflow-hidden">
					<AddDocument
						onClose={onClose}
						onRequestClose={confirmThenClose}
						isOpen={isOpen}
						hasUnsavedContentRef={hasUnsavedContentRef}
						isSubmittingRef={isSubmittingRef}
					/>
				</div>
			</DialogContent>
		</Dialog>
	)
}

const tabs = [
	{
		id: "note" as const,
		icon: FileTextIcon,
		title: "Write a note",
		description: "Save your thoughts, notes and summaries, as memories",
	},
	{
		id: "link" as const,
		icon: GlobeIcon,
		title: "Save a link",
		description: "Add any webpage into your searchable knowledge base",
	},
	{
		id: "file" as const,
		icon: FileTextIcon,
		title: "Upload files",
		description: "Turn images, PDFs, documents, and markdown into memories",
	},
	{
		id: "connect" as const,
		icon: ZapIcon,
		title: "Connect knowledge bases",
		description: "Sync with Google Drive, Notion and OneDrive and import data",
		isPro: true,
	},
]

export function AddDocument({
	onClose,
	onRequestClose,
	isOpen,
	hasUnsavedContentRef,
	isSubmittingRef,
}: {
	onClose: () => void
	onRequestClose?: () => void
	isOpen?: boolean
	hasUnsavedContentRef?: React.MutableRefObject<() => boolean>
	isSubmittingRef?: React.MutableRefObject<boolean>
}) {
	const isMobile = useIsMobile()
	const [addParam, setAddParam] = useQueryState("add", addDocumentParam)
	const activeTab: TabType = addParam ?? "note"
	const setActiveTab = useCallback(
		(tab: TabType) => {
			setAddParam(tab)
		},
		[setAddParam],
	)
	const { selectedProject: globalSelectedProject } = useProject()
	const [localSelectedProject, setLocalSelectedProject] = useState<string>(
		globalSelectedProject,
	)

	// Form data state for button click handling
	const [noteContent, setNoteContent] = useState("")
	const [notePlainText, setNotePlainText] = useState("")
	const [noteContentType, setNoteContentType] = useState<"note" | "link">(
		"note",
	)
	const [linkData, setLinkData] = useState<LinkData>({
		url: "",
	})
	const [fileData, setFileData] = useState<FileData>({
		items: [],
		title: "",
		description: "",
	})
	const fileDataRef = useRef(fileData)
	fileDataRef.current = fileData

	const [noteDroppedFiles, setNoteDroppedFiles] = useState<FileQueueItem[]>([])

	// When submitting both text and files simultaneously, the first mutation to
	// complete would trigger onClose and dismiss the modal before the second
	// finishes. This ref gates the onClose callback so the combined submission
	// in handleButtonClick can await both promises and close the modal itself.
	const skipMutationCloseRef = useRef(false)

	const { noteMutation, linkMutation, fileMutation } = useDocumentMutations({
		onClose: () => {
			if (!skipMutationCloseRef.current) {
				onClose()
			}
		},
	})

	useEffect(() => {
		setLocalSelectedProject(globalSelectedProject)
	}, [globalSelectedProject])

	useEffect(() => {
		if (!isOpen) {
			setFileData({ items: [], title: "", description: "" })
			setNotePlainText("")
			setNoteContentType("note")
			setNoteDroppedFiles([])
		}
	}, [isOpen])

	// Submit handlers
	const handleNoteSubmit = useCallback(
		(content: string, contentType: "note" | "link") => {
			if (!content.trim()) {
				toast.error("Please enter some content")
				return
			}
			if (contentType === "link") {
				// Use plain text for URL — markdown serialization may wrap URLs
				// in link syntax like [url](url) which would corrupt the value.
				const normalizedUrl = normalizeUrl(notePlainText.trim())
				linkMutation.mutate({
					url: normalizedUrl,
					project: localSelectedProject,
				})
			} else {
				noteMutation.mutate({ content, project: localSelectedProject })
			}
		},
		[noteMutation, linkMutation, localSelectedProject, notePlainText],
	)

	const handleLinkSubmit = useCallback(
		(data: LinkData) => {
			const normalizedUrl = normalizeUrl(data.url.trim())
			if (!normalizedUrl || normalizedUrl === "https://") {
				toast.error("Please enter a URL")
				return
			}
			linkMutation.mutate({ url: normalizedUrl, project: localSelectedProject })
		},
		[linkMutation, localSelectedProject],
	)

	const handleFileSubmit = useCallback(
		async (data: FileData) => {
			const pending = data.items.filter((i) => i.status === "pending")
			if (pending.length === 0) {
				toast.error("Please add at least one file")
				return
			}
			const applyMeta = pending.length === 1
			setFileData((prev) => ({
				...prev,
				items: prev.items.map((i) =>
					i.status === "pending" ? { ...i, status: "uploading" as const } : i,
				),
			}))
			try {
				const result = await fileMutation.mutateAsync({
					fileEntries: pending.map((i) => ({ id: i.id, file: i.file })),
					title: applyMeta ? data.title || undefined : undefined,
					description: applyMeta ? data.description || undefined : undefined,
					project: localSelectedProject,
				})
				setFileData((prev) => ({
					...prev,
					items: prev.items.map((i) => {
						if (i.status !== "uploading") return i
						const fail = result.failures.find((f) => f.id === i.id)
						if (fail) {
							return {
								...i,
								status: "error" as const,
								errorMessage: fail.message,
							}
						}
						return { ...i, status: "success" as const }
					}),
				}))
			} catch {
				setFileData((prev) => ({
					...prev,
					items: prev.items.map((i) =>
						i.status === "uploading"
							? {
									...i,
									status: "error" as const,
									errorMessage: "Upload failed",
								}
							: i,
					),
				}))
			}
		},
		[fileMutation, localSelectedProject],
	)

	const handleNoteFilesDropped = useCallback((files: File[]) => {
		setNoteDroppedFiles((prev) => {
			const existingKeys = new Set(prev.map((i) => fileQueueKey(i.file)))
			let duplicateCount = 0
			const toAdd: FileQueueItem[] = []
			for (const file of files) {
				const key = fileQueueKey(file)
				if (existingKeys.has(key)) {
					duplicateCount++
					continue
				}
				existingKeys.add(key)
				toAdd.push({ id: crypto.randomUUID(), file, status: "pending" })
			}
			if (duplicateCount > 0) {
				toast.message(
					duplicateCount === 1
						? "Skipped duplicate file"
						: `Skipped ${duplicateCount} duplicate files`,
				)
			}
			if (toAdd.length === 0) return prev
			return [...prev, ...toAdd]
		})
	}, [])

	const handleRemoveNoteFile = useCallback((id: string) => {
		setNoteDroppedFiles((prev) => prev.filter((f) => f.id !== id))
	}, [])

	const handleRetryNoteFile = useCallback((id: string) => {
		setNoteDroppedFiles((prev) =>
			prev.map((f) =>
				f.id === id
					? { ...f, status: "pending" as const, errorMessage: undefined }
					: f,
			),
		)
	}, [])

	const handleNoteFileSubmit = useCallback(async () => {
		const pending = noteDroppedFiles.filter((i) => i.status === "pending")
		if (pending.length === 0) return

		setNoteDroppedFiles((prev) =>
			prev.map((i) =>
				i.status === "pending" ? { ...i, status: "uploading" as const } : i,
			),
		)

		try {
			const result = await fileMutation.mutateAsync({
				fileEntries: pending.map((i) => ({ id: i.id, file: i.file })),
				project: localSelectedProject,
			})
			setNoteDroppedFiles((prev) =>
				prev.map((i) => {
					if (i.status !== "uploading") return i
					const fail = result.failures.find((f) => f.id === i.id)
					if (fail) {
						return {
							...i,
							status: "error" as const,
							errorMessage: fail.message,
						}
					}
					return { ...i, status: "success" as const }
				}),
			)
			return result
		} catch {
			setNoteDroppedFiles((prev) =>
				prev.map((i) =>
					i.status === "uploading"
						? {
								...i,
								status: "error" as const,
								errorMessage: "Upload failed",
							}
						: i,
				),
			)
			throw new Error("File upload failed")
		}
	}, [noteDroppedFiles, fileMutation, localSelectedProject])

	// Data change handlers
	const handleNoteContentChange = useCallback((content: string) => {
		setNoteContent(content)
	}, [])

	const handleNotePlainTextChange = useCallback((text: string) => {
		setNotePlainText(text)
	}, [])

	const handleLinkDataChange = useCallback((data: LinkData) => {
		setLinkData(data)
	}, [])

	const handleFileDataChange = useCallback((data: FileData) => {
		setFileData(data)
	}, [])

	const handleButtonClick = useCallback(async () => {
		switch (activeTab) {
			case "note": {
				const hasPendingFiles = noteDroppedFiles.some(
					(i) => i.status === "pending",
				)
				const hasText = noteContent.trim().length > 0

				if (hasText && hasPendingFiles) {
					// Save all: text + files
					skipMutationCloseRef.current = true
					try {
						// Use plain text for link URLs — markdown may wrap them in
						// link syntax like [url](url) which would corrupt the value.
						const textPromise =
							noteContentType === "link"
								? linkMutation.mutateAsync({
										url: normalizeUrl(notePlainText.trim()),
										project: localSelectedProject,
									})
								: noteMutation.mutateAsync({
										content: noteContent,
										project: localSelectedProject,
									})
						const filePromise = handleNoteFileSubmit()
						const [, fileResult] = await Promise.all([textPromise, filePromise])
						// Only close if all file uploads succeeded; partial failures
						// should keep the modal open so users can retry or remove items.
						const hasFileFailures = fileResult && fileResult.failures.length > 0
						if (!hasFileFailures) {
							onClose()
						}
					} catch {
						// At least one failed — modal stays open
					} finally {
						skipMutationCloseRef.current = false
					}
				} else if (hasPendingFiles) {
					void handleNoteFileSubmit().catch(() => {
						/* errors handled in handleNoteFileSubmit */
					})
				} else if (hasText) {
					handleNoteSubmit(noteContent, noteContentType)
				} else {
					toast.error("Please enter some content or drop a file")
				}
				break
			}
			case "link":
				handleLinkSubmit(linkData)
				break
			case "file":
				void handleFileSubmit(fileData)
				break
		}
	}, [
		activeTab,
		noteDroppedFiles,
		noteContent,
		notePlainText,
		noteContentType,
		linkMutation,
		noteMutation,
		localSelectedProject,
		handleNoteFileSubmit,
		onClose,
		handleNoteSubmit,
		handleLinkSubmit,
		linkData,
		handleFileSubmit,
		fileData,
	])

	const handleNoteRequestSubmit = useCallback(() => {
		// Called by Cmd+Enter from the editor — uses same logic as CTA button
		void handleButtonClick()
	}, [handleButtonClick])

	const isSubmitting =
		noteMutation.isPending || linkMutation.isPending || fileMutation.isPending

	const hasUnsavedContent = useCallback((): boolean => {
		if (noteContent.trim().length > 0) return true
		if (noteDroppedFiles.length > 0) return true
		if (linkData.url.trim().length > 0) return true
		if (fileData.items.length > 0) return true
		return false
	}, [noteContent, noteDroppedFiles, linkData, fileData])

	useEffect(() => {
		if (hasUnsavedContentRef) {
			hasUnsavedContentRef.current = hasUnsavedContent
		}
	}, [hasUnsavedContent, hasUnsavedContentRef])

	useEffect(() => {
		if (isSubmittingRef) {
			isSubmittingRef.current = isSubmitting
		}
	}, [isSubmitting, isSubmittingRef])

	// Delegate to the parent's confirmation-aware close when available (modal
	// context), otherwise fall back to closing directly (standalone usage).
	const handleClose = onRequestClose ?? onClose

	const ctaLabel = useMemo(() => {
		if (activeTab === "note") {
			const noteHasPendingFiles = noteDroppedFiles.some(
				(i) => i.status === "pending",
			)
			const noteHasText = noteContent.trim().length > 0
			if (noteHasText && noteHasPendingFiles) {
				return "Save all"
			}
			if (noteHasPendingFiles) {
				const pendingCount = noteDroppedFiles.filter(
					(i) => i.status === "pending",
				).length
				return pendingCount === 1 ? "Save file" : `Save ${pendingCount} files`
			}
			return noteContentType === "link" ? "Save link" : "Save note"
		}
		if (activeTab === "link") return "Save link"
		return `+ Add ${activeTab}`
	}, [activeTab, noteDroppedFiles, noteContent, noteContentType])

	const fileTabHasPending = fileData.items.some((i) => i.status === "pending")
	const fileTabSubmitDisabled =
		activeTab === "file" && (!fileTabHasPending || isSubmitting)

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden text-white md:flex-row md:space-x-5">
			<div
				className={cn(
					"flex flex-col justify-between",
					isMobile
						? "w-full shrink-0 border-b border-[#0F1621] bg-[#1B1F24] px-3 pt-3 pb-3"
						: "w-1/3",
				)}
			>
				{isMobile && (
					<div className="mb-3 flex items-center justify-between">
						<div>
							<p
								className={cn(
									"text-sm font-medium text-white",
									dmSansClassName(),
								)}
							>
								Add memory
							</p>
							<p className="text-xs text-[#737373]">
								Save something to recall later
							</p>
						</div>
						<button
							type="button"
							onClick={handleClose}
							disabled={isSubmitting}
							className="flex size-9 items-center justify-center rounded-full border border-[#1F2937] bg-[#0D121A] text-[#8B8B8B] transition-colors hover:text-white disabled:opacity-50"
							aria-label="Close add memory"
						>
							<XIcon className="size-4" />
						</button>
					</div>
				)}
				<div
					className={cn(
						isMobile ? "grid grid-cols-4 gap-1" : "flex flex-col gap-1",
					)}
				>
					{tabs.map((tab) => (
						<TabButton
							key={tab.id}
							active={activeTab === tab.id}
							onClick={() => setActiveTab(tab.id)}
							icon={tab.icon}
							title={tab.title}
							description={tab.description}
							isPro={tab.isPro}
							compact={isMobile}
						/>
					))}
				</div>
			</div>

			<div
				className={cn(
					"flex min-h-0 flex-1 flex-col",
					isMobile ? "w-full px-3 pt-3" : "w-2/3 px-1",
				)}
			>
				<div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
					{activeTab === "note" && (
						<NoteContent
							onSubmit={handleNoteSubmit}
							onContentChange={handleNoteContentChange}
							onPlainTextChange={handleNotePlainTextChange}
							onContentTypeChange={setNoteContentType}
							onRequestSubmit={handleNoteRequestSubmit}
							isSubmitting={
								noteMutation.isPending ||
								linkMutation.isPending ||
								fileMutation.isPending
							}
							isOpen={isOpen}
							onFilesDropped={handleNoteFilesDropped}
							onRemoveFile={handleRemoveNoteFile}
							onRetryFile={handleRetryNoteFile}
							droppedFiles={noteDroppedFiles.map((f) => ({
								id: f.id,
								name: f.file.name,
								size: f.file.size,
								status: f.status,
								errorMessage: f.errorMessage,
							}))}
						/>
					)}
					{activeTab === "link" && (
						<LinkContent
							onSubmit={handleLinkSubmit}
							onDataChange={handleLinkDataChange}
							isSubmitting={linkMutation.isPending}
							isOpen={isOpen}
						/>
					)}
					{activeTab === "file" && (
						<FileContent
							data={fileData}
							onDataChange={handleFileDataChange}
							onRequestSubmit={() => {
								void handleFileSubmit(fileDataRef.current)
							}}
							isSubmitting={fileMutation.isPending}
							isOpen={isOpen}
						/>
					)}
					{activeTab === "connect" && (
						<ConnectContent selectedProject={localSelectedProject} />
					)}
				</div>
				<div
					className={cn(
						"flex shrink-0 gap-2",
						isMobile
							? "mx-[-0.75rem] mt-3 border-t border-[#0F1621] bg-[#1B1F24] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
							: "justify-between pt-3",
					)}
				>
					{!isMobile && (
						<SpaceSelector
							selectedProjects={[localSelectedProject]}
							onValueChange={(projects) =>
								setLocalSelectedProject(projects[0] ?? localSelectedProject)
							}
							variant="insideOut"
							singleSelect
						/>
					)}
					<div
						className={cn(
							"flex items-center gap-2",
							isMobile && "w-full justify-end",
						)}
					>
						<Button
							variant="ghost"
							onClick={handleClose}
							disabled={isSubmitting}
							className={cn(
								"cursor-pointer rounded-full text-[#737373]",
								isMobile && "h-11 px-4",
							)}
						>
							Cancel
						</Button>
						{activeTab !== "connect" && (
							<Button
								variant="insideOut"
								onClick={() => void handleButtonClick()}
								disabled={
									activeTab === "file" ? fileTabSubmitDisabled : isSubmitting
								}
								className={cn(isMobile && "h-11 min-w-[8rem] px-5")}
							>
								{isSubmitting ? (
									<>
										<Loader2 className="size-4 animate-spin mr-2" />
										Adding…
									</>
								) : (
									<>
										{ctaLabel}{" "}
										{!isMobile && (
											<span
												className={cn(
													"bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm px-1 py-0.5 text-[10px] flex items-center justify-center",
													dmSansClassName(),
												)}
											>
												⌘+Enter
											</span>
										)}
									</>
								)}
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

function TabButton({
	active,
	onClick,
	icon: Icon,
	title,
	description,
	isPro,
	compact,
}: {
	active: boolean
	onClick: () => void
	icon: React.ComponentType<{ className?: string }>
	title: string
	description: string
	isPro?: boolean
	compact?: boolean
}) {
	if (compact) {
		return (
			<button
				type="button"
				onClick={onClick}
				className={cn(
					"relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-center transition-colors focus:outline-none focus:ring-0",
					active
						? "bg-[#0F141B] text-white shadow-inside-out ring-1 ring-[#2261CA33]"
						: "text-[#8B8B8B] hover:bg-[#14161A]/50",
					dmSansClassName(),
				)}
			>
				<Icon className="size-3.5 shrink-0" />
				<span
					className={cn(
						"min-w-0 truncate text-xs font-medium leading-none",
						dmSansClassName(),
					)}
				>
					{title.split(" ")[0]}
				</span>
				{isPro && (
					<span className="absolute top-1 right-1 rounded bg-[#4BA0FA] px-1 py-0.5 text-[7px] font-semibold leading-none text-black">
						PRO
					</span>
				)}
			</button>
		)
	}

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-start gap-3 p-4 rounded-[16px] text-left transition-colors w-full focus:outline-none focus:ring-0",
				active
					? "bg-[#14161A] shadow-inside-out"
					: "hover:bg-[#14161A]/50 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]",
				dmSansClassName(),
			)}
		>
			<Icon className={cn("size-5 mt-0.5 shrink-0 text-white")} />
			<div className="flex flex-col gap-0.5 text-[16px]">
				<div className="flex items-center justify-between gap-2">
					<span className={cn("font-medium text-white", dmSansClassName())}>
						{title}
					</span>
					{isPro && (
						<span className="bg-[#4BA0FA] text-black text-[10px] font-semibold px-1.5 py-0.5 rounded">
							PRO
						</span>
					)}
				</div>
				<span className="text-[#737373]">{description}</span>
			</div>
		</button>
	)
}
