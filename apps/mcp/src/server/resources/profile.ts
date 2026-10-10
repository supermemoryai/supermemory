import type { McpServer } from "@modelcontextprotocol/server"
import { DEFAULT_NAMESPACE, type SupermemoryClient } from "../client"
import {
	compactDescription,
	formatFactSection,
	spaceMetadata,
} from "../space-presentation"

const PROFILE_FACT_LIMIT = 12

export function registerProfileResource(
	server: McpServer,
	getClient: (namespace?: string) => SupermemoryClient,
	resolveNamespace: () => Promise<string | undefined>,
) {
	server.registerResource(
		"Active Space Profile",
		"supermemory://profile",
		{},
		async () => {
			const selectedNamespace = await resolveNamespace()
			const activeKey = selectedNamespace ?? DEFAULT_NAMESPACE
			const [profileResult, spaces] = await Promise.all([
				getClient(activeKey).getProfile(),
				getClient().listNamespaces(),
			])
			const activeSpace = spaces.find((space) => space.namespace === activeKey)
			const fallback = selectedNamespace ? "" : " (default)"
			const parts: string[] = [
				"# Active Space Profile",
				`Space: ${activeKey}${fallback}`,
			]

			if (activeSpace) {
				const metadata = spaceMetadata(activeSpace)
				if (metadata) parts.push(metadata)
				const description = compactDescription(activeSpace.description)
				if (description) parts.push(description)
			}

			parts.push(
				"",
				...formatFactSection(
					"Stable Context",
					profileResult.profile.static,
					PROFILE_FACT_LIMIT,
				),
				...formatFactSection(
					"Recent Context",
					profileResult.profile.dynamic,
					PROFILE_FACT_LIMIT,
				),
			)

			if (
				profileResult.profile.static.length === 0 &&
				profileResult.profile.dynamic.length === 0
			) {
				parts.push("No profile facts are available for this space yet.")
			}

			parts.push(
				"",
				"Other spaces are available. Use `list_spaces` to find the relevant space key, then use that key with space-aware tools when the user asks about another space. Keep space contexts separate unless the user asks to combine them.",
			)

			return {
				contents: [
					{
						uri: "supermemory://profile",
						mimeType: "text/plain",
						text: parts.join("\n"),
					},
				],
			}
		},
	)
}
