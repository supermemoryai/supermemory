"use client"

import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { DocumentIcon } from "@/components/document-icon"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export function NotePreview({ document }: { document: DocumentWithMemories }) {
	return (
		<div className="bg-[#0B1017] p-3 rounded-[18px] space-y-2">
			<div className="flex items-center gap-1">
				<DocumentIcon type="note" className="w-4 h-4" />
				<p className={cn(dmSansClassName(), "text-[12px] font-semibold")}>
					Note
				</p>
			</div>
			<div>
				{document.title && (
					<p
						className={cn(
							dmSansClassName(),
							"text-[12px] font-semibold line-clamp-2 leading-[125%]",
						)}
					>
						{document.title}
					</p>
				)}
				{document.summary && (
					<p className="text-[10px] text-[#737373] line-clamp-4">
						{document.summary}
					</p>
				)}
			</div>
		</div>
	)
}
