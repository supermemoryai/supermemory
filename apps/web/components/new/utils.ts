"use client"

import { useQuery } from "@tanstack/react-query"

export function isYouTubeUrl(url: string | undefined | null): boolean {
	if (!url) return false
	return (
		url.includes("youtube.com") ||
		url.includes("youtu.be") ||
		url.includes("m.youtube.com")
	)
}

export function extractYouTubeVideoId(
	url: string | undefined | null,
): string | null {
	if (!url) return null

	// Handle youtu.be format
	const youtuBeMatch = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/)
	if (youtuBeMatch?.[1]) return youtuBeMatch[1]

	// Handle youtube.com/watch?v= format
	const watchMatch = url.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/)
	if (watchMatch?.[1]) return watchMatch[1]

	// Handle youtube.com/embed/ format
	const embedMatch = url.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
	if (embedMatch?.[1]) return embedMatch[1]

	// Handle m.youtube.com format
	const mobileMatch = url.match(
		/(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
	)
	if (mobileMatch?.[1]) return mobileMatch[1]

	return null
}

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
		const match = url.match(/^https?:\/\/([^\/]+)/)
		const host = match?.[1] ?? url.replace(/^https?:\/\//, "")
		return host.replace(/^www\./, "")
	}
}
