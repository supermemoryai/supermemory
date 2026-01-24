"use client"

import { useState } from "react"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { DocumentIcon } from "@/components/new/document-icon"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

function getFileTypeInfo(document: DocumentWithMemories): {
	extension: string
	color?: string
} {
	const type = document.type?.toLowerCase()
	const mimeType = document.metadata?.mimeType as string | undefined

	if (mimeType) {
		if (mimeType === "application/pdf") {
			return { extension: ".pdf", color: "#FF7673" }
		}
		if (mimeType.startsWith("image/")) {
			const ext = mimeType.split("/")[1] || "jpg"
			return { extension: `.${ext}` }
		}
		if (mimeType.startsWith("video/")) {
			const ext = mimeType.split("/")[1] || "mp4"
			return { extension: `.${ext}` }
		}
	}

	switch (type) {
		case "pdf":
			return { extension: ".pdf", color: "#FF7673" }
		case "image":
			return { extension: ".jpg" }
		case "video":
			return { extension: ".mp4" }
		default:
			return { extension: ".file" }
	}
}

export function FilePreview({ document }: { document: DocumentWithMemories }) {
	const [imageError, setImageError] = useState(false)
	const { extension, color } = getFileTypeInfo(document)

	const type = document.type?.toLowerCase()
	const mimeType = document.metadata?.mimeType as string | undefined
	const isImage =
		(mimeType?.startsWith("image/") || type === "image") &&
		document.url &&
		!imageError

	return (
		<div className="bg-[#0B1017] rounded-[18px] gap-3 relative overflow-hidden">
			{color && (
				<div
					className="absolute left-0 top-3 bottom-3 w-[2px]"
					style={{
						background: `linear-gradient(to bottom, transparent, ${color} 10%, ${color} 90%, transparent)`,
					}}
				/>
			)}
			{isImage && document.url ? (
				<div className="relative w-full overflow-hidden flex items-center justify-center">
					<div
						className="absolute inset-0 bg-cover bg-center"
						style={{
							backgroundImage: `url(${document.url})`,
							filter: "blur(10px)",
							transform: "scale(1.1)",
						}}
					/>
					<div className="absolute inset-0 bg-black/20" />
					<img
						src={document.url}
						alt={document.title || "Image preview"}
						className="relative max-w-full max-h-full w-auto h-auto object-contain z-10"
						onError={() => setImageError(true)}
						loading="lazy"
					/>
				</div>
			) : (
				<div className="p-3">
					<div className="flex items-center gap-1 mb-2">
						<DocumentIcon
							type={document.type}
							url={document.url}
							className="w-4 h-4"
						/>
						<p
							className={cn(dmSansClassName(), "text-[10px] font-semibold")}
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
			)}
		</div>
	)
}
