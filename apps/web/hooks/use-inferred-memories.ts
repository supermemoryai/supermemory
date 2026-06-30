"use client"

import { $fetch } from "@lib/api"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { toast } from "sonner"

export type InferredMemory = {
	id: string
	memory: string
	parentCount: number
	createdAt: string
	updatedAt: string
	metadata: Record<string, unknown> | null
}

export type ReviewAction = "approve" | "decline" | "undo"

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
		// Undo restores the memory server-side, so refetch to bring it back.
		onSuccess: (_data, { memoryId, action }) => {
			if (action === "undo") {
				queryClient.invalidateQueries({
					queryKey: inferredKey(containerTag),
				})
				return
			}
			queryClient.setQueryData<InferredMemory[]>(
				inferredKey(containerTag),
				(prev) => prev?.filter((m) => m.id !== memoryId),
			)
		},
		// The card already flew off the stack, so a silent failure would read as
		// "saved". Surface it; the entry stays cached (onSuccess never ran) so it
		// resurfaces for review later.
		onError: (_err, { action }) => {
			toast.error(
				action === "undo"
					? "Couldn't undo that review. Try again."
					: "Couldn't save your review. It'll resurface for review later.",
			)
		},
	})
}

// Session-local queue edits for decisions that don't hit the server (skip),
// so the trigger's live count reflects them and the prompt can be dismissed.
export function useInferredMemoryCache(containerTag: string | undefined) {
	const queryClient = useQueryClient()
	const drop = useCallback(
		(memoryId: string) =>
			queryClient.setQueryData<InferredMemory[]>(
				inferredKey(containerTag),
				(prev) => prev?.filter((m) => m.id !== memoryId),
			),
		[queryClient, containerTag],
	)
	const restore = useCallback(
		(memory: InferredMemory) =>
			queryClient.setQueryData<InferredMemory[]>(
				inferredKey(containerTag),
				(prev) =>
					prev?.some((m) => m.id === memory.id)
						? prev
						: [...(prev ?? []), memory],
			),
		[queryClient, containerTag],
	)
	return { drop, restore }
}
