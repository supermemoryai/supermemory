import { z } from "zod"
import { uploadSuccessViewSchema, type ViewMessage } from "../../shared/types"
import { appResultMeta, appToolMeta } from "../app-metadata"
import { containerTagSchema } from "../container-tag"
import { ADDITIVE_MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import { textContent, type ToolDeps } from "./types"

/**
 * Compatibility action for published app catalogs that predate direct uploads.
 * Keep this tool name and input schema stable until those catalogs are retired.
 */
export function register(deps: ToolDeps) {
	deps.server.registerTool(
		"upload-file-submit",
		{
			description: "Submit a file upload",
			inputSchema: z.object({
				fileData: z.string().describe("Base64-encoded file content"),
				fileName: z.string(),
				mimeType: z.string(),
				containerTag: containerTagSchema,
				viewId: z.string().uuid().optional(),
			}),
			outputSchema: uploadSuccessViewSchema,
			annotations: ADDITIVE_MEMORY_TOOL_ANNOTATIONS,
			_meta: appToolMeta(["app"]),
		},
		async (args) => {
			try {
				const viewId = args.viewId ?? crypto.randomUUID()
				const binaryString = atob(args.fileData)
				const bytes = new Uint8Array(binaryString.length)
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i)
				}

				const result = await deps
					.getClient(args.containerTag)
					.uploadFile(
						bytes.buffer,
						args.fileName,
						args.mimeType,
						args.containerTag,
					)

				const structuredContent: ViewMessage = {
					view: "upload-success",
					viewId,
					id: result.id,
					fileName: args.fileName,
					containerTag: args.containerTag,
				}

				return {
					content: [
						textContent(`File uploaded: ${args.fileName} → ${result.id}`),
					],
					structuredContent,
					_meta: appResultMeta(viewId),
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
