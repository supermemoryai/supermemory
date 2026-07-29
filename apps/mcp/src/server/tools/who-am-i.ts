import { z } from "zod"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"whoAmI",
		{
			description: "Get current user info, role, and workspace context",
			inputSchema: z.object({}),
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (_args, context) => {
			try {
				const [session, activeTag] = await Promise.all([
					deps.getSession(),
					deps.getActiveContainerTag(),
				])
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								userId: session.user.id,
								email: session.user.email,
								name: session.user.name,
								role: session.role ?? "unknown",
								accessType: session.accessType ?? "full",
								activeWorkspace: activeTag ?? null,
								assignedTags:
									session.accessType === "restricted"
										? session.containerTags
										: null,
								scope: session.scope,
								client: deps.getClientInfo(context),
								sessionId: context.sessionId ?? null,
							}),
						},
					],
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
