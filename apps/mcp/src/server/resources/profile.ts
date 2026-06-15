import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { SupermemoryClient } from "../client"

export function registerProfileResource(
	server: McpServer,
	getClient: () => SupermemoryClient,
) {
	server.registerResource(
		"User Profile",
		"supermemory://profile",
		{},
		async () => {
			const client = getClient()
			const profileResult = await client.getProfile()
			const parts: string[] = ["# User Profile\n"]

			if (profileResult.profile.static.length > 0) {
				parts.push("## Stable Preferences")
				for (const fact of profileResult.profile.static) {
					parts.push(`- ${fact}`)
				}
			}

			if (profileResult.profile.dynamic.length > 0) {
				parts.push("\n## Recent Activity")
				for (const fact of profileResult.profile.dynamic) {
					parts.push(`- ${fact}`)
				}
			}

			return {
				contents: [
					{
						uri: "supermemory://profile",
						mimeType: "text/plain",
						text:
							parts.length > 1
								? parts.join("\n")
								: "No profile yet. Start saving memories.",
					},
				],
			}
		},
	)
}
