"use client"

import { useMemo } from "react"
import { useQueries } from "@tanstack/react-query"
import { $fetch } from "@lib/api"
import { useAuth } from "@lib/auth-context"

export type PluginSpaceMeta = {
	projectName?: string
	source?: string
	lastUpdatedAt?: string
}

type RawDoc = {
	metadata?: Record<string, unknown> | null
	updatedAt?: string | null
	createdAt?: string | null
}

function extractMeta(doc: RawDoc): PluginSpaceMeta {
	const md = doc?.metadata ?? {}
	const project =
		typeof md.project === "string" && md.project.trim()
			? md.project.trim()
			: undefined
	const source =
		typeof md.sm_source === "string" && md.sm_source.trim()
			? md.sm_source.trim()
			: undefined
	return {
		projectName: project,
		source,
		lastUpdatedAt: doc?.updatedAt ?? doc?.createdAt ?? undefined,
	}
}

/**
 * Fetches one recent doc per containerTag and pulls plugin metadata
 * (`metadata.project`, `metadata.sm_source`) so plugin-provisioned spaces
 * can show the real project name instead of the hash.
 */
export function usePluginSpaceMeta(
	containerTags: string[],
): Map<string, PluginSpaceMeta> {
	const { user } = useAuth()

	const uniqueTags = useMemo(
		() => Array.from(new Set(containerTags.filter(Boolean))).sort(),
		[containerTags],
	)

	const results = useQueries({
		queries: uniqueTags.map((tag) => ({
			queryKey: ["plugin-space-meta", tag],
			queryFn: async (): Promise<PluginSpaceMeta | null> => {
				const response = await $fetch("@post/documents/documents", {
					body: {
						page: 1,
						limit: 1,
						sort: "createdAt",
						order: "desc",
						containerTags: [tag],
					},
					disableValidation: true,
				})
				if (response.error) return null
				const data = response.data as unknown as
					| { documents?: RawDoc[] }
					| undefined
				const doc = data?.documents?.[0]
				if (!doc) return null
				return extractMeta(doc)
			},
			enabled: !!user && !!tag,
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
			retry: 1,
		})),
	})

	return useMemo(() => {
		const map = new Map<string, PluginSpaceMeta>()
		uniqueTags.forEach((tag, idx) => {
			const meta = results[idx]?.data
			if (meta) map.set(tag, meta)
		})
		return map
	}, [uniqueTags, results])
}
