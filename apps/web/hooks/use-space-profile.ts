import { useQuery } from "@tanstack/react-query"
import { $fetch } from "@lib/api"
import { useAuth } from "@lib/auth-context"

export type SpaceProfile = {
	static: string[]
	dynamic: string[]
}

export function useSpaceProfile(containerTag: string) {
	const { org } = useAuth()
	const orgId = org?.id ?? ""

	return useQuery({
		queryKey: ["space-profile", orgId, containerTag],
		queryFn: async (): Promise<SpaceProfile> => {
			const response = await $fetch(
				"@get/container-tags/:containerTag/profile",
				{
					params: { containerTag },
				},
			)
			if (response.error) {
				throw new Error(
					response.error.message || "Failed to load space profile",
				)
			}
			const profile = response.data.profile
			return {
				static: profile.static ?? [],
				dynamic: profile.dynamic ?? [],
			}
		},
		enabled: !!orgId && !!containerTag,
		staleTime: 60 * 1000,
	})
}
