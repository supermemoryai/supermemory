import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@lib/auth-context"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
const BASE = `${BACKEND}/brain/models`

export type BrainModelRole = "main" | "triage" | "research"
export type BrainReasoningEffort = "low" | "medium" | "high" | "xhigh"
export type BrainReasoningKey = "mainEffort" | "triageEffort" | "researchEffort"

export type BrainModelConfig = Record<BrainModelRole, string> &
	Partial<Record<BrainReasoningKey, BrainReasoningEffort>>

export type BrainModelsResponse = {
	resolved: BrainModelConfig
	defaults: BrainModelConfig
	choices: Record<BrainModelRole, string[]> &
		Partial<Record<BrainReasoningKey, BrainReasoningEffort[]>>
}

export function useBrainModels(enabled: boolean) {
	const { org } = useAuth()
	return useQuery({
		queryKey: ["brain", "models", org?.id],
		queryFn: async (): Promise<BrainModelsResponse> => {
			const res = await fetch(`${BASE}/`, { credentials: "include" })
			if (!res.ok) throw new Error("Failed to load models")
			return res.json()
		},
		enabled,
		staleTime: 60_000,
	})
}

export function useUpdateBrainModels() {
	const { org } = useAuth()
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (patch: Partial<BrainModelConfig>) => {
			const res = await fetch(`${BASE}/`, {
				method: "PATCH",
				credentials: "include",
				headers: { "Content-Type": "application/json", "X-App-Source": "nova" },
				body: JSON.stringify(patch),
			})
			if (res.status === 403)
				throw new Error("Only admins can change brain models.")
			if (!res.ok) {
				const b = (await res.json().catch(() => ({}))) as {
					message?: string
					error?: string
				}
				throw new Error(b.message ?? b.error ?? "Failed to save models")
			}
			return res.json()
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["brain", "models", org?.id],
			})
			toast.success("Brain models saved")
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to save models"),
	})
}
