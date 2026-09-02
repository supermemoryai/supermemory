import { z } from "zod"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { whoAmIOutputSchema, type WhoAmIOutput } from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"whoAmI",
		{
			description:
				"Get the current Supermemory account context, including user identity, role, access type, permissions, scope, and active space. Use this when the user asks who they are, what access they have, or which space is currently active. Use listSpaces instead when the user asks which spaces are available.",
			inputSchema: z.object({}),
			outputSchema: whoAmIOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (_args, context) => {
			try {
				const [session, activeTag] = await Promise.all([
					deps.getSession(),
					deps.getActiveContainerTag(),
				])
				const client = deps.getClientInfo(context)
				const structuredContent: WhoAmIOutput = {
					userId: session.user.id,
					...(session.user.email ? { email: session.user.email } : {}),
					...(session.user.name ? { name: session.user.name } : {}),
					role: session.role ?? "unknown",
					accessType: session.accessType ?? "full",
					activeSpace: activeTag ?? null,
					assignedSpaces:
						session.accessType === "restricted"
							? (session.containerTags ?? null)
							: null,
					...(session.scope ? { scope: session.scope } : {}),
					...(client ? { client } : {}),
				}
				return {
					content: [textContent(JSON.stringify(structuredContent))],
					structuredContent,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
