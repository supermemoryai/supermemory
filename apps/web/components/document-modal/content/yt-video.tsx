"use client"

import { useState, useEffect } from "react"
import { extractYouTubeVideoId } from "@/components/utils"

interface YoutubeVideoProps {
	url: string | null | undefined
}

export function YoutubeVideo({ url }: YoutubeVideoProps) {
	const [videoId, setVideoId] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!url) {
			setError("No YouTube URL provided")
			setLoading(false)
			return
		}

		const id = extractYouTubeVideoId(url)
		if (!id) {
			setError("Invalid YouTube URL format")
			setLoading(false)
			return
		}

		setVideoId(id)
		setLoading(false)
		setError(null)
	}, [url])

	if (!url) {
		return (
			<div className="flex items-center justify-center h-full text-gray-400">
				No YouTube URL provided
			</div>
		)
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full text-gray-400">
				Loading video…
			</div>
		)
	}

	if (error || !videoId) {
		return (
			<div className="flex items-center justify-center h-full text-red-400">
				Error: {error || "Failed to extract video ID"}
			</div>
		)
	}

	return (
		<div className="flex-1 flex items-center justify-center w-full p-4">
			<div className="w-full max-w-4xl aspect-video">
				<iframe
					src={`https://www.youtube.com/embed/${videoId}`}
					title="YouTube video player"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowFullScreen
					className="size-full rounded-lg shadow-lg"
				/>
			</div>
		</div>
	)
}
