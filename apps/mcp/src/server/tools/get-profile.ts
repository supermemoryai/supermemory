import { z } from "zod"
import { optionalNamespaceSchema } from "../namespace"
import {
	legacyNamespaceInput,
	namespaceArg,
	withLegacyNamespace,
} from "./compat"
import { formatFactSection } from "../space-presentation"
import { READ_ONLY_TOOL_ANNOTATIONS } from "./annotations"
import { getProfileOutputSchema, type GetProfileOutput } from "./output-schemas"
import { textContent, type ToolDeps } from "./types"

export function register(deps: ToolDeps) {
	const inputSchema = z.object({
		namespace: optionalNamespaceSchema,
		...legacyNamespaceInput,
	})

	deps.server.registerTool(
		"get_profile",
		{
			title: "Get Profile",
			description:
				"Get the stable and recent profile for one space — long-lived facts plus recent context. search_memory does not include this. After searching, call this if matching memories are not enough and you need who-the-user-is, preferences, or recent context. When the user names a space, resolve it with list_spaces and pass namespace; otherwise use the active space. Use who_am_i for account identity and access, not profile facts.",
			inputSchema,
			outputSchema: getProfileOutputSchema,
			annotations: READ_ONLY_TOOL_ANNOTATIONS,
		},
		async (args) => {
			try {
				const namespace = await deps.resolveNamespace(namespaceArg(args))
				const profileResult = await deps.getClient(namespace).getProfile()
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

				const structuredContent: GetProfileOutput = withLegacyNamespace({
					namespace,
					profile,
				})

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
