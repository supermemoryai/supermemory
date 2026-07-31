import { z } from "zod"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"whoAmI",
		{
			description:
				"Get the current Supermemory account context, including user identity, role, access type, permissions, scope, and active space. Use this when the user asks who they are, what access they have, or which space is currently active. Use listSpaces instead when the user asks which spaces are available.",
			inputSchema: z.object({}),
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (_args, context) => {
			try {
				const [session, activeTag] = await Promise.all([
					deps.getSession(),
					deps.getActiveContainerTag(),
				])
				const client = deps.getClientInfo(context)
				const sessionId = context.sessionId
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
								activeSpace: activeTag ?? null,
								assignedSpaces:
									session.accessType === "restricted"
										? session.containerTags
										: null,
								scope: session.scope,
								...(client ? { client } : {}),
								...(sessionId ? { sessionId } : {}),
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
