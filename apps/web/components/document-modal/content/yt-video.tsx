"use client"

import { extractYouTubeVideoId } from "@/lib/url-helpers"

interface YoutubeVideoProps {
	url: string | null | undefined
}

export function YoutubeVideo({ url }: YoutubeVideoProps) {
	if (!url) {
		return (
			<div className="flex items-center justify-center h-full text-gray-400">
				No YouTube URL provided
			</div>
		)
	}

	const videoId = extractYouTubeVideoId(url)
	if (!videoId) {
		return (
			<div className="flex items-center justify-center h-full text-red-400">
				Error: Invalid YouTube URL format
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
