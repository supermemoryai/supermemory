"use client"

import { $fetch } from "@lib/api"
import { useQuery } from "@tanstack/react-query"

/**
 * Mirrors the Zod schema at `apiSchema["@get/connections/:connectionId/sync-runs"].output`.
 * Keep in sync with `packages/lib/api.ts` if fields are added/removed.
 */
export type SyncRun = {
	id: string
	connectionId: string
	status: "running" | "completed" | "failed"
	triggerType: "event" | "cron" | "manual"
	startedAt: string
	completedAt: string | null
	itemsProcessed: number
	itemsFailed: number
	error: string | null
}

export function useSyncRuns(connectionId: string) {
	return useQuery<SyncRun[]>({
		queryKey: ["sync-runs", connectionId],
		queryFn: async () => {
			const response = await $fetch(
				"@get/connections/:connectionId/sync-runs",
				{ params: { connectionId } },
			)
			if (response.error) {
				throw new Error("Failed to fetch sync runs")
			}
			return response.data as SyncRun[]
		},
		enabled: !!connectionId,
		staleTime: 30 * 1000,
		refetchOnMount: "always",
		refetchInterval: (query) => {
			const runs = query.state.data as SyncRun[] | undefined
			if (runs?.some((r) => r.status === "running")) {
				return 5000
			}
			return false
		},
	})
}
