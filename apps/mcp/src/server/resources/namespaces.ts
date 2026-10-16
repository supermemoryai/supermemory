import type { McpServer } from "@modelcontextprotocol/server"
import type { SupermemoryClient } from "../client"
import { formatSpaceRow, sortSpaces } from "../space-presentation"

export function registerNamespacesResource(
	server: McpServer,
	getClient: () => SupermemoryClient,
	resolveNamespace: () => Promise<string | undefined>,
	getDefaultNamespace: () => Promise<string>,
) {
	server.registerResource("My Spaces", "supermemory://spaces", {}, async () => {
		const client = getClient()
		const [namespaces, selectedNamespace] = await Promise.all([
			client.listNamespaces(),
			resolveNamespace(),
		])
		const activeKey = selectedNamespace ?? (await getDefaultNamespace())
		const rows = sortSpaces(namespaces, activeKey).map((space) =>
			formatSpaceRow(space, activeKey),
		)
		const fallback = selectedNamespace ? "" : " (default)"
		const text = [
			"# My Spaces",
			`${namespaces.length} available · Active: ${activeKey}${fallback}`,
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
