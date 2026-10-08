import { z } from "zod"
import { uploadPreparationSchema } from "../../shared/types"
import { appToolMeta } from "../app-metadata"
import { namespaceSchema } from "../namespace"
import { ADDITIVE_MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"prepare-file-upload",
		{
			description: "Prepare a direct file upload",
			inputSchema: z.object({ namespace: namespaceSchema }),
			outputSchema: uploadPreparationSchema,
			annotations: ADDITIVE_MEMORY_TOOL_ANNOTATIONS,
			_meta: appToolMeta(["app"]),
		},
		async (args) => {
			try {
				const preparation = await deps.createUploadSession(args.namespace)

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
