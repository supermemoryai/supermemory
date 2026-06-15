"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { authClient } from "@lib/auth"

export function useDeleteOrganization() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (organizationId: string) => {
			const res = await authClient.organization.delete({ organizationId })
			if (res?.error) {
				throw new Error(res.error.message || "Failed to delete organization")
			}
			return res?.data
		},
		onSuccess: () => {
			queryClient.invalidateQueries()
			toast.success("Organization deleted.")
		},
		onError: (error: Error) => {
			toast.error(error.message || "Failed to delete organization.")
		},
	})
}
