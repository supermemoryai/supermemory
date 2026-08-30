import * as addMemory from "./add-memory"
import * as fetchGraphData from "./fetch-graph-data"
import * as getDocument from "./get-document"
import * as guidedSave from "./guided-save"
import * as listContainerTags from "./list-container-tags"
import * as listDocuments from "./list-documents"
import * as listMemories from "./list-memories"
import * as memoryGraph from "./memory-graph"
import * as prepareFileUpload from "./prepare-file-upload"
import * as saveMemory from "./save-memory"
import * as searchDocuments from "./search-documents"
import * as searchMemory from "./search-memory"
import * as selectSpace from "./select-space"
import * as setActiveTag from "./set-active-tag"
import type { ToolDeps } from "./types"
import * as uploadFile from "./upload-file"
import * as whoAmI from "./who-am-i"

export function registerAllTools(deps: ToolDeps) {
	searchMemory.register(deps)
	searchDocuments.register(deps)
	listDocuments.register(deps)
	getDocument.register(deps)
	listMemories.register(deps)
	listContainerTags.register(deps)
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
