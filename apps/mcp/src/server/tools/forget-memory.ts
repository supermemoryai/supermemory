import { z } from "zod"
import { optionalNamespaceSchema } from "../namespace"
import { MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import {
	legacyNamespaceInput,
	namespaceArg,
	withLegacyNamespace,
} from "./compat"
import { forgetMemoryOutputSchema } from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

export async function forgetMemory(
	deps: ToolDeps,
	args: { content: string; namespace?: string; containerTag?: string },
) {
	try {
		const namespace = await deps.resolveNamespace(namespaceArg(args))
		const result = await deps.getClient(namespace).forgetMemory(args.content)
		return {
			content: [textContent(result.message)],
			structuredContent: withLegacyNamespace({
				action: "forget" as const,
				success: result.success,
				namespace: result.namespace,
				message: result.message,
			}),
		}
	} catch (error) {
		return deps.errorResult(error)
	}
}

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"forget_memory",
		{
			description:
				"Forget a memory matching the supplied content in the user's ACTIVE space. Use when information is outdated or the user asks to remove it. The target space is the one selected via select-space; pass namespace only to override it.",
			inputSchema: z.object({
				content: z
					.string()
					.max(200000, "Content exceeds maximum length")
					.describe("The memory content to forget"),
				namespace: optionalNamespaceSchema,
				...legacyNamespaceInput,
			}),
			outputSchema: forgetMemoryOutputSchema,
			annotations: MEMORY_TOOL_ANNOTATIONS,
		},
		async (args) => forgetMemory(deps, args),
	)
}
