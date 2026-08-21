import { useQuery } from "@tanstack/react-query"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

export type TrialStatus = {
	active: boolean
	reason: string | null
}

/** Distinguishes a named Company Brain org from one whose trial is actually live. */
export function useTrialStatus() {
	const isCompanyBrain = useHasCompanyBrain()

	const query = useQuery({
		queryKey: ["brain", "trial-status"],
		queryFn: async (): Promise<TrialStatus> => {
			const res = await fetch(`${BACKEND}/brain/trial/status`, {
				credentials: "include",
			})
			if (!res.ok) throw new Error("Failed to load trial status")
			const data = (await res.json()) as { active?: boolean; reason?: string }
			return { active: Boolean(data.active), reason: data.reason ?? null }
		},
		enabled: isCompanyBrain,
		staleTime: 30 * 1000,
	})

	return {
		...query,
		needsSetup: isCompanyBrain && query.data ? !query.data.active : false,
	}
}
