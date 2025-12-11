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

function PDFIcon() {
	return (
		<svg
			width="8"
			height="10"
			viewBox="0 0 8 10"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>PDF Icon</title>
			<g filter="url(#filter0_i_719_6586)">
				<path
					d="M1 10C0.725 10 0.489583 9.90208 0.29375 9.70625C0.0979167 9.51042 0 9.275 0 9V1C0 0.725 0.0979167 0.489583 0.29375 0.29375C0.489583 0.0979167 0.725 0 1 0H5L8 3V9C8 9.275 7.90208 9.51042 7.70625 9.70625C7.51042 9.90208 7.275 10 7 10H1ZM4.5 3.5V1H1V9H7V3.5H4.5Z"
					fill="#FF7673"
				/>
			</g>
			<defs>
				<filter
					id="filter0_i_719_6586"
					x="0"
					y="0"
					width="8.25216"
					height="10.2522"
					filterUnits="userSpaceOnUse"
					color-interpolation-filters="sRGB"
				>
					<feFlood flood-opacity="0" result="BackgroundImageFix" />
					<feBlend
						mode="normal"
						in="SourceGraphic"
						in2="BackgroundImageFix"
						result="shape"
					/>
					<feColorMatrix
						in="SourceAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
						result="hardAlpha"
					/>
					<feOffset dx="0.252163" dy="0.252163" />
					<feGaussianBlur stdDeviation="0.504325" />
					<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
					<feColorMatrix
						type="matrix"
						values="0 0 0 0 0.0431373 0 0 0 0 0.0588235 0 0 0 0 0.0823529 0 0 0 0.4 0"
					/>
					<feBlend
						mode="normal"
						in2="shape"
						result="effect1_innerShadow_719_6586"
					/>
				</filter>
			</defs>
		</svg>
	)
}

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
				icon: <PDFIcon />,
				extension: ".pdf",
				color: "#FF7673",
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
