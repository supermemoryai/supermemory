"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { extractGoogleDocId, getGoogleEmbedUrl } from "@/lib/url-helpers"

interface GoogleDocViewerProps {
	url: string | null | undefined
	customId: string | null | undefined
	type: "google_doc" | "google_sheet" | "google_slide"
}

export function GoogleDocViewer({ url, customId, type }: GoogleDocViewerProps) {
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const docId = customId ?? (url ? extractGoogleDocId(url) : null)

	if (!docId) {
		return (
			<div className="flex items-center justify-center h-full text-gray-400">
				Unable to load document - no document ID found
			</div>
		)
	}

	const embedUrl = getGoogleEmbedUrl(docId, type)

	const typeLabels = {
		google_doc: "Google Doc",
		google_sheet: "Google Sheet",
		google_slide: "Google Slides",
	}

	return (
		<div className="flex flex-col h-full w-full overflow-hidden">
			{loading && (
				<div className="absolute inset-0 flex items-center justify-center bg-[#14161A] z-10">
					<div className="flex items-center gap-2 text-gray-400">
						<Loader2 className="w-5 h-5 animate-spin" />
						<span>Loading {typeLabels[type]}...</span>
					</div>
				</div>
			)}
			{error && (
				<div className="flex items-center justify-center h-full text-red-400">
					{error}
				</div>
			)}
			<iframe
				src={embedUrl}
				className="flex-1 w-full h-full border-0 rounded-[14px]"
				onLoad={() => setLoading(false)}
				onError={() => {
					setLoading(false)
					setError("Failed to load document")
				}}
				allow="autoplay"
				title={typeLabels[type]}
			/>
		</div>
	)
}
