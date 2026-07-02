import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { SupermemoryClient } from "../client"

export function registerContainerTagsResource(
	server: McpServer,
	getClient: () => SupermemoryClient,
) {
	server.registerResource(
		"My Container Tags",
		"supermemory://container-tags",
		{},
		async () => {
			const client = getClient()
			const containerTags = await client.listContainerTags()
			return {
				contents: [
					{
						uri: "supermemory://container-tags",
						mimeType: "application/json",
						text: JSON.stringify({ containerTags }, null, 2),
					},
				],
			}
		},
	)
}
