import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { $fetch } from "@lib/api"
import { useAuth } from "@lib/auth-context"

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
			const response = await $fetch("@patch/settings", {
				body: settings,
			})
			if (response.error) {
				throw new Error(response.error.message || "Failed to save settings", {
					cause: response.error,
				})
			}
			return response.data
		},
		onMutate: () => ({ orgId }),
		onSuccess: async (data, _settings, mutationContext) => {
			const queryKey = ["settings", "org", mutationContext.orgId] as const
			const canonicalSettings = data?.settings
			if (canonicalSettings) {
				queryClient.setQueryData<OrgSettings>(queryKey, (current) =>
					current ? { ...current, ...canonicalSettings } : current,
				)
			}
			await queryClient.invalidateQueries({ queryKey, exact: true })
			toast.success("Settings saved")
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to save settings",
			)
		},
	})
}
