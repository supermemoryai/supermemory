import * as addMemory from "./add-memory"
import * as fetchGraphData from "./fetch-graph-data"
import * as guidedSave from "./guided-save"
import * as listContainerTags from "./list-container-tags"
import * as listMemories from "./list-memories"
import * as memoryGraph from "./memory-graph"
import * as saveMemory from "./save-memory"
import * as searchMemory from "./search-memory"
import * as selectWorkspace from "./select-workspace"
import * as setActiveTag from "./set-active-tag"
import type { ToolDeps } from "./types"
import * as uploadFile from "./upload-file"
import * as uploadFileSubmit from "./upload-file-submit"
import * as whoAmI from "./who-am-i"

export function registerAllTools(deps: ToolDeps) {
	// Always available
	searchMemory.register(deps)
	listMemories.register(deps)
	listContainerTags.register(deps)
	whoAmI.register(deps)
	selectWorkspace.register(deps)
	setActiveTag.register(deps)
	memoryGraph.register(deps)
	fetchGraphData.register(deps)

	// Write-gated (RBAC)
	if (deps.rbac.hasWriteAccess) {
		addMemory.register(deps)
		guidedSave.register(deps)
		saveMemory.register(deps)
		uploadFile.register(deps)
		uploadFileSubmit.register(deps)
	}
}
