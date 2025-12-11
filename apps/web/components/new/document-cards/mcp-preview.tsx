"use client"

import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/utils/fonts"
import { cn } from "@lib/utils"
import { ClaudeDesktopIcon, MCPIcon } from "@ui/assets/icons"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export function McpPreview({ document }: { document: DocumentWithMemories }) {
	return (
		<div className="bg-[#0B1017] p-3 rounded-[18px] space-y-2">
			<div className="flex items-center justify-between gap-1">
				<p className={cn(dmSansClassName(), "text-[12px] font-semibold flex items-center gap-1")}>
                    <ClaudeDesktopIcon className="size-3" />
					Claude Desktop
				</p>
                <MCPIcon className="size-6" />
			</div>
			<div className="space-y-[6px]">
				{document.title && (
					<p className={cn(dmSansClassName(), "text-[12px] font-semibold")}>
						{document.title}
					</p>
				)}
				{document.content && (
					<p className="text-[10px] text-[#737373] line-clamp-4">
						{document.content}
					</p>
				)}
			</div>
		</div>
	)
}
