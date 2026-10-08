import { z } from "zod"
import { uploadPreparationSchema } from "../../shared/types"
import { appToolMeta } from "../app-metadata"
import { namespaceSchema } from "../namespace"
import { legacyNamespaceInput, namespaceArg } from "./compat"
import { ADDITIVE_MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"prepare-file-upload",
		{
			description: "Prepare a direct file upload",
			inputSchema: z.object({
				namespace: namespaceSchema.optional(),
				...legacyNamespaceInput,
			}),
			outputSchema: uploadPreparationSchema,
			annotations: ADDITIVE_MEMORY_TOOL_ANNOTATIONS,
			_meta: appToolMeta(["app"]),
		},
		async (args) => {
			try {
				const namespace = namespaceArg(args)
				if (!namespace)
					return deps.errorResult(new Error("namespace is required"))
				const preparation = await deps.createUploadSession(namespace)

				return {
					content: [textContent("Upload session prepared")],
					structuredContent: preparation,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
