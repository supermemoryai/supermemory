"use client"

import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { DocumentIcon, getDocumentTypeLabel } from "@/components/document-icon"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export function GoogleDocsPreview({
	document,
}: {
	document: DocumentWithMemories
}) {
	const label = getDocumentTypeLabel(document.type)

	return (
		<div className="bg-[#0B1017] p-3 rounded-[18px] gap-3">
			<div className="flex items-center gap-2 mb-2">
				<DocumentIcon
					type={document.type}
					url={document.url}
					className="w-4 h-4"
				/>
				<p className={cn(dmSansClassName(), "text-[12px] font-semibold")}>
					{label}
				</p>
			</div>
			{document.summary ? (
				<p className="text-[10px] text-[#737373] line-clamp-4">
					{document.summary}
				</p>
			) : document.content ? (
				<p className="text-[10px] text-[#737373] line-clamp-4">
					{document.content}
				</p>
			) : (
				<p className="text-[10px] text-[#737373] line-clamp-4">
					No summary available
				</p>
			)}
		</div>
	)
}
