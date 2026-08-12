import type { McpServer } from "@modelcontextprotocol/server"
import { DEFAULT_PROJECT_ID, type SupermemoryClient } from "../client"
import {
	compactDescription,
	formatFactSection,
	spaceDisplayName,
	spaceMetadata,
} from "../space-presentation"

const PROFILE_FACT_LIMIT = 12

export function registerProfileResource(
	server: McpServer,
	getClient: (containerTag?: string) => SupermemoryClient,
	resolveContainerTag: () => Promise<string | undefined>,
) {
	server.registerResource(
		"Active Space Profile",
		"supermemory://profile",
		{},
		async () => {
			const selectedTag = await resolveContainerTag()
			const activeKey = selectedTag ?? DEFAULT_PROJECT_ID
			const [profileResult, spaces] = await Promise.all([
				getClient(activeKey).getProfile(),
				getClient().listContainerTags(),
			])
			const activeSpace = spaces.find(
				(space) => space.containerTag === activeKey,
			)
			const activeLabel = spaceDisplayName(activeSpace, activeKey)
			const fallback = selectedTag ? "" : " (default)"
			const parts: string[] = [
				"# Active Space Profile",
				`Space: ${activeLabel} [${activeKey}]${fallback}`,
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
				"Other spaces are available. Use `listSpaces` to find the relevant space key, then use that key with space-aware tools when the user asks about another space. Keep space contexts separate unless the user asks to combine them.",
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
