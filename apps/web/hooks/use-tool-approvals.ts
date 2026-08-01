import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@lib/auth-context"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

export type ToolApprovalDecision = "allow" | "ask" | "deny"
export type ToolApprovalDefault = "ask" | "allow"
export type ToolClass = "read" | "write" | "dangerous" | "disallowed"

export type ToolApprovalEntry = {
	name: string
	description: string
	toolClass: ToolClass
	decision: ToolApprovalDecision
}

export type ToolApprovalSettings = {
	// "warming" means the tool list is still being fetched from the server.
	status: "ready" | "warming" | "not_connected"
	serverSlug: string
	accessScope: "personal" | "organization" | null
	defaultWriteApproval: ToolApprovalDefault
	tools: ToolApprovalEntry[]
}

// null clears a rule, falling that tool back to the connection default.
export type ToolApprovalPatch = {
	defaultWriteApproval?: ToolApprovalDefault
	rules?: Record<string, ToolApprovalDecision | null>
}

function url(serverSlug: string) {
	return `${BACKEND}/brain/mcp-connections/${serverSlug}/tool-approvals`
}

export function useToolApprovals(serverSlug: string, enabled: boolean) {
	const { org } = useAuth()
	return useQuery({
		queryKey: ["brain", "tool-approvals", serverSlug, org?.id],
		queryFn: async (): Promise<ToolApprovalSettings> => {
			const res = await fetch(url(serverSlug), { credentials: "include" })
			if (!res.ok) throw new Error("Failed to load tools")
			return res.json()
		},
		enabled: enabled && Boolean(serverSlug),
		staleTime: 60_000,
		// A cold tool list is fetched in the background, so poll until it lands.
		refetchInterval: (query) =>
			query.state.data?.status === "warming" ? 2_000 : false,
	})
}

export function useUpdateToolApprovals(serverSlug: string) {
	const { org } = useAuth()
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (patch: ToolApprovalPatch) => {
			const res = await fetch(url(serverSlug), {
				method: "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json", "X-App-Source": "nova" },
				body: JSON.stringify(patch),
			})
			if (res.status === 403)
				throw new Error("Only admins can change workspace connections.")
			if (!res.ok) {
				const b = (await res.json().catch(() => ({}))) as {
					message?: string
					error?: string
				}
				throw new Error(b.message ?? b.error ?? "Failed to save")
			}
			return res.json() as Promise<ToolApprovalSettings>
		},
		onSuccess: (data) => {
			queryClient.setQueryData(
				["brain", "tool-approvals", serverSlug, org?.id],
				data,
			)
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to save"),
	})
}
