import type { McpServer } from "@modelcontextprotocol/server"
import { DEFAULT_PROJECT_ID, type SupermemoryClient } from "../client"
import {
	formatSpaceRow,
	sortSpaces,
	spaceDisplayName,
} from "../space-presentation"

export function registerContainerTagsResource(
	server: McpServer,
	getClient: () => SupermemoryClient,
	resolveContainerTag: () => Promise<string | undefined>,
) {
	server.registerResource("My Spaces", "supermemory://spaces", {}, async () => {
		const client = getClient()
		const [containerTags, selectedTag] = await Promise.all([
			client.listContainerTags(),
			resolveContainerTag(),
		])
		const activeKey = selectedTag ?? DEFAULT_PROJECT_ID
		const activeSpace = containerTags.find(
			(space) => space.containerTag === activeKey,
		)
		const rows = sortSpaces(containerTags, activeKey).map((space) =>
			formatSpaceRow(space, activeKey),
		)
		const activeLabel = spaceDisplayName(activeSpace, activeKey)
		const fallback = selectedTag ? "" : " (default)"
		const text = [
			"# My Spaces",
			`${containerTags.length} available · Active: ${activeLabel} [${activeKey}]${fallback}`,
			"",
			...rows,
		].join("\n")

		return {
			contents: [
				{
					uri: "supermemory://spaces",
					mimeType: "text/plain",
					text,
				},
			],
		}
	})
}
