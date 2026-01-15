"use client"

import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { extractYouTubeVideoId } from "../utils"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export function YoutubePreview({
	document,
}: {
	document: DocumentWithMemories
}) {
	const videoId = extractYouTubeVideoId(document.url)

	if (!videoId) {
		return (
			<div className="bg-[#0B1017] p-3 rounded-[18px] space-y-2">
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
		)
	}

	const embedUrl = `https://www.youtube.com/embed/${videoId}`

	return (
		<div className="bg-[#0B1017] rounded-[18px] overflow-hidden">
			<div className="relative w-full aspect-video bg-black">
				<iframe
					src={embedUrl}
					title={document.title || "YouTube video"}
					className="w-full h-full"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowFullScreen
					loading="lazy"
				/>
			</div>
		</div>
	)
}
