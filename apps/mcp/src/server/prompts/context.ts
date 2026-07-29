import type { McpServer } from "@modelcontextprotocol/server"
import { DEFAULT_PROJECT_ID, type SupermemoryClient } from "../client"
import {
	compactDescription,
	formatFactSection,
	formatWorkspaceRow,
	sortWorkspaces,
	workspaceDisplayName,
	workspaceMetadata,
} from "../workspace-presentation"

const CONTEXT_FACT_LIMIT = 8
const RECENT_WORKSPACE_LIMIT = 3

export function registerContextPrompt(
	server: McpServer,
	getClient: (tag?: string) => SupermemoryClient,
	resolveContainerTag: () => Promise<string | undefined>,
) {
	server.registerPrompt(
		"context",
		{
			description: "Attach compact context for the active workspace",
		},
		async () => {
			try {
				const selectedTag = await resolveContainerTag()
				const activeKey = selectedTag ?? DEFAULT_PROJECT_ID
				const [profileResult, workspaces] = await Promise.all([
					getClient(activeKey).getProfile(),
					getClient().listContainerTags(),
				])
				const activeWorkspace = workspaces.find(
					(workspace) => workspace.containerTag === activeKey,
				)
				const activeLabel = workspaceDisplayName(activeWorkspace, activeKey)
				const fallback = selectedTag ? "" : " (default)"
				const parts: string[] = [
					"# Supermemory Context",
					`Active workspace: ${activeLabel} [${activeKey}]${fallback}`,
				]

				if (activeWorkspace) {
					const metadata = workspaceMetadata(activeWorkspace)
					if (metadata) parts.push(metadata)
					const description = compactDescription(activeWorkspace.description)
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
					parts.push("No profile facts are available for this workspace yet.")
				}

				const recentWorkspaces = sortWorkspaces(workspaces, activeKey)
					.filter((workspace) => workspace.containerTag !== activeKey)
					.slice(0, RECENT_WORKSPACE_LIMIT)
				if (recentWorkspaces.length > 0) {
					parts.push(
						"",
						"## Recently Active Workspaces",
						...recentWorkspaces.map((workspace) =>
							formatWorkspaceRow(workspace, activeKey, 100),
						),
					)
				}

				parts.push(
					"",
					"Use a workspace key with workspace-aware tools when the user asks about another workspace. Keep workspace contexts separate unless the user asks to combine them.",
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
