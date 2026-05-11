"use client"

import { $fetch } from "@lib/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ImportProvider } from "@/components/settings/sync-utils"

export function useTriggerSync() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			provider,
			containerTags,
		}: {
			// connectionId is not sent to the backend — the import endpoint is keyed
			// by provider, so it re-syncs all connections for that provider.
			// It's kept here so onSuccess can target cache invalidation.
			connectionId: string
			provider: ImportProvider
			containerTags?: string[]
		}) => {
			const response = await $fetch("@post/connections/:provider/import", {
				params: { provider },
				body: { containerTags },
			})
			if (response.error) {
				throw new Error(
					(response.error as { message?: string })?.message ||
						"Failed to trigger sync",
				)
			}
			return response.data
		},
		onSuccess: (_data, variables) => {
			toast.success("Sync started")
			queryClient.invalidateQueries({ queryKey: ["connections"] })
			queryClient.invalidateQueries({
				queryKey: ["sync-runs", variables.connectionId],
			})
			queryClient.invalidateQueries({ queryKey: ["processing-documents"] })
		},
		onError: (error) => {
			toast.error("Failed to start sync", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})
}
