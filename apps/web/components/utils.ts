"use client"

import { useQuery } from "@tanstack/react-query"
import { extractYouTubeVideoId, isYouTubeUrl } from "@/lib/url-helpers"

export { extractYouTubeVideoId, isYouTubeUrl }

export function useYouTubeChannelName(url: string | undefined | null) {
	const videoId = extractYouTubeVideoId(url)
	const videoUrl = videoId
		? `https://www.youtube.com/watch?v=${videoId}`
		: url || ""

	return useQuery({
		queryKey: ["youtube-channel", videoUrl],
		queryFn: async () => {
			if (!videoUrl) return null

			try {
				const response = await fetch(
					`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`,
				)
				if (!response.ok) return null
				const data = (await response.json()) as { author_name?: string }
				return data.author_name || null
			} catch {
				return null
			}
		},
		enabled: !!videoUrl && isYouTubeUrl(url),
		staleTime: 1000 * 60 * 60 * 24,
		retry: 1,
	})
}

export function getAbsoluteUrl(url: string): string {
	try {
		const urlObj = new URL(url)
		return urlObj.host.replace(/^www\./, "")
	} catch {
		const match = url.match(/^https?:\/\/([^/]+)/)
		const host = match?.[1] ?? url.replace(/^https?:\/\//, "")
		return host.replace(/^www\./, "")
	}
}
