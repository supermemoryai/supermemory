import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { $fetch } from "@lib/api"
import { useAuth } from "@lib/auth-context"

const API_BASE = `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"}/v3`

export type OrgSettings = {
	shouldLLMFilter: boolean
	filterPrompt: string | null
	workspacePersona: string | null
	includeItems?: string[] | null
	excludeItems?: string[] | null
}

type OrgSettingsResponse = {
	settings?: Partial<OrgSettings>
} & Partial<OrgSettings>

export function useOrgSettings() {
	const { org } = useAuth()
	const orgId = org?.id ?? ""

	return useQuery({
		queryKey: ["settings", "org", orgId],
		queryFn: async (): Promise<OrgSettings> => {
			const response = await $fetch("@get/settings", {
				disableValidation: true,
			})
			if (response.error) {
				throw new Error(response.error.message || "Failed to load settings")
			}
			const data = response.data as OrgSettingsResponse | null
			const settings = data?.settings ?? data ?? {}
			return {
				shouldLLMFilter: settings.shouldLLMFilter ?? false,
				filterPrompt: settings.filterPrompt ?? null,
				workspacePersona: settings.workspacePersona ?? null,
				includeItems: settings.includeItems ?? null,
				excludeItems: settings.excludeItems ?? null,
			}
		},
		enabled: !!orgId,
		staleTime: 60 * 1000,
	})
}

export function useUpdateOrgSettings() {
	const { org } = useAuth()
	const queryClient = useQueryClient()
	const orgId = org?.id ?? ""

	return useMutation({
		mutationFn: async (settings: Partial<OrgSettings>) => {
			const res = await fetch(`${API_BASE}/settings`, {
				method: "PATCH",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					"X-App-Source": "nova",
				},
				body: JSON.stringify(settings),
			})
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as {
					message?: string
				}
				throw new Error(body?.message || "Failed to save settings")
			}
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings", "org", orgId] })
			toast.success("Settings saved")
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to save settings",
			)
		},
	})
}
