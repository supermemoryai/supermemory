import {
	PARAMETER_DESCRIPTIONS,
	TOOL_DESCRIPTIONS,
} from "../../../../packages/tools/src/tools-shared"

export interface CatalogParameter {
	name: string
	/** Omitted when this parameter is only exposed by the TypeScript tool schema. */
	pythonName?: string
	description: string
	required?: boolean
}

export interface CatalogTool {
	id: string
	pythonName: string
	description: string
	parameters: CatalogParameter[]
}

export const TOOL_CATALOG: CatalogTool[] = [
	{
		id: "searchMemories",
		pythonName: "search_memories",
		description: TOOL_DESCRIPTIONS.searchMemories,
		parameters: [
			{
				name: "informationToGet",
				pythonName: "information_to_get",
				description: PARAMETER_DESCRIPTIONS.informationToGet,
				required: true,
			},
			{
				name: "includeFullDocs",
				description: PARAMETER_DESCRIPTIONS.includeFullDocs,
			},
			{
				name: "limit",
				pythonName: "limit",
				description: PARAMETER_DESCRIPTIONS.limit,
			},
		],
	},
	{
		id: "addMemory",
		pythonName: "add_memory",
		description: TOOL_DESCRIPTIONS.addMemory,
		parameters: [
			{
				name: "memory",
				pythonName: "memory",
				description: PARAMETER_DESCRIPTIONS.memory,
				required: true,
			},
		],
	},
	{
		id: "getProfile",
		pythonName: "get_profile",
		description: TOOL_DESCRIPTIONS.getProfile,
		parameters: [
			{
				name: "containerTag",
				description: PARAMETER_DESCRIPTIONS.containerTag,
			},
			{
				name: "query",
				pythonName: "query",
				description: PARAMETER_DESCRIPTIONS.query,
			},
		],
	},
	{
		id: "documentList",
		pythonName: "document_list",
		description: TOOL_DESCRIPTIONS.documentList,
		parameters: [
			{
				name: "containerTag",
				description: PARAMETER_DESCRIPTIONS.containerTag,
			},
			{
				name: "limit",
				pythonName: "limit",
				description: PARAMETER_DESCRIPTIONS.limit,
			},
			{
				name: "page",
				pythonName: "page",
				description: PARAMETER_DESCRIPTIONS.page,
			},
		],
	},
	{
		id: "documentDelete",
		pythonName: "document_delete",
		description: TOOL_DESCRIPTIONS.documentDelete,
		parameters: [
			{
				name: "documentId",
				pythonName: "document_id",
				description: PARAMETER_DESCRIPTIONS.documentId,
				required: true,
			},
			{
				name: "containerTag",
				description: PARAMETER_DESCRIPTIONS.documentContainerTag,
			},
		],
	},
	{
		id: "documentAdd",
		pythonName: "document_add",
		description: TOOL_DESCRIPTIONS.documentAdd,
		parameters: [
			{
				name: "content",
				pythonName: "content",
				description: PARAMETER_DESCRIPTIONS.content,
				required: true,
			},
			{
				name: "title",
				pythonName: "title",
				description: PARAMETER_DESCRIPTIONS.title,
			},
			{
				name: "description",
				pythonName: "description",
				description: PARAMETER_DESCRIPTIONS.description,
			},
		],
	},
	{
		id: "memoryForget",
		pythonName: "memory_forget",
		description: TOOL_DESCRIPTIONS.memoryForget,
		parameters: [
			{
				name: "containerTag",
				description: PARAMETER_DESCRIPTIONS.containerTag,
			},
			{
				name: "memoryId",
				pythonName: "memory_id",
				description: PARAMETER_DESCRIPTIONS.memoryId,
			},
			{
				name: "memoryContent",
				pythonName: "memory_content",
				description: PARAMETER_DESCRIPTIONS.memoryContent,
			},
			{
				name: "reason",
				pythonName: "reason",
				description: PARAMETER_DESCRIPTIONS.reason,
			},
		],
	},
]
