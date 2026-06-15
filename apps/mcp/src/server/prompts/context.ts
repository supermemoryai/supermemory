import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { RbacContext } from "../auth/rbac"
import type { SupermemoryClient } from "../client"

export function registerContextPrompt(
	server: McpServer,
	rbac: RbacContext,
	getClient: (tag?: string) => SupermemoryClient,
	resolveContainerTag: (explicit?: string) => Promise<string | undefined>,
) {
	const containerTagField: Record<string, z.ZodTypeAny> =
		rbac.hasRootContainerTag
			? {}
			: {
					containerTag: z
						.string()
						.max(128, "Container tag exceeds maximum length")
						.optional(),
				}

	const argsSchema = {
		includeRecent: z.boolean().optional().default(true),
		...containerTagField,
	}

	server.registerPrompt(
		"context",
		{
			description: "Get user context including profile and workspace info",
			argsSchema,
		},
		async (rawArgs) => {
			const args = rawArgs as {
				includeRecent?: boolean
				containerTag?: string
			}
			try {
				if (args.containerTag && !rbac.canRead(args.containerTag)) {
					return {
						messages: [
							{
								role: "user" as const,
								content: {
									type: "text" as const,
									text: `No access to container tag '${args.containerTag}'.`,
								},
							},
						],
					}
				}
				const effectiveTag = await resolveContainerTag(args.containerTag)
				const client = getClient(effectiveTag)
				const profileResult = await client.getProfile()

				const parts: string[] = []

				if (profileResult.profile.static.length > 0) {
					parts.push("## About the user")
					for (const fact of profileResult.profile.static) {
						parts.push(`- ${fact}`)
					}
				}

				if (
					args.includeRecent !== false &&
					profileResult.profile.dynamic.length > 0
				) {
					parts.push("\n## Recent context")
					for (const fact of profileResult.profile.dynamic) {
						parts.push(`- ${fact}`)
					}
				}

				if (effectiveTag) {
					parts.push(`\n## Active workspace: ${effectiveTag}`)
				}

				return {
					messages: [
						{
							role: "user" as const,
							content: {
								type: "text" as const,
								text:
									parts.length > 0
										? parts.join("\n")
										: "No user context available yet.",
							},
						},
					],
				}
			} catch {
				return {
					messages: [
						{
							role: "user" as const,
							content: {
								type: "text" as const,
								text: "Unable to load user context.",
							},
						},
					],
				}
			}
		},
	)
}
