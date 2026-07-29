import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@lib/auth-context"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
const BASE = `${BACKEND}/brain/settings`

export type BrainProactivityDefault = "all_channels" | "own_channel_only"
export type BrainChannelProactivity = "proactive" | "quiet"

export type BrainSettingsResponse = {
	proactivity: {
		default: BrainProactivityDefault
		channels: Record<string, BrainChannelProactivity>
	}
	choices: {
		proactivityDefault: BrainProactivityDefault[]
		channelProactivity: BrainChannelProactivity[]
	}
}

// null clears: default -> reset, channels[id] -> remove that override.
export type BrainSettingsPatch = {
	proactivity?: {
		default?: BrainProactivityDefault | null
		channels?: Record<string, BrainChannelProactivity | null> | null
	} | null
}

export function useBrainSettings(enabled: boolean) {
	const { org } = useAuth()
	return useQuery({
		queryKey: ["brain", "settings", org?.id],
		queryFn: async (): Promise<BrainSettingsResponse> => {
			const res = await fetch(`${BASE}/`, { credentials: "include" })
			if (!res.ok) throw new Error("Failed to load settings")
			return res.json()
		},
		enabled,
		staleTime: 60_000,
	})
}

export function useUpdateBrainSettings() {
	const { org } = useAuth()
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (patch: BrainSettingsPatch) => {
			const res = await fetch(`${BASE}/`, {
				method: "PATCH",
				credentials: "include",
				headers: { "Content-Type": "application/json", "X-App-Source": "nova" },
				body: JSON.stringify(patch),
			})
			if (res.status === 403)
				throw new Error("Only admins can change these settings.")
			if (!res.ok) {
				const b = (await res.json().catch(() => ({}))) as {
					message?: string
					error?: string
				}
				throw new Error(b.message ?? b.error ?? "Failed to save settings")
			}
			return res.json() as Promise<BrainSettingsResponse>
		},
		onSuccess: (data) => {
			queryClient.setQueryData(["brain", "settings", org?.id], data)
			toast.success("Proactivity saved")
		},
		onError: (err) =>
			toast.error(
				err instanceof Error ? err.message : "Failed to save settings",
			),
	})
}
