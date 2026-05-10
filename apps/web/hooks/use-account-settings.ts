import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@lib/auth-context"

const API_BASE =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

export type AccountMembership = {
	orgId: string
	name: string
	slug: string
	role: string
	memberCount: number
}

export function useAccountMemberships() {
	const { user } = useAuth()

	return useQuery({
		queryKey: ["account", "memberships"],
		queryFn: async () => {
			const res = await fetch(`${API_BASE}/v3/auth/account/memberships`, {
				credentials: "include",
				headers: { "X-App-Source": "nova" },
			})
			if (!res.ok) {
				throw new Error("Failed to load organizations")
			}
			const data = (await res.json()) as {
				organizations: AccountMembership[]
			}
			return data.organizations
		},
		enabled: !!user?.id,
	})
}

export function useLeaveNonOwnerMemberships() {
	return useMutation({
		mutationFn: async () => {
			const res = await fetch(
				`${API_BASE}/v3/auth/account/leave-non-owner-memberships`,
				{
					method: "POST",
					credentials: "include",
					headers: { "X-App-Source": "nova" },
				},
			)
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as {
					message?: string
				}
				throw new Error(body.message ?? "Failed to leave organizations")
			}
			return (await res.json()) as {
				success: boolean
				removedOrgIds: string[]
			}
		},
	})
}

export type DeleteUserAccountInput = {
	confirmation: string
	notifyOnComplete?: boolean
}

export function useDeleteUserAccount() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			confirmation,
			notifyOnComplete,
		}: DeleteUserAccountInput) => {
			const res = await fetch(`${API_BASE}/v3/auth/account/delete`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json", "X-App-Source": "nova" },
				body: JSON.stringify({
					confirmation,
					...(notifyOnComplete === true ? { notifyOnComplete: true } : {}),
				}),
			})
			if (res.status === 202) {
				return (await res.json().catch(() => ({}))) as {
					status?: string
					alreadyPending?: boolean
				}
			}
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as {
					message?: string
					error?: string
				}
				throw new Error(
					body.message ?? body.error ?? "Failed to start account deletion",
				)
			}
			return {}
		},
		onSuccess: () => {
			queryClient.clear()
		},
	})
}
