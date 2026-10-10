import type {
	DocumentWithMemories,
	NamespaceAccess,
	NamespaceInfo,
} from "../../shared/types"

// Mock data for the Studio gallery. Mirrors the shapes the server returns
// so views render exactly as they would in Claude Desktop.

export const mockNamespaces: NamespaceInfo[] = [
	{
		id: "ns_1",
		namespace: "sm_project_marketing",
		description: "Positioning, launches, and campaign notes.",
		createdAt: "2026-01-02T10:00:00Z",
		updatedAt: "2026-05-30T14:20:00Z",
		documentCount: 42,
		memoryCount: 318,
	},
	{
		id: "ns_2",
		namespace: "sm_project_eng_rfcs",
		createdAt: "2026-01-04T10:00:00Z",
		updatedAt: "2026-05-29T09:00:00Z",
		documentCount: 17,
		memoryCount: 96,
	},
	{
		id: "ns_3",
		namespace: "sm_project_design",
		createdAt: "2026-02-01T10:00:00Z",
		updatedAt: "2026-05-12T16:40:00Z",
		documentCount: 8,
		memoryCount: 1,
	},
	{
		id: "ns_4",
		namespace: "sm_project_onboarding",
		createdAt: "2026-03-01T10:00:00Z",
		updatedAt: "2026-03-01T10:00:00Z",
		documentCount: 0,
		memoryCount: 0,
	},
]

export const mockAssignedNamespaces: NamespaceAccess[] = [
	{ namespace: "sm_project_marketing", permission: "write" },
	{ namespace: "sm_project_eng_rfcs", permission: "read" },
	{ namespace: "sm_project_design", permission: "write" },
]

export const mockWritableNamespaces: string[] = [
	"sm_project_marketing",
	"sm_project_design",
]

export const mockDocuments: DocumentWithMemories[] = [
	{
		id: "doc_1",
		title: "Q3 Launch Brief",
		summary: "Positioning and channels for the Q3 launch.",
		type: "text",
		createdAt: "2026-05-01T10:00:00Z",
		updatedAt: "2026-05-01T10:00:00Z",
		memoryEntries: [
			{
				id: "mem_1",
				memory: "Q3 launch targets enterprise buyers in fintech.",
				spaceId: "ct_1",
				isLatest: true,
				createdAt: "2026-05-01T10:00:00Z",
				updatedAt: "2026-05-01T10:00:00Z",
			},
			{
				id: "mem_2",
				memory: "Primary channel is partner co-marketing webinars.",
				spaceId: "ct_1",
				isLatest: true,
				createdAt: "2026-05-01T10:05:00Z",
				updatedAt: "2026-05-01T10:05:00Z",
			},
		],
	},
	{
		id: "doc_2",
		title: "Brand Voice Guide",
		summary: "Tone, vocabulary, and do/don't list.",
		type: "text",
		createdAt: "2026-04-12T10:00:00Z",
		updatedAt: "2026-04-12T10:00:00Z",
		memoryEntries: [
			{
				id: "mem_3",
				memory: "Brand voice is confident, plain, never hypey.",
				spaceId: "ct_1",
				isLatest: true,
				createdAt: "2026-04-12T10:00:00Z",
				updatedAt: "2026-04-12T10:00:00Z",
			},
		],
	},
]
