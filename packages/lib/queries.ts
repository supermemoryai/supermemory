import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { z } from "zod"
import type { DocumentsWithMemoriesResponseSchema } from "../validation/api"
import { $fetch } from "./api"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

export const PLAN_TIERS = ["api_pro", "api_scale", "api_enterprise"] as const
export type PlanTier = (typeof PLAN_TIERS)[number]

export type SubscriptionStatusMap = Record<
	string,
	{ allowed: boolean; status: string | null }
>

const DEFAULT_SUBSCRIPTION_STATUS: SubscriptionStatusMap = {
	api_pro: { allowed: false, status: null },
	api_scale: { allowed: false, status: null },
	api_enterprise: { allowed: false, status: null },
}

export function isAllowedFrom(
	status: SubscriptionStatusMap,
	minimumTier: PlanTier,
): boolean {
	const minIndex = PLAN_TIERS.indexOf(minimumTier)
	return PLAN_TIERS.slice(minIndex).some((tier) => {
		const s = status[tier]
		return s?.status === "active"
	})
}

export function getSubscriptionStatus(
	products: Array<{ id: string; status: string }> | undefined,
): SubscriptionStatusMap {
	const statusMap: SubscriptionStatusMap = { ...DEFAULT_SUBSCRIPTION_STATUS }
	if (!products) return statusMap

	const productMap = new Map(products.map((p) => [p.id, p]))

	for (const tier of PLAN_TIERS) {
		const product = productMap.get(tier)
		statusMap[tier] = {
			allowed: product?.status === "active",
			status: product?.status ?? null,
		}
	}
	return statusMap
}

export function hasActivePlan(
	products: Array<{ id: string; status: string }> | undefined,
	minimumTier: PlanTier,
): boolean {
	return isAllowedFrom(getSubscriptionStatus(products), minimumTier)
}

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

					// Handle Infinite Query structure (TanStack Query v5 uses 'pages')
					if (
						"pages" in old &&
						Array.isArray((old as Record<string, unknown>).pages)
					) {
						const typedOld = old as {
							pages: Array<{ documents?: DocumentWithMemories[] }>
						}
						return {
							...typedOld,
							pages: typedOld.pages.map((page) => ({
								...page,
								documents: page.documents?.filter(
									(doc: DocumentWithMemories) => doc.id !== documentId,
								),
							})),
						}
					}

					// Handle Standard Query structure
					if (
						"documents" in old &&
						Array.isArray((old as Record<string, unknown>).documents)
					) {
						const typedOld = old as { documents: DocumentWithMemories[] }
						return {
							...typedOld,
							documents: typedOld.documents.filter(
								(doc: DocumentWithMemories) => doc.id !== documentId,
							),
						}
					}

					return old
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
