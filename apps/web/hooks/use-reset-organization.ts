"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { $fetch } from "@lib/api"

export function useResetOrganization() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (body: { confirmation: string }) => {
			const res = await $fetch("@post/settings/reset", {
				body,
				retry: { attempts: 0 },
			})
			if (res.error) {
				const e = res.error as Record<string, unknown>
				const msg =
					typeof e.error === "string"
						? e.error
						: typeof e.message === "string"
							? e.message
							: "Reset failed"
				throw new Error(msg)
			}
			if (!res.data?.success) throw new Error("Reset failed")
			return res.data
		},
		onSuccess: async () => {
			queryClient.invalidateQueries()
			// Clear the daily brief Cache API entry so stale highlights don't survive the reset
			try {
				await caches.delete("space-highlights-v1")
			} catch {
				// Cache API not available in all environments
			}
			toast.success("Organization data has been reset.")
		},
		onError: (error: Error) => {
			toast.error(error.message || "Failed to reset organization.")
		},
	})
}
