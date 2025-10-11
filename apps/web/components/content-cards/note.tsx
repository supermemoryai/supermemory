import { DocumentCardFrame } from "./document-card-frame"
import { MemoryBadge } from "./memory-badge"

import { Trash2, MoreHorizontal, StickyNote } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu"
import { AlertDialog as AlertDialog2, AlertDialogAction as AlertDialogAction2, AlertDialogCancel as AlertDialogCancel2, AlertDialogContent as AlertDialogContent2, AlertDialogDescription as AlertDialogDescription2, AlertDialogFooter as AlertDialogFooter2, AlertDialogHeader as AlertDialogHeader2, AlertDialogTitle as AlertDialogTitle2 } from "@repo/ui/components/alert-dialog"
import { useState } from "react"
import { cn } from "@lib/utils"
import {
	formatDate,
	getPastelBackgroundColor,
	getSourceUrl,
} from "../memories-utils"
import { MCPIcon } from "../menu"
import { analytics } from "@/lib/analytics"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

interface NoteCardProps {
    document: DocumentWithMemories
    width: number
    activeMemories: Array<{ id: string; isForgotten?: boolean }>
    forgottenMemories: Array<{ id: string; isForgotten?: boolean }>
    onOpenDetails: (document: DocumentWithMemories) => void
    onDelete: (document: DocumentWithMemories) => void
    label?: string
}

export const NoteCard = ({
    document,
    width,
    activeMemories,
    forgottenMemories,
    onOpenDetails,
    onDelete,
    label,
}: NoteCardProps) => {
	const [confirmOpen, setConfirmOpen] = useState(false)

	return (
		<div
			onMouseDownCapture={(e) => {
				// Only suppress events that originate from inside the card wrapper.
				if (confirmOpen && (e.currentTarget as HTMLElement).contains(e.target as Node)) {
					e.stopPropagation()
					e.preventDefault()
				}
			}}
			onClickCapture={(e) => {
				if (confirmOpen && (e.currentTarget as HTMLElement).contains(e.target as Node)) {
					e.stopPropagation()
					e.preventDefault()
				}
			}}
		>
			<DocumentCardFrame
				onClick={() => {
					if (confirmOpen) return
					analytics.documentCardClicked()
					onOpenDetails(document)
				}}
				media={null}
				title={document.title || "Untitled Document"}
				metaRight={
					<NoteMenuWithConfirm
						onConfirm={() => onDelete(document)}
						open={confirmOpen}
						setOpen={setConfirmOpen}
					/>
				}
                subtitle={
                    <div className="flex items-center gap-1.5">
                        <StickyNote className="w-3 h-3" aria-hidden="true" />
                        <span>{label ?? "Note"}</span>
                    </div>
                }
				body={document.content}
				footerLeft={<MemoryBadge count={activeMemories.length} />}
				footerRight={null}
			/>
		</div>
	)
}

NoteCard.displayName = "NoteCard"

function NoteMenuWithConfirm({ onConfirm, open, setOpen }: { onConfirm: () => void, open: boolean, setOpen: (v: boolean) => void }) {
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="rounded p-1 text-muted-foreground/80 hover:bg-muted"
                        onClick={(e) => e.stopPropagation()}
                        type="button"
                        aria-label="More actions"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation()
                            setOpen(true)
                        }}
                        className="cursor-pointer text-xs text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="w-3 h-3 mr-2" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog2 open={open} onOpenChange={setOpen}>
                <AlertDialogContent2>
                    <AlertDialogHeader2>
                        <AlertDialogTitle2>Delete Document</AlertDialogTitle2>
                        <AlertDialogDescription2>
                            Are you sure you want to delete this document and all its related memories? This action cannot be undone.
                        </AlertDialogDescription2>
                    </AlertDialogHeader2>
                    <AlertDialogFooter2>
                        <AlertDialogCancel2>Cancel</AlertDialogCancel2>
                        <AlertDialogAction2
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={(e) => {
                                e.stopPropagation()
                                onConfirm()
                                setOpen(false)
                            }}
                        >
                            Delete
                        </AlertDialogAction2>
                    </AlertDialogFooter2>
                </AlertDialogContent2>
            </AlertDialog2>
        </>
    )
}
