import { z } from "zod"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const containerTagField: Record<string, z.ZodTypeAny> = deps.rbac
		.hasRootContainerTag
		? {}
		: {
				containerTag: z
					.string()
					.max(128, "Container tag exceeds maximum length")
					.optional(),
			}

	const inputSchema = {
		content: z
			.string()
			.max(200000, "Content exceeds maximum length")
			.describe("The memory content to save or forget"),
		action: z.enum(["save", "forget"]).optional().default("save"),
		...containerTagField,
	}

	deps.server.registerTool(
		"add_memory",
		{
			description:
				"Add (save) or forget a memory in the user's ACTIVE workspace. Defaults to 'save'. The target workspace is the one the user selected via select-workspace; pass containerTag only to override it. Use 'forget' when information is outdated or the user asks to remove it.",
			inputSchema,
		},
		async (rawArgs) => {
			const args = rawArgs as {
				content: string
				action?: "save" | "forget"
				containerTag?: string
			}
			try {
				if (args.containerTag && !deps.rbac.canWrite(args.containerTag)) {
					return deps.errorResult(
						new Error(
							`No write access to container tag '${args.containerTag}'.`,
						),
					)
				}
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const client = deps.getClient(effectiveTag)

				if (args.action === "forget") {
					const result = await client.forgetMemory(args.content)
					return {
						content: [{ type: "text" as const, text: result.message }],
					}
				}

				const result = await client.createMemory(args.content)
				return {
					content: [
						{
							type: "text" as const,
							text: `Memory saved (ID: ${result.id}, workspace: ${result.containerTag})`,
						},
					],
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
