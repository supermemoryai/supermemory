"use client"

import { useState } from "react"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/utils/fonts"
import { cn } from "@lib/utils"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export function WebsitePreview({
	document,
}: {
	document: DocumentWithMemories
}) {
	const [imageError, setImageError] = useState(false)
	const ogImage = (document as DocumentWithMemories & { ogImage?: string })
		.ogImage

	return (
		<div className="bg-[#0B1017] rounded-[18px] overflow-hidden">
			{ogImage && !imageError ? (
				<div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
					<img
						src={ogImage}
						alt={document.title || "Website preview"}
						className="w-full h-full object-cover"
						onError={() => setImageError(true)}
						loading="lazy"
					/>
				</div>
			) : (
				<div className="p-3 gap-2">
					<p
						className={cn(
							dmSansClassName(),
							"text-[12px] font-semibold text-[#E5E5E5] line-clamp-2 mb-1",
						)}
					>
						{document.title || "Untitled Document"}
					</p>
					{document.content && (
						<p className="text-[10px] text-[#737373] line-clamp-3">
							{document.content}
						</p>
					)}
				</div>
			)}
		</div>
	)
}
