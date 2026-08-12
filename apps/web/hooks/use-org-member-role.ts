import { useQuery } from "@tanstack/react-query"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"

// Shared active-member role for the current org. Single queryKey so the
// company-brain settings sections dedupe the getActiveMember call.
export function useOrgMemberRole(enabled = true) {
	const { org } = useAuth()
	const query = useQuery({
		queryKey: ["org", "member-role", org?.id],
		queryFn: async () =>
			(await authClient.organization.getActiveMember()).data?.role ?? null,
		staleTime: 60_000,
		enabled: enabled && !!org?.id,
	})
	const role = (query.data ?? "").toLowerCase()
	const isAdmin = role === "owner" || role === "admin"
	return { role, isAdmin, query }
}
