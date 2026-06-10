"use client"

import { memo, useCallback, useState } from "react"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { DocumentIcon } from "@/components/document-icon"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

function getFileTypeInfo(document: DocumentWithMemories): {
	fileName?: string
	extension: string
	color?: string
} {
	const type = document.type?.toLowerCase()
	const mimeType = (document.metadata?.mimeType ??
		document.metadata?.sm_internal_fileType) as string | undefined
	const fileName = (document.metadata?.sm_internal_fileName ??
		document.metadata?.fileName) as string | undefined
	const nameExt = fileName?.includes(".")
		? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
		: undefined

	if (nameExt === ".pdf" || mimeType === "application/pdf" || type === "pdf") {
		return { fileName, extension: ".pdf", color: "#FF7673" }
	}
	if (mimeType?.startsWith("image/") || type === "image") {
		const ext = nameExt || `.${mimeType?.split("/")[1] || "jpg"}`
		return { fileName, extension: ext }
	}
	if (mimeType?.startsWith("video/") || type === "video") {
		const ext = nameExt || `.${mimeType?.split("/")[1] || "mp4"}`
		return { fileName, extension: ext }
	}
	if (nameExt === ".html" || nameExt === ".htm" || mimeType === "text/html") {
		return { fileName, extension: nameExt || ".html", color: "#FF8A4C" }
	}
	if (nameExt) {
		return { fileName, extension: nameExt }
	}
	return { fileName, extension: ".file" }
}

export const FilePreview = memo(function FilePreview({
	document,
}: {
	document: DocumentWithMemories
}) {
	const [imageError, setImageError] = useState(false)
	const [retryKey, setRetryKey] = useState(0)
	const { fileName, extension, color } = getFileTypeInfo(document)

	const type = document.type?.toLowerCase()
	const mimeType = (document.metadata?.mimeType ??
		document.metadata?.sm_internal_fileType) as string | undefined
	const isImage =
		(mimeType?.startsWith("image/") || type === "image") &&
		document.url &&
		!imageError

	// On first failure, wait briefly then force a re-render with a new key to
	// retry the fetch (covers transient R2 timing issues).
	// On second failure, give up and show the fallback file icon view.
	const handleImageError = useCallback(() => {
		if (retryKey === 0) {
			setTimeout(() => setRetryKey(1), 500)
			return
		}
		setImageError(true)
	}, [retryKey])

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
						key={retryKey}
						src={document.url}
						alt={document.title || "Image preview"}
						className="relative max-w-full max-h-full size-auto object-contain z-10"
						onError={handleImageError}
						loading="lazy"
					/>
				</div>
			) : (
				<div className="p-3">
					<div className="flex items-center gap-1 mb-2 min-w-0">
						<DocumentIcon
							type={document.type}
							url={document.url}
							fileName={fileName}
							mimeType={mimeType}
							className="size-4 shrink-0"
						/>
						<p
							className={cn(
								dmSansClassName(),
								"text-[11px] font-semibold truncate",
							)}
							style={{ color: color }}
							title={fileName}
						>
							{fileName || extension}
						</p>
					</div>
					{document.content && (
						<p className="text-[11px] text-[#737373] line-clamp-4">
							{document.content}
						</p>
					)}
				</div>
			)}
		</div>
	)
})
