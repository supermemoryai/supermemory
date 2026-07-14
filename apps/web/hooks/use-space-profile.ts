import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@lib/auth-context"

export type SpaceProfile = {
	static: string[]
	dynamic: string[]
}

const API_BASE =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

type SpaceProfileResponse = {
	profile?: {
		static?: string[] | null
		dynamic?: string[] | null
	} | null
}

export function useSpaceProfile(containerTag: string) {
	const { org } = useAuth()
	const orgId = org?.id ?? ""

	return useQuery({
		queryKey: ["space-profile", orgId, containerTag],
		queryFn: async (): Promise<SpaceProfile> => {
			const response = await fetch(`${API_BASE}/v4/profile`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					"X-App-Source": "nova",
				},
				body: JSON.stringify({ containerTag }),
			})

			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string
					message?: string
				}
				throw new Error(
					body.message ?? body.error ?? "Failed to load space profile",
				)
			}

			const data = (await response.json()) as SpaceProfileResponse
			const profile = data.profile

			return {
				static: profile?.static ?? [],
				dynamic: profile?.dynamic ?? [],
			}
		},
		enabled: !!orgId && !!containerTag,
		staleTime: 60 * 1000,
	})
}
