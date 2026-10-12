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
		// v5 metadata values are flat: string, number, boolean or string list.
		metadata: z
			.record(
				z.string(),
				z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
			)
			.optional()
			.describe("Optional metadata to attach to the saved memory"),
	})

	deps.server.registerTool(
		"add_memory",
		{
			description:
				"Save a memory in the user's ACTIVE space. The target space is the one the user selected via select-space; pass namespace only to override it. To remove outdated information, use the separately exposed forget_memory tool. Legacy action='forget' remains supported for existing clients.",
			inputSchema,
			outputSchema: addMemoryOutputSchema,
			annotations: MEMORY_TOOL_ANNOTATIONS,
		},
		async (args, context) => {
			if (args.action === "forget") return forgetMemory(deps, args, context)
			try {
				const namespace = await deps.resolveNamespace(namespaceArg(args))
				const client = deps.getClient(namespace)

				const result = await client.createMemory(args.content, args.metadata)
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
