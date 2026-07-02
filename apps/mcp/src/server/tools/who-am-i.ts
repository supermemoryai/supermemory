import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"whoAmI",
		{
			description: "Get current user info, role, and workspace context",
			inputSchema: {},
		},
		async () => {
			const activeTag = await deps.storage.get<string>("activeContainerTag")
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({
							userId: deps.props?.userId,
							email: deps.props?.email,
							name: deps.props?.name,
							role: deps.props?.role ?? "unknown",
							accessType: deps.props?.accessType ?? "full",
							activeWorkspace: activeTag ?? null,
							assignedTags: deps.rbac.isRestricted
								? deps.rbac.assignedTags
								: null,
							client: deps.getClientInfo(),
							sessionId: deps.getMcpSessionId(),
						}),
					},
				],
			}
		},
	)
}
