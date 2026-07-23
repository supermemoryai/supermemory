import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { z } from "zod"
import { SUPERMEMORY_RESOURCE_URI, type ViewMessage } from "../../shared/types"
import { MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import type { ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	registerAppTool(
		deps.server,
		"upload-file-submit",
		{
			description: "Submit a file upload",
			inputSchema: {
				fileData: z.string().describe("Base64-encoded file content"),
				fileName: z.string(),
				mimeType: z.string(),
				containerTag: z.string().min(1),
			},
			annotations: MEMORY_TOOL_ANNOTATIONS,
			_meta: {
				ui: {
					resourceUri: SUPERMEMORY_RESOURCE_URI,
					visibility: ["app"],
				},
			},
		},
		async (rawArgs) => {
			const args = rawArgs as {
				fileData: string
				fileName: string
				mimeType: string
				containerTag: string
			}
			try {
				const binaryString = atob(args.fileData)
				const bytes = new Uint8Array(binaryString.length)
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i)
				}

				const client = deps.getClient(args.containerTag)
				const result = await client.uploadFile(
					bytes.buffer as ArrayBuffer,
					args.fileName,
					args.mimeType,
					args.containerTag,
				)

				const sc: ViewMessage = {
					view: "upload-success",
					id: result.id,
					fileName: args.fileName,
					containerTag: args.containerTag,
				}

				return {
					content: [
						{
							type: "text" as const,
							text: `File uploaded: ${args.fileName} → ${result.id}`,
						},
					],
					structuredContent: sc,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
