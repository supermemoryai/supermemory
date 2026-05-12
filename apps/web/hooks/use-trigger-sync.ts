"use client"

import { $fetch } from "@lib/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ConnectionResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import type { ImportProvider } from "@/components/settings/sync-utils"
import type { SyncRun } from "@/hooks/use-sync-runs"

type Connection = z.infer<typeof ConnectionResponseSchema>

export function useTriggerSync() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			provider,
			containerTags,
		}: {
			// connectionId isn't sent to the backend (import is keyed by provider) — kept for cache updates
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
		// Optimistically flip to "syncing" so the badge/button update instantly; the 5s poll then converges on real state
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey: ["connections"] })
			const previousConnections = queryClient.getQueryData<Connection[]>([
				"connections",
			])
			queryClient.setQueryData<Connection[]>(["connections"], (old) =>
				old?.map((c) =>
					c.provider === variables.provider
						? {
								...c,
								metadata: {
									...((c.metadata as Record<string, unknown> | null) ?? {}),
									syncInProgress: true,
								},
							}
						: c,
				),
			)

			const syncRunsKey = ["sync-runs", variables.connectionId]
			const previousSyncRuns = queryClient.getQueryData<SyncRun[]>(syncRunsKey)
			if (previousSyncRuns) {
				const optimisticRun: SyncRun = {
					id: `optimistic-${Date.now()}`,
					connectionId: variables.connectionId,
					status: "running",
					triggerType: "manual",
					startedAt: new Date().toISOString(),
					completedAt: null,
					itemsProcessed: 0,
					itemsFailed: 0,
					error: null,
				}
				queryClient.setQueryData<SyncRun[]>(syncRunsKey, [
					optimisticRun,
					...previousSyncRuns,
				])
			}

			return { previousConnections, previousSyncRuns, syncRunsKey }
		},
		// Don't invalidate connections/sync-runs here — an immediate refetch races the backend and clobbers the optimistic state; the 5s polls handle it
		onSuccess: () => {
			toast.success("Sync started")
			queryClient.invalidateQueries({ queryKey: ["processing-documents"] })
		},
		onError: (error, _variables, context) => {
			if (context?.previousConnections !== undefined) {
				queryClient.setQueryData(["connections"], context.previousConnections)
			}
			if (context?.previousSyncRuns !== undefined) {
				queryClient.setQueryData(context.syncRunsKey, context.previousSyncRuns)
			}
			toast.error("Failed to start sync", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})
}
