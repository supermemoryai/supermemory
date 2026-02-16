"use client"

import { useState } from "react"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

type OgData = {
	title?: string
	image?: string
}

export function WebsitePreview({
	document,
	ogData,
}: {
	document: DocumentWithMemories
	ogData?: OgData | null
}) {
	const [imageError, setImageError] = useState(false)

	const ogImage = (document as DocumentWithMemories & { ogImage?: string })
		.ogImage
	const displayOgImage = ogImage || ogData?.image

	return (
		<div className="bg-[#0B1017] rounded-[18px] overflow-hidden">
			{displayOgImage && !imageError ? (
				<div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
					<img
						src={displayOgImage}
						alt={document.title || "Website preview"}
						className="w-full h-full object-cover"
						onError={() => setImageError(true)}
						loading="lazy"
					/>
				</div>
			) : null}
		</div>
	)
}
