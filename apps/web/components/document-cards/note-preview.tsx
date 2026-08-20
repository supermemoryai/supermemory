"use client"

import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { DocumentIcon } from "@/components/document-icon"
import type { ParsedPluginDocument } from "@/lib/plugin-document"
import { resolveDocumentTitle } from "@/lib/document-title"
import { PluginPreview } from "./plugin-preview"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export function NotePreview({
	document,
	parsed,
}: {
	document: DocumentWithMemories
	parsed?: ParsedPluginDocument | null
}) {
	if (parsed) {
		return <PluginPreview parsed={parsed} />
	}

	const title = resolveDocumentTitle(document)

	return (
		<div className="bg-[#0B1017] p-3 rounded-[18px] space-y-2">
			<div className="flex items-center gap-1">
				<DocumentIcon type="note" className="size-4" />
				<p className={cn(dmSansClassName(), "text-[13px] font-semibold")}>
					Note
				</p>
			</div>
			<div>
				{title && (
					<p
						className={cn(
							dmSansClassName(),
							"text-[13px] font-semibold line-clamp-2 leading-[125%]",
						)}
					>
						{title}
					</p>
				)}
				{document.summary && (
					<p className="text-[11px] text-[#737373] line-clamp-4">
						{document.summary}
					</p>
				)}
			</div>
		</div>
	)
}
