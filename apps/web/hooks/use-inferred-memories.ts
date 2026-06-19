"use client"

import { $fetch } from "@lib/api"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type InferredMemory = {
	id: string
	memory: string
	parentCount: number
	createdAt: string
	updatedAt: string
	metadata: Record<string, unknown> | null
}

export type ReviewAction = "approve" | "decline"

const inferredKey = (containerTag: string | undefined) =>
	["inferred-memories", containerTag] as const

// Inferred memories the engine wasn't fully confident about, awaiting review.
export function useInferredMemories(containerTag: string | undefined) {
	return useQuery({
		queryKey: inferredKey(containerTag),
		queryFn: async (): Promise<InferredMemory[]> => {
			if (!containerTag) return []
			const res = await $fetch("@get/container-tags/:containerTag/inferred", {
				params: { containerTag },
			})
			if (res.error) throw new Error(res.error?.message ?? "Failed to load")
			return res.data?.memories ?? []
		},
		enabled: !!containerTag,
		staleTime: 60 * 1000,
	})
}

export function useReviewInferredMemory(containerTag: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({
			memoryId,
			action,
		}: {
			memoryId: string
			action: ReviewAction
		}) => {
			if (!containerTag) throw new Error("Missing container tag")
			const res = await $fetch(
				"@post/container-tags/:containerTag/inferred/:memoryId/review",
				{ params: { containerTag, memoryId }, body: { action } },
			)
			if (res.error) throw new Error(res.error?.message ?? "Review failed")
			return res.data
		},
		// The modal pops cards off its local stack as you swipe, so we just drop
		// the reviewed entry from the cached queue once the request settles.
		onSuccess: (_data, { memoryId }) => {
			queryClient.setQueryData<InferredMemory[]>(
				inferredKey(containerTag),
				(prev) => prev?.filter((m) => m.id !== memoryId),
			)
		},
	})
}
