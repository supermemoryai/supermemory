"use client"

import { Dialog, DialogContent } from "@repo/ui/components/dialog"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { ArrowUpRightIcon, XIcon } from "lucide-react"
import type { z } from "zod"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@lib/utils"
import { Title } from "./title"
import { Summary as DocumentSummary } from "./summary"
import { dmSansClassName } from "@/utils/fonts"
import { GraphListMemories, type MemoryEntry } from "./graph-list-memories"
import { PdfViewer } from "./content/pdf"

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
	console.log(_document)
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className={cn(
					"w-[1158px]! h-[684px]! max-w-none! sm:max-w-none! p-0 border-none bg-[#1B1F24] flex flex-col px-4 pt-3 pb-4 gap-3 rounded-[22px]",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<div className="flex justify-between h-fit">
					<Title
						title={_document?.title}
						documentType={_document?.type ?? "text"}
					/>
					<div className="flex items-center gap-2">
						{_document?.type === "pdf" && _document.url && (
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
							className="bg-[#0D121A] w-7 h-7 flex items-center justify-center focus:ring-ring rounded-full transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"
							data-slot="dialog-close"
						>
							<XIcon stroke="#737373" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>
				</div>
				<div className="flex-1 grid grid-cols-[2fr_1fr] gap-3 overflow-hidden">
					<div
						id="document-preview"
						className={cn(
							"bg-[#14161A] rounded-[14px] overflow-hidden flex flex-col shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]",
						)}
					>
						{_document?.type === "text" && (
							<div className="p-4">{_document.content}</div>
						)}
						{_document?.type === "pdf" && <PdfViewer url={_document.url} />}
					</div>
					<div
						id="document-memories-summary"
						className={cn("gap-3 flex flex-col", dmSansClassName())}
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
