"use client"

import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { ArrowUpRightIcon, XIcon, Loader2 } from "lucide-react"
import type { z } from "zod"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@lib/utils"
import dynamic from "next/dynamic"
import { Title } from "./title"
import { Summary as DocumentSummary } from "./summary"
import { dmSansClassName } from "@/lib/fonts"
import { GraphListMemories, type MemoryEntry } from "./graph-list-memories"
import { YoutubeVideo } from "./content/yt-video"
import { TweetContent } from "./content/tweet"
import { isTwitterUrl } from "@/lib/url-helpers"
import { NotionDoc } from "./content/notion-doc"
import { TextEditor } from "../text-editor"
import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@repo/ui/components/button"
import { useDocumentMutations } from "@/hooks/use-document-mutations"

// Dynamically importing to prevent DOMMatrix error
const PdfViewer = dynamic(
	() => import("./content/pdf").then((mod) => ({ default: mod.PdfViewer })),
	{
		ssr: false,
		loading: () => (
			<div className="flex items-center justify-center h-full text-gray-400">
				Loading PDF viewer...
			</div>
		),
	},
) as typeof import("./content/pdf").PdfViewer

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

interface DocumentModalProps {
	document: DocumentWithMemories | null
	isOpen: boolean
	onClose: () => void
}

export function DocumentModal({
	document: _document,
	isOpen,
	onClose,
}: DocumentModalProps) {
	const { updateMutation } = useDocumentMutations()

	const { initialEditorContent, initialEditorString } = useMemo(() => {
		const content = _document?.content as string | null | undefined
		return {
			initialEditorContent: content ?? undefined,
			initialEditorString: content ?? "",
		}
	}, [_document?.content])

	const [draftContentString, setDraftContentString] =
		useState(initialEditorString)
	const [editorResetNonce, setEditorResetNonce] = useState(0)
	const [lastSavedContent, setLastSavedContent] = useState<string | null>(null)

	const resetEditor = useCallback(() => {
		setDraftContentString(initialEditorString)
		setEditorResetNonce((n) => n + 1)
		setLastSavedContent(null)
	}, [initialEditorString])

	useEffect(() => {
		setDraftContentString(initialEditorString)
		setEditorResetNonce((n) => n + 1)
		setLastSavedContent(null)
	}, [initialEditorString])

	useEffect(() => {
		if (!isOpen) resetEditor()
	}, [isOpen, resetEditor])

	const hasUnsavedChanges =
		draftContentString !== initialEditorString &&
		draftContentString !== lastSavedContent

	const handleSave = useCallback(() => {
		if (!_document?.id) return
		updateMutation.mutate(
			{ documentId: _document.id, content: draftContentString },
			{ onSuccess: (_data, variables) => setLastSavedContent(variables.content) },
		)
	}, [_document?.id, draftContentString, updateMutation])

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className={cn(
					"w-[80%]! max-w-[1158px]! h-[86%]! max-h-[684px]! p-0 border-none bg-[#1B1F24] flex flex-col px-4 pt-3 pb-4 gap-3 rounded-[22px]",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">
					{_document?.title} - Document
				</DialogTitle>
				<div className="flex justify-between h-fit">
					<Title
						title={_document?.title}
						documentType={_document?.type ?? "text"}
						url={_document?.url}
					/>
					<div className="flex items-center gap-2">
						{_document?.url && (
							<a
								href={_document.url}
								target="_blank"
								rel="noopener noreferrer"
								className="line-clamp-1 px-3 py-2 flex items-center gap-1 bg-[#0D121A] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"
							>
								Visit source
								<ArrowUpRightIcon className="w-4 h-4 text-[#737373]" />
							</a>
						)}
						<DialogPrimitive.Close
							className="bg-[#0D121A] w-7 h-7 flex items-center justify-center focus:ring-ring rounded-full transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"
							data-slot="dialog-close"
						>
							<XIcon stroke="#737373" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>
				</div>
				<div className="flex-1 grid grid-cols-[2fr_1fr] gap-3 overflow-hidden min-h-0">
					<div
						id="document-preview"
						className={cn(
							"bg-[#14161A] rounded-[14px] overflow-hidden flex flex-col shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)] relative",
						)}
					>
						{(_document?.type === "tweet" ||
							(_document?.url && isTwitterUrl(_document.url))) && (
							<TweetContent
								url={_document?.url}
								tweetMetadata={
									_document?.metadata?.sm_internal_twitter_metadata
								}
							/>
						)}
						{_document?.type === "text" && (
							<>
								<div className="p-4 overflow-y-auto flex-1 scrollbar-thin">
									<TextEditor
										key={`${_document.id}-${editorResetNonce}`}
										content={initialEditorContent}
										onContentChange={setDraftContentString}
										onSubmit={handleSave}
									/>
								</div>
								<AnimatePresence>
									{hasUnsavedChanges && (
										<motion.div
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: 20 }}
											transition={{ duration: 0.2 }}
											className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-[#1B1F24] rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_1px_1px_1px_rgba(255,255,255,0.1)]"
										>
											<span className="text-sm text-[#737373]">
												Unsaved changes
											</span>
											<Button
												variant="ghost"
												size="sm"
												onClick={resetEditor}
												disabled={updateMutation.isPending}
												className="text-[#737373]/80 hover:text-white rounded-full px-3"
											>
												Cancel
											</Button>
											<Button
												variant="insideOut"
												size="sm"
												onClick={handleSave}
												disabled={updateMutation.isPending}
												className="hover:text-white rounded-full px-4"
											>
												{updateMutation.isPending ? (
													<>
														<Loader2 className="size-4 animate-spin mr-1" />
														Saving...
													</>
												) : (
													<>
														Save
														<span
															className={cn(
																"bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm px-1 py-0.5 text-[10px] flex items-center justify-center",
																dmSansClassName(),
															)}
														>
															⌘+Enter
														</span>
													</>
												)}
											</Button>
										</motion.div>
									)}
								</AnimatePresence>
							</>
						)}
						{_document?.type === "pdf" && <PdfViewer url={_document.url} />}
						{_document?.type === "notion_doc" && (
							<NotionDoc content={_document.content ?? ""} />
						)}
						{_document?.url?.includes("youtube.com") && (
							<YoutubeVideo url={_document.url} />
						)}
					</div>
					<div
						id="document-memories-summary"
						className={cn(
							"gap-3 flex flex-col overflow-hidden",
							dmSansClassName(),
						)}
					>
						{_document?.summary && (
							<DocumentSummary
								memoryEntries={_document.memoryEntries}
								summary={_document.summary}
								createdAt={_document.createdAt}
							/>
						)}
						{_document?.memoryEntries && _document.memoryEntries.length > 0 && (
							<GraphListMemories
								memoryEntries={_document.memoryEntries as MemoryEntry[]}
							/>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
