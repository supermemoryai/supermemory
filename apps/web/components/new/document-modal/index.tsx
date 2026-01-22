"use client"

import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import {
	ArrowUpRightIcon,
	XIcon,
	Loader2,
	Trash2Icon,
	CheckIcon,
} from "lucide-react"
import type { z } from "zod"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@lib/utils"
import { Title } from "./title"
import { Summary as DocumentSummary } from "./summary"
import { dmSansClassName } from "@/lib/fonts"
import { GraphListMemories, type MemoryEntry } from "./graph-list-memories"
import { DocumentContent } from "./content"
import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useDocumentMutations } from "@/hooks/use-document-mutations"
import type { UseMutationResult } from "@tanstack/react-query"
import { toast } from "sonner"
import { useIsMobile } from "@hooks/use-mobile"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

interface DocumentModalProps {
	document: DocumentWithMemories | null
	isOpen: boolean
	onClose: () => void
}

interface DeleteButtonProps {
	documentId: string | null | undefined
	customId: string | null | undefined
	deleteMutation: UseMutationResult<
		unknown,
		Error,
		{ documentId: string },
		unknown
	>
}

function isTemporaryId(id: string | null | undefined): boolean {
	if (!id) return false
	return id.startsWith("temp-") || id.startsWith("temp-file-")
}

function DeleteButton({
	documentId,
	customId,
	deleteMutation,
}: DeleteButtonProps) {
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

	const handleDelete = useCallback(() => {
		const id = documentId ?? customId
		if (!id) return

		// Check both IDs to ensure we catch temporary documents regardless of which ID is used
		if (isTemporaryId(documentId) || isTemporaryId(customId)) {
			// this is when user added document immediately and trying to delete
			toast.error("Cannot delete document", {
				description: "This document is still being processed. Please wait.",
			})
			return
		}

		deleteMutation.mutate({ documentId: id as string })
	}, [documentId, customId, deleteMutation])

	return (
		<AnimatePresence mode="wait">
			{!deleteConfirmOpen ? (
				<motion.button
					key="trash"
					type="button"
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.8 }}
					transition={{ duration: 0.15 }}
					onClick={() => setDeleteConfirmOpen(true)}
					tabIndex={-1}
					className="bg-[#0D121A] w-7 h-7 flex items-center justify-center rounded-full transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus:outline-none cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"
					disabled={deleteMutation.isPending}
				>
					<Trash2Icon className="w-4 h-4 text-red-500" />
					<span className="sr-only">Delete document</span>
				</motion.button>
			) : (
				<motion.div
					key="confirm"
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.8 }}
					transition={{ duration: 0.15 }}
					className="flex items-center gap-1 px-1 bg-[#0D121A] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"
				>
					<button
						type="button"
						onClick={() => setDeleteConfirmOpen(false)}
						disabled={deleteMutation.isPending}
						className="w-6 h-6 flex items-center justify-center rounded-full transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<XIcon className="w-4 h-4 text-[#737373]" />
						<span className="sr-only">Cancel delete</span>
					</button>
					<button
						type="button"
						onClick={handleDelete}
						disabled={deleteMutation.isPending}
						className="w-6 h-6 flex items-center justify-center rounded-full transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{deleteMutation.isPending ? (
							<Loader2 className="w-4 h-4 text-green-500 animate-spin" />
						) : (
							<CheckIcon className="w-4 h-4 text-green-500" />
						)}
						<span className="sr-only">Confirm delete</span>
					</button>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

export function DocumentModal({
	document: _document,
	isOpen,
	onClose,
}: DocumentModalProps) {
	const isMobile = useIsMobile()
	const { updateMutation, deleteMutation } = useDocumentMutations({ onClose })

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
		if (!isOpen) {
			resetEditor()
		}
	}, [isOpen, resetEditor])

	const hasUnsavedChanges =
		draftContentString !== initialEditorString &&
		draftContentString !== lastSavedContent

	const handleSave = useCallback(() => {
		if (!_document?.id) return
		updateMutation.mutate(
			{ documentId: _document.id, content: draftContentString },
			{
				onSuccess: (_data, variables) => setLastSavedContent(variables.content),
			},
		)
	}, [_document?.id, draftContentString, updateMutation])

	const textEditorProps = useMemo(
		() => ({
			documentId: _document?.id ?? "",
			editorResetNonce,
			initialEditorContent,
			hasUnsavedChanges,
			isSaving: updateMutation.isPending,
			onContentChange: setDraftContentString,
			onSave: handleSave,
			onReset: resetEditor,
		}),
		[
			_document?.id,
			editorResetNonce,
			initialEditorContent,
			hasUnsavedChanges,
			updateMutation.isPending,
			handleSave,
			resetEditor,
		],
	)

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className={cn(
					"p-0 border-none bg-[#1B1F24] flex flex-col px-3 md:px-4 pt-3 pb-4 gap-3",
					isMobile
						? "w-[calc(100vw-1rem)]! h-[calc(100dvh-1rem)]! max-w-none! max-h-none! rounded-xl"
						: "w-[80%]! max-w-[1158px]! h-[86%]! max-h-[684px]! rounded-[22px]",
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
				<div className="flex items-center justify-between h-fit gap-2 md:gap-4">
					<div className="flex-1 min-w-0">
						<Title
							title={_document?.title}
							documentType={_document?.type ?? "text"}
							url={_document?.url}
						/>
					</div>
					<div className="flex items-center gap-1.5 md:gap-2 shrink-0">
						<DeleteButton
							documentId={_document?.id}
							customId={_document?.customId}
							deleteMutation={deleteMutation}
						/>
						{_document?.url && (
							<a
								href={_document.url}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(
									"flex items-center gap-1 bg-[#0D121A] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]",
									isMobile ? "w-7 h-7 justify-center" : "px-3 py-2",
								)}
							>
								{!isMobile && (
									<span className="line-clamp-1">Visit source</span>
								)}
								<ArrowUpRightIcon className="w-4 h-4 text-[#737373]" />
							</a>
						)}
						<DialogPrimitive.Close
							className="bg-[#0D121A] w-7 h-7 flex items-center justify-center rounded-full transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:outline-none disabled:pointer-events-none cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"
							data-slot="dialog-close"
							type="button"
							tabIndex={-1}
						>
							<XIcon stroke="#737373" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>
				</div>
				<div className="flex-1 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3 overflow-hidden min-h-0">
					<div
						id="document-preview"
						className={cn(
							"bg-[#14161A] rounded-[14px] overflow-hidden flex flex-col shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)] relative",
						)}
					>
						<DocumentContent
							document={_document}
							textEditorProps={textEditorProps}
						/>
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
