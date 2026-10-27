import { z } from "zod"
import { optionalNamespaceSchema } from "../namespace"
import {
	legacyNamespaceInput,
	namespaceArg,
	withLegacyNamespace,
} from "./compat"
import { MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import { forgetMemory } from "./forget-memory"
import { addMemoryOutputSchema, type AddMemoryOutput } from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const inputSchema = z.object({
		content: z
			.string()
			.max(200000, "Content exceeds maximum length")
			.describe("The memory content to save"),
		action: z
			.enum(["save", "forget"])
			.optional()
			.default("save")
			.describe(
				"Deprecated compatibility input. Use forget_memory to forget content; omit action to save.",
			),
		namespace: optionalNamespaceSchema,
		...legacyNamespaceInput,
	})

	deps.server.registerTool(
		"add_memory",
		{
			description:
				"Save content as a document in the user's ACTIVE space. Memories are extracted from it in the background, so they may not be searchable right away. The target space is the one the user selected via select-space; pass namespace only to override it. To remove outdated information, use the separately exposed forget_memory tool. Legacy action='forget' remains supported for existing clients.",
			inputSchema,
			outputSchema: addMemoryOutputSchema,
			annotations: MEMORY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			if (args.action === "forget") return forgetMemory(deps, args)
			try {
				const namespace = await deps.resolveNamespace(namespaceArg(args))
				const client = deps.getClient(namespace)

				const result = await client.createMemory(args.content)
				const message = `Document accepted (ID: ${result.id}, space: ${result.namespace}). Memories are extracted in the background and can take a moment to show up in search.`
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
