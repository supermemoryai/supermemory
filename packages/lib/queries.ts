import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { useCustomer } from "autumn-js/react"
import { toast } from "sonner"
import type { z } from "zod"
import type { DocumentsWithMemoriesResponseSchema } from "../validation/api"
import { $fetch, type ProfileResponse } from "./api"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export const fetchSubscriptionStatus = (
	autumn: ReturnType<typeof useCustomer>,
	isEnabled: boolean,
) =>
	useQuery({
		queryFn: async () => {
			const allPlans = [
				"consumer_pro",
			]
			const statusMap: Record<string, boolean | null> = {}

			await Promise.all(
				allPlans.map(async (plan) => {
					try {
						const res = autumn.check({
							productId: plan,
						})
						statusMap[plan] = res.data?.allowed ?? false
					} catch (error) {
						console.error(`Error checking status for ${plan}:`, error)
						statusMap[plan] = false
					}
				}),
			)

			return statusMap
		},
		queryKey: ["subscription-status"],
		refetchInterval: 5000, // Refetch every 5 seconds
		staleTime: 4000, // Consider data stale after 4 seconds
		enabled: isEnabled,
	})

// Feature checks
export const fetchMemoriesFeature = (autumn: ReturnType<typeof useCustomer>, isEnabled: boolean) =>
	useQuery({
		queryFn: async () => {
			const res = autumn.check({ featureId: "memories" })
			return res.data
		},
		queryKey: ["autumn-feature", "memories"],
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
		enabled: isEnabled,
	})

export const fetchConnectionsFeature = (
	autumn: ReturnType<typeof useCustomer>,
	isEnabled: boolean,
) =>
	useQuery({
		queryFn: async () => {
			const res = autumn.check({ featureId: "connections" })
			return res.data
		},
		queryKey: ["autumn-feature", "connections"],
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
		enabled: isEnabled,
	})

// Product checks
export const fetchConsumerProProduct = (
	autumn: ReturnType<typeof useCustomer>,
) =>
	useQuery({
		queryFn: async () => {
			const res = autumn.check({ productId: "consumer_pro" })
			return res.data
		},
		queryKey: ["autumn-product", "consumer_pro"],
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
	})

export const fetchProProduct = (autumn: ReturnType<typeof useCustomer>) =>
	useQuery({
		queryFn: async () => {
			const res = autumn.check({ productId: "pro" })
			return res.data
		},
		queryKey: ["autumn-product", "pro"],
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
	})

export const useDeleteDocument = (selectedProject: string) => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (documentId: string) => {
			// context for LLM: delete/memories/:documentId is documents delete endpoint not memories delete endpoint
			const response = await $fetch(`@delete/documents/${documentId}`)
			if (response.error) {
				throw new Error(response.error?.message || "Failed to delete document")
			}
			return response.data
		},
		onMutate: async (documentId: string) => {
			await queryClient.cancelQueries({
				queryKey: ["documents-with-memories", selectedProject],
			})

			const previousData = queryClient.getQueryData([
				"documents-with-memories",
				selectedProject,
			])

			queryClient.setQueryData(
				["documents-with-memories", selectedProject],
				(old: unknown) => {
					if (!old || typeof old !== "object") return old
					const typedOld = old as {
						pages?: Array<{ documents?: DocumentWithMemories[] }>
					}
					return {
						...typedOld,
						pages: typedOld.pages?.map((page) => ({
							...page,
							documents: page.documents?.filter(
								(doc: DocumentWithMemories) => doc.id !== documentId,
							),
						})),
					}
				},
			)

			return { previousData }
		},
		onSuccess: () => {
			toast.success("Memory deleted successfully")
		},
		onError: (error, _documentId, context) => {
			if (context?.previousData) {
				queryClient.setQueryData(
					["documents-with-memories", selectedProject],
					context.previousData,
				)
			}
			toast.error("Failed to delete memory", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ["documents-with-memories", selectedProject],
			})
		},
	})
}

export const useUserProfile = (containerTag: string | null, enabled = true) => {
	return useQuery({
		queryKey: ["user-profile", containerTag],
		queryFn: async (): Promise<ProfileResponse> => {
			if (!containerTag) {
				throw new Error("No containerTag provided")
			}

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"}/v4/profile`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({ containerTag }),
				},
			)

			if (!response.ok) {
				throw new Error(`Profile fetch failed: ${response.status}`)
			}

			return response.json()
		},
		enabled: enabled && !!containerTag,
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	})
}
