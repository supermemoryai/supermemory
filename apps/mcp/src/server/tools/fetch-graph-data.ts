import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { z } from "zod"
import { ENTERPRISE_RESOURCE_URI } from "../../shared/types"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	registerAppTool(
		deps.server,
		"fetch-graph-data",
		{
			description: "Fetch documents with memories for graph display",
			inputSchema: {
				containerTag: z.string().optional(),
				page: z.number().optional().default(1),
				limit: z.number().optional().default(200),
			},
			_meta: {
				ui: {
					resourceUri: ENTERPRISE_RESOURCE_URI,
					visibility: ["app"],
				},
			},
		},
		async (rawArgs) => {
			const args = rawArgs as {
				containerTag?: string
				page?: number
				limit?: number
			}
			try {
				if (args.containerTag && !deps.rbac.canRead(args.containerTag)) {
					return deps.errorResult(
						new Error(
							`No read access to container tag '${args.containerTag}'.`,
						),
					)
				}
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const client = deps.getClient(effectiveTag)
				const containerTags = effectiveTag ? [effectiveTag] : undefined
				const data = await client.getDocuments(
					containerTags,
					args.page,
					args.limit,
				)

				return {
					content: [{ type: "text" as const, text: JSON.stringify(data) }],
					structuredContent: data,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
