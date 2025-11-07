"use client"

import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/utils/fonts"
import { cn } from "@lib/utils"
import { PDF } from "@ui/assets/icons"
import { FileText, Image, Video } from "lucide-react"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

function getFileTypeInfo(document: DocumentWithMemories): {
	icon: React.ReactNode
	extension: string
	color?: string
} {
	const type = document.type?.toLowerCase()
	const mimeType = document.metadata?.mimeType as string | undefined

	if (mimeType) {
		if (mimeType === "application/pdf") {
			return {
				icon: <PDF className="w-4 h-4 text-[#DC2626]" />,
				extension: ".pdf",
                color: "#DC2626",
			}
		}
		if (mimeType.startsWith("image/")) {
			const ext = mimeType.split("/")[1] || "jpg"
			return {
				icon: <Image className="w-4 h-4" style={{ color: "#FAFAFA" }} />,
				extension: `.${ext}`,
			}
		}
		if (mimeType.startsWith("video/")) {
			const ext = mimeType.split("/")[1] || "mp4"
			return {
				icon: <Video className="w-4 h-4" style={{ color: "#FAFAFA" }} />,
				extension: `.${ext}`,
			}
		}
	}

	// Fall back to document type
	switch (type) {
		case "pdf":
			return {
				icon: <PDF className="w-4 h-4 text-[#DC2626]" />,
				extension: ".pdf",
                color: "#DC2626",
			}
		case "image":
			return {
				icon: <Image className="w-4 h-4" style={{ color: "#FAFAFA" }} />,
				extension: ".jpg",
			}
		case "video":
			return {
				icon: <Video className="w-4 h-4" style={{ color: "#FAFAFA" }} />,
				extension: ".mp4",
			}
		default:
			return {
				icon: <FileText className="w-4 h-4" style={{ color: "#FAFAFA" }} />,
				extension: ".file",
			}
	}
}

export function FilePreview({ document }: { document: DocumentWithMemories }) {
	const { icon, extension, color } = getFileTypeInfo(document)

	return (
		<div className="bg-[#0B1017] p-3 rounded-[18px] gap-3 relative">
			{color && (
				<div
					className="absolute left-0 top-3 bottom-3 w-[2px]"
					style={{
						background: `linear-gradient(to bottom, transparent, ${color} 10%, ${color} 90%, transparent)`,
					}}
				/>
			)}
			<div className="flex items-center gap-1 mb-2">
				{icon}
				<p
					className={cn(dmSansClassName(), "text-[12px] font-semibold")}
					style={{ color: color }}
				>
					{extension}
				</p>
			</div>
			{document.content && (
				<p className="text-[10px] text-[#737373] line-clamp-4">
					{document.content}
				</p>
			)}
		</div>
	)
}

