import type { McpServer } from "@modelcontextprotocol/server"
import { DEFAULT_PROJECT_ID, type SupermemoryClient } from "../client"
import {
	formatWorkspaceRow,
	sortWorkspaces,
	workspaceDisplayName,
} from "../workspace-presentation"

export function registerContainerTagsResource(
	server: McpServer,
	getClient: () => SupermemoryClient,
	resolveContainerTag: () => Promise<string | undefined>,
) {
	server.registerResource(
		"My Workspaces",
		"supermemory://container-tags",
		{},
		async () => {
			const client = getClient()
			const [containerTags, selectedTag] = await Promise.all([
				client.listContainerTags(),
				resolveContainerTag(),
			])
			const activeKey = selectedTag ?? DEFAULT_PROJECT_ID
			const activeWorkspace = containerTags.find(
				(workspace) => workspace.containerTag === activeKey,
			)
			const rows = sortWorkspaces(containerTags, activeKey).map((workspace) =>
				formatWorkspaceRow(workspace, activeKey),
			)
			const activeLabel = workspaceDisplayName(activeWorkspace, activeKey)
			const fallback = selectedTag ? "" : " (default)"
			const text = [
				"# My Workspaces",
				`${containerTags.length} available · Active: ${activeLabel} [${activeKey}]${fallback}`,
				"",
				...rows,
			].join("\n")

			return {
				contents: [
					{
						uri: "supermemory://container-tags",
						mimeType: "text/plain",
						text,
					},
				],
			}
		},
	)
}
