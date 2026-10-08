import { z } from "zod"
import { optionalNamespaceSchema } from "../namespace"
import {
	legacyNamespaceInput,
	namespaceArg,
	withLegacyNamespace,
} from "./compat"
import { MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import { addMemoryOutputSchema, type AddMemoryOutput } from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const inputSchema = z.object({
		content: z
			.string()
			.max(200000, "Content exceeds maximum length")
			.describe("The memory content to save or forget"),
		action: z.enum(["save", "forget"]).optional().default("save"),
		namespace: optionalNamespaceSchema,
		...legacyNamespaceInput,
	})

	deps.server.registerTool(
		"add_memory",
		{
			description:
				"Add (save) or forget a memory in the user's ACTIVE space. Defaults to 'save'. The target space is the one the user selected via select-space; pass namespace only to override it. Use 'forget' when information is outdated or the user asks to remove it.",
			inputSchema,
			outputSchema: addMemoryOutputSchema,
			annotations: MEMORY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const namespace = await deps.resolveNamespace(namespaceArg(args))
				const client = deps.getClient(namespace)

				if (args.action === "forget") {
					const result = await client.forgetMemory(args.content)
					const structuredContent: AddMemoryOutput = withLegacyNamespace({
						action: "forget",
						success: result.success,
						namespace: result.namespace,
						message: result.message,
					})
					return {
						content: [textContent(result.message)],
						structuredContent,
					}
				}

				const result = await client.createMemory(args.content)
				const message = `Memory saved (ID: ${result.id}, space: ${result.namespace})`
				const structuredContent: AddMemoryOutput = withLegacyNamespace({
					action: "save",
					success: true,
					namespace: result.namespace,
					message,
					id: result.id,
					status: result.status,
				})
				return {
					content: [textContent(message)],
					structuredContent,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
