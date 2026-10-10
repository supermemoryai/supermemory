import * as addMemory from "./add-memory"
import * as fetchGraphData from "./fetch-graph-data"
import * as getDocument from "./get-document"
import * as getProfile from "./get-profile"
import * as guidedSave from "./guided-save"
import * as listNamespaces from "./list-namespaces"
import * as listDocuments from "./list-documents"
import * as listMemories from "./list-memories"
import * as memoryGraph from "./memory-graph"
import * as prepareFileUpload from "./prepare-file-upload"
import * as saveMemory from "./save-memory"
import * as searchMemory from "./search-memory"
import * as selectSpace from "./select-space"
import * as setActiveTag from "./set-active-tag"
import type { ToolDeps } from "./types"
import * as uploadFile from "./upload-file"
import * as whoAmI from "./who-am-i"

// Renamed to snake_case in #1665; clients with a cached tool list still call the old names.
// Remove once PostHog shows ~0 $mcp_tool_call events for these names for 2 weeks.
const LEGACY_TOOL_NAMES: Record<string, string> = {
	get_document: "getDocument",
	list_spaces: "listSpaces",
	list_documents: "listDocuments",
	list_memories: "listMemories",
	who_am_i: "whoAmI",
}

type LooseRegisterTool = (
	name: string,
	config: { title?: string; description?: string },
	cb: unknown,
) => ReturnType<ToolDeps["server"]["registerTool"]>

// Aliases must stay listed: ChatGPT rejects calls to tools missing from tools/list.
function withLegacyToolNames(server: ToolDeps["server"]): ToolDeps["server"] {
	const register = server.registerTool.bind(server) as LooseRegisterTool
	const registerTool: LooseRegisterTool = (name, config, cb) => {
		const tool = register(name, config, cb)
		const legacyName = LEGACY_TOOL_NAMES[name]
		if (legacyName) {
			register(
				legacyName,
				{
					...config,
					...(config.title ? { title: `${config.title} (deprecated)` } : {}),
					description: `Deprecated: use ${name}.`,
				},
				cb,
			)
		}
		return tool
	}
	return { registerTool: registerTool as ToolDeps["server"]["registerTool"] }
}

export function registerAllTools(toolDeps: ToolDeps) {
	const deps = { ...toolDeps, server: withLegacyToolNames(toolDeps.server) }
	searchMemory.register(deps)
	getProfile.register(deps)
	listDocuments.register(deps)
	getDocument.register(deps)
	listMemories.register(deps)
	listNamespaces.register(deps)
	whoAmI.register(deps)
	selectSpace.register(deps)
	setActiveTag.register(deps)
	memoryGraph.register(deps)
	fetchGraphData.register(deps)
	addMemory.register(deps)
	guidedSave.register(deps)
	saveMemory.register(deps)
	uploadFile.register(deps)
	prepareFileUpload.register(deps)
}
