import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { z } from "zod"
import { SUPERMEMORY_RESOURCE_URI, type ViewMessage } from "../../shared/types"
import type { ToolDeps } from "./types"
import {
	containerTagValidationUnavailableError,
	unknownContainerTagError,
	validateContainerTag,
} from "./validate-container-tag"

export function register(deps: ToolDeps) {
	registerAppTool(
		deps.server,
		"set-active-tag",
		{
			description: "Set the active container tag for this session",
			inputSchema: {
				containerTag: z.string().min(1),
			},
			_meta: {
				ui: {
					resourceUri: SUPERMEMORY_RESOURCE_URI,
					visibility: ["app"],
				},
			},
		},
		async (args) => {
			const containerTag = (args as { containerTag: string }).containerTag
			if (!deps.rbac.canRead(containerTag)) {
				return deps.appErrorResult(
					new Error(
						`You don't have access to '${containerTag}'. Choose a workspace from listSpaces.`,
					),
					{ kind: "user", title: "No access to this workspace" },
				)
			}
			try {
				const validation = await validateContainerTag(deps, containerTag)
				if (validation === "missing") {
					return deps.appErrorResult(unknownContainerTagError(containerTag), {
						kind: "user",
						title: "Workspace not found",
					})
				}
				if (validation === "unavailable") {
					return deps.appErrorResult(containerTagValidationUnavailableError())
				}
			} catch (error) {
				return deps.appErrorResult(error)
			}
			await deps.storage.put("activeContainerTag", containerTag)
			const sc: ViewMessage = {
				view: "confirmation",
				containerTag,
			}
			return {
				content: [
					{
						type: "text" as const,
						text: `Active workspace set to ${containerTag}`,
					},
				],
				structuredContent: sc,
			}
		},
	)
}
