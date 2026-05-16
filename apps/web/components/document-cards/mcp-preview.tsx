"use client"

import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { ClaudeDesktopIcon, MCPIcon } from "@ui/assets/icons"
import type { ParsedPluginDocument } from "@/lib/plugin-document"
import { PluginPreview } from "./plugin-preview"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export function McpPreview({
	document,
	parsed,
}: {
	document: DocumentWithMemories
	parsed?: ParsedPluginDocument | null
}) {
	if (parsed) {
		return <PluginPreview parsed={parsed} />
	}
	const clientName =
		typeof document.metadata?.sm_internal_mcp_client_name === "string"
			? document.metadata.sm_internal_mcp_client_name
					.replace(/[_-]+/g, " ")
					.replace(/\b\w/g, (match) => match.toUpperCase())
			: "MCP Client"

	return (
		<div className="bg-[#0B1017] p-3 rounded-[18px] space-y-2">
			<div className="flex items-center justify-between gap-1">
				<p
					className={cn(
						dmSansClassName(),
						"text-[13px] font-semibold flex items-center gap-1",
					)}
				>
					<ClaudeDesktopIcon className="size-3" />
					{clientName}
				</p>
				<MCPIcon className="size-6" />
			</div>
			<div className="space-y-[6px]">
				{document.title && (
					<p className={cn(dmSansClassName(), "text-[13px] font-semibold")}>
						{document.title}
					</p>
				)}
				{document.content && (
					<p className="text-[11px] text-[#737373] line-clamp-4">
						{document.content}
					</p>
				)}
			</div>
		</div>
	)
}
