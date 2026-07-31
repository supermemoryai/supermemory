import type { McpServer } from "@modelcontextprotocol/server"
import { DEFAULT_PROJECT_ID, type SupermemoryClient } from "../client"
import {
	compactDescription,
	formatFactSection,
	formatSpaceRow,
	sortSpaces,
	spaceDisplayName,
	spaceMetadata,
} from "../space-presentation"

const CONTEXT_FACT_LIMIT = 8
const RECENT_SPACE_LIMIT = 3

export function registerContextPrompt(
	server: McpServer,
	getClient: (tag?: string) => SupermemoryClient,
	resolveContainerTag: () => Promise<string | undefined>,
) {
	server.registerPrompt(
		"context",
		{
			description: "Attach compact context for the active space",
		},
		async () => {
			try {
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
					"# Supermemory Context",
					`Active space: ${activeLabel} [${activeKey}]${fallback}`,
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
						CONTEXT_FACT_LIMIT,
					),
					...formatFactSection(
						"Recent Context",
						profileResult.profile.dynamic,
						CONTEXT_FACT_LIMIT,
					),
				)

				if (
					profileResult.profile.static.length === 0 &&
					profileResult.profile.dynamic.length === 0
				) {
					parts.push("No profile facts are available for this space yet.")
				}

				const recentSpaces = sortSpaces(spaces, activeKey)
					.filter((space) => space.containerTag !== activeKey)
					.slice(0, RECENT_SPACE_LIMIT)
				if (recentSpaces.length > 0) {
					parts.push(
						"",
						"## Recently Active Spaces",
						...recentSpaces.map((space) =>
							formatSpaceRow(space, activeKey, 100),
						),
					)
				}

				parts.push(
					"",
					"Use a space key with space-aware tools when the user asks about another space. Keep space contexts separate unless the user asks to combine them.",
				)

				return {
					messages: [
						{
							role: "user" as const,
							content: {
								type: "text" as const,
								text: parts.join("\n"),
							},
						},
					],
				}
			} catch {
				return {
					messages: [
						{
							role: "user" as const,
							content: {
								type: "text" as const,
								text: "Unable to load user context.",
							},
						},
					],
				}
			}
		},
	)
}
