import { z } from "zod"
import { uploadPreparationSchema } from "../../shared/types"
import { appToolMeta } from "../app-metadata"
import { ADDITIVE_MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"prepare-file-upload",
		{
			description: "Prepare a direct file upload",
			inputSchema: z.object({}),
			outputSchema: uploadPreparationSchema,
			annotations: ADDITIVE_MEMORY_TOOL_ANNOTATIONS,
			_meta: appToolMeta(["app"]),
		},
		async () => {
			try {
				const preparation = await deps.createUploadSession()

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
