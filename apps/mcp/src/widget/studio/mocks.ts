import type {
	ContainerTag,
	ContainerTagAccess,
	DocumentWithMemories,
} from "../../shared/types"

// Mock data for the Studio gallery. Mirrors the shapes the server returns
// so views render exactly as they would in Claude Desktop.

export const mockContainerTags: ContainerTag[] = [
	{
		id: "ct_1",
		name: "Marketing",
		containerTag: "sm_project_marketing",
		createdAt: "2026-01-02T10:00:00Z",
		updatedAt: "2026-05-30T14:20:00Z",
		isExperimental: false,
		emoji: "📣",
		isNova: true,
		documentCount: 42,
		memoryCount: 318,
		lastActivityAt: "2026-05-30T14:20:00Z",
	},
	{
		id: "ct_2",
		name: "Engineering RFCs",
		containerTag: "sm_project_eng_rfcs",
		createdAt: "2026-01-04T10:00:00Z",
		updatedAt: "2026-05-29T09:00:00Z",
		isExperimental: false,
		emoji: "🛠️",
		isNova: true,
		documentCount: 17,
		memoryCount: 96,
		lastActivityAt: "2026-05-29T09:00:00Z",
	},
	{
		id: "ct_3",
		name: "Design System",
		containerTag: "sm_project_design",
		createdAt: "2026-02-01T10:00:00Z",
		updatedAt: "2026-05-12T16:40:00Z",
		isExperimental: false,
		isNova: false,
		documentCount: 8,
		memoryCount: 1,
		lastActivityAt: "2026-05-12T16:40:00Z",
	},
	{
		id: "ct_4",
		name: "Onboarding",
		containerTag: "sm_project_onboarding",
		createdAt: "2026-03-01T10:00:00Z",
		updatedAt: "2026-03-01T10:00:00Z",
		isExperimental: true,
		emoji: "🚀",
		isNova: false,
		documentCount: 0,
		memoryCount: 0,
		lastActivityAt: null,
	},
]

export const mockAssignedTags: ContainerTagAccess[] = [
	{ containerTag: "sm_project_marketing", permission: "write" },
	{ containerTag: "sm_project_eng_rfcs", permission: "read" },
	{ containerTag: "sm_project_design", permission: "write" },
]

export const mockWritableTags: string[] = [
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
