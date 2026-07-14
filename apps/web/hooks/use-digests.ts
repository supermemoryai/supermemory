"use client"

import { $fetch } from "@lib/api"
import { useQuery } from "@tanstack/react-query"

export type DigestSummary = {
	id: string
	isoWeek: string
	emailSubject: string | null
	title: string | null
	status: "pending" | "processing" | "completed" | "failed"
	sentAt: string | null
	generatedAt: string
	highlightCount: number
	memoryCount: number
}

export type DigestDetail = {
	id: string
	isoWeek: string
	emailSubject: string | null
	status: "pending" | "processing" | "completed" | "failed"
	sentAt: string | null
	generatedAt: string
	digestData: {
		title: string
		intro: string
		highlights: Array<{
			id: string
			title: string
			content: string
			format: "paragraph" | "bullets" | "quote" | "one_liner"
			query: string
			sourceDocumentIds: string[]
		}>
		featureRecommendations: Array<{
			feature: string
			headline: string
			body: string
			ctaLabel: string
			ctaUrl: string
		}>
		memoryCount: number
		spaceCount: number
	}
}

export function useDigests(page = 1, limit = 20) {
	return useQuery<DigestSummary[]>({
		queryKey: ["digests", page, limit],
		queryFn: async () => {
			const res = await $fetch("@get/digests", { query: { page, limit } })
			if (res.error) throw new Error("Failed to fetch digests")
			return res.data?.digests ?? []
		},
		staleTime: 5 * 60 * 1000,
	})
}

export function useDigest(id: string | null) {
	return useQuery<DigestDetail | null>({
		queryKey: ["digest", id],
		queryFn: async () => {
			if (!id) return null
			const res = await $fetch("@get/digests/:id", { params: { id } })
			if (res.error) throw new Error("Failed to fetch digest")
			return (res.data as DigestDetail) ?? null
		},
		enabled: !!id,
		staleTime: 10 * 60 * 1000,
	})
}
