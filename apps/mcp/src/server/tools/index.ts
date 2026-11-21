import { CLIENT_CAPABILITIES_META_KEY } from "@modelcontextprotocol/server"
import { z } from "zod"
import { APP_EXTENSION_ID } from "../app-metadata"
import * as addMemory from "./add-memory"
import * as fetchGraphData from "./fetch-graph-data"
import * as forgetMemory from "./forget-memory"
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

export interface ToolListing {
	legacyAliases: boolean
	appTools: boolean
}

const EVERY_TOOL: ToolListing = { legacyAliases: true, appTools: true }

const toolsListRequest = z.looseObject({
	method: z.literal("tools/list"),
	params: z
		.looseObject({
			_meta: z
				.looseObject({
					[CLIENT_CAPABILITIES_META_KEY]: z
						.looseObject({
							extensions: z.record(z.string(), z.unknown()).optional(),
						})
						.optional(),
				})
				.optional(),
		})
		.optional(),
})

// Hiding applies only to a lone tools/list so hidden tools stay callable; legacy lists carry no capabilities, so they keep app tools.
export function toolListingFor(body: unknown): ToolListing {
	const request = toolsListRequest.safeParse(body)
	if (!request.success) return EVERY_TOOL
	const capabilities =
		request.data.params?._meta?.[CLIENT_CAPABILITIES_META_KEY]
	return {
		legacyAliases: false,
		appTools:
			!capabilities || APP_EXTENSION_ID in (capabilities.extensions ?? {}),
	}
}

type LooseRegisterTool = (
	name: string,
	config: {
		title?: string
		description?: string
		_meta?: Record<string, unknown>
	},
	cb: unknown,
) => ReturnType<ToolDeps["server"]["registerTool"]>

// Disabling before connect is silent, so a hidden tool sends no list_changed.
function withListing(
	server: ToolDeps["server"],
	listing: ToolListing,
): ToolDeps["server"] {
	const register = server.registerTool.bind(server) as LooseRegisterTool
	const registerTool: LooseRegisterTool = (name, config, cb) => {
		const tool = register(name, config, cb)
		if (!listing.appTools && config._meta?.ui) tool.disable()
		const legacyName = LEGACY_TOOL_NAMES[name]
		if (legacyName && listing.legacyAliases) {
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

export function registerAllTools(toolDeps: ToolDeps, listing: ToolListing) {
	const deps = { ...toolDeps, server: withListing(toolDeps.server, listing) }
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
	forgetMemory.register(deps)
	guidedSave.register(deps)
	saveMemory.register(deps)
	uploadFile.register(deps)
	prepareFileUpload.register(deps)
}
