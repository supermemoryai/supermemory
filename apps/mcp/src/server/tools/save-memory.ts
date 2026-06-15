import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { z } from "zod"
import { SUPERMEMORY_RESOURCE_URI, type ViewMessage } from "../../shared/types"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	registerAppTool(
		deps.server,
		"save-memory",
		{
			description: "Save content to memory",
			inputSchema: {
				content: z.string().min(1),
				containerTag: z.string().min(1),
			},
			_meta: {
				ui: {
					resourceUri: SUPERMEMORY_RESOURCE_URI,
					visibility: ["app"],
				},
			},
		},
		async (rawArgs) => {
			const args = rawArgs as { content: string; containerTag: string }
			try {
				if (!deps.rbac.canWrite(args.containerTag)) {
					return deps.errorResult(
						new Error(
							`No write access to container tag '${args.containerTag}'.`,
						),
					)
				}
				const client = deps.getClient(args.containerTag)
				const result = await client.createMemory(args.content)
				const sc: ViewMessage = {
					view: "save-success",
					id: result.id,
					containerTag: args.containerTag,
				}
				return {
					content: [
						{ type: "text" as const, text: `Memory saved: ${result.id}` },
					],
					structuredContent: sc,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
