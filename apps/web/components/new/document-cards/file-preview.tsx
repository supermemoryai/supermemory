"use client"

import { useState } from "react"
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

	switch (type) {
		case "pdf":
			return {
				icon: <PDF className="w-4 h-4 text-[#FF7673]" />,
				extension: ".pdf",
				color: "#FF7673",
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
	const [imageError, setImageError] = useState(false)
	const { icon, extension, color } = getFileTypeInfo(document)

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
			)}
		</div>
	)
}
