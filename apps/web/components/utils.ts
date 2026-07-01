"use client"

import { useQuery } from "@tanstack/react-query"

const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/

function parseHttpUrl(url: string | undefined | null): URL | null {
	const trimmed = url?.trim()
	if (!trimmed) return null

	try {
		const parsed = new URL(trimmed)
		return parsed.protocol === "http:" || parsed.protocol === "https:"
			? parsed
			: null
	} catch {
		try {
			return new URL(`https://${trimmed}`)
		} catch {
			return null
		}
	}
}

function hostnameMatches(hostname: string, domain: string): boolean {
	const normalizedHostname = hostname.toLowerCase()
	return (
		normalizedHostname === domain || normalizedHostname.endsWith(`.${domain}`)
	)
}

function validYouTubeVideoId(value: string | null | undefined): string | null {
	if (!value || !YOUTUBE_VIDEO_ID_REGEX.test(value)) return null
	return value
}

export function isYouTubeUrl(url: string | undefined | null): boolean {
	const parsed = parseHttpUrl(url)
	if (!parsed) return false

	return (
		hostnameMatches(parsed.hostname, "youtube.com") ||
		hostnameMatches(parsed.hostname, "youtu.be")
	)
}

export function extractYouTubeVideoId(
	url: string | undefined | null,
): string | null {
	const parsed = parseHttpUrl(url)
	if (!parsed) return null

	const pathSegments = parsed.pathname.split("/").filter(Boolean)

	if (hostnameMatches(parsed.hostname, "youtu.be")) {
		return validYouTubeVideoId(pathSegments[0])
	}

	if (!hostnameMatches(parsed.hostname, "youtube.com")) return null

	const route = pathSegments[0]?.toLowerCase()
	if (route === "watch") {
		return validYouTubeVideoId(parsed.searchParams.get("v"))
	}

	if (route === "embed" || route === "shorts" || route === "live") {
		return validYouTubeVideoId(pathSegments[1])
	}

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
		const match = url.match(/^https?:\/\/([^/]+)/)
		const host = match?.[1] ?? url.replace(/^https?:\/\//, "")
		return host.replace(/^www\./, "")
	}
}
