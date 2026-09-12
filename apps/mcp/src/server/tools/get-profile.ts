import { z } from "zod"
import { optionalContainerTagSchema } from "../container-tag"
import { formatFactSection } from "../space-presentation"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { getProfileOutputSchema, type GetProfileOutput } from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const inputSchema = z.object({
		containerTag: optionalContainerTagSchema,
	})

	deps.server.registerTool(
		"get_profile",
		{
			title: "Get Profile",
			description:
				"Get the stable and recent profile for one space — long-lived facts plus recent context. search_memory does not include this. After searching, call this if matching memories are not enough and you need who-the-user-is, preferences, or recent context. When the user names a space, resolve it with listSpaces and pass containerTag; otherwise use the active space. Use whoAmI for account identity and access, not profile facts.",
			inputSchema,
			outputSchema: getProfileOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const effectiveTag = await deps.resolveContainerTag(args.containerTag)
				const profileResult = await deps.getClient(effectiveTag).getProfile()
				const profile = {
					static: profileResult.profile.static,
					dynamic: profileResult.profile.dynamic,
				}

				const parts = [
					...formatFactSection(
						"Stable Context",
						profile.static,
						profile.static.length,
					),
					...formatFactSection(
						"Recent Context",
						profile.dynamic,
						profile.dynamic.length,
					),
				]

				if (parts.length === 0) {
					parts.push("No profile facts are available for this space yet.")
				}

				const structuredContent: GetProfileOutput = {
					containerTag: effectiveTag,
					profile,
				}

				return {
					content: [textContent(parts.join("\n"))],
					structuredContent,
				}
			} catch (error) {
				return deps.errorResult(error)
			}
		},
	)
}
