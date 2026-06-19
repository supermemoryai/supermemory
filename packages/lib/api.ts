import { createFetch, createSchema } from "@better-fetch/fetch"
import { z } from "zod"
import {
	AnalyticsChatResponseSchema,
	AnalyticsMemoryResponseSchema,
	AnalyticsUsageResponseSchema,
	BulkDeleteMemoriesResponseSchema,
	BulkDeleteMemoriesSchema,
	ConnectionResponseSchema,
	ContainerTagSettingsUpdateSchema,
	CreateProjectSchema,
	DeleteProjectResponseSchema,
	DeleteProjectSchema,
	DocumentsWithMemoriesQuerySchema,
	DocumentsWithMemoriesResponseSchema,
	ListContainerTagsResponseSchema,
	ListMemoriesResponseSchema,
	ListProjectsResponseSchema,
	MemoryAddSchema,
	MemoryResponseSchema,
	MigrateMCPRequestSchema,
	MigrateMCPResponseSchema,
	ProcessingDocumentsResponseSchema,
	ProjectSchema,
	SearchRequestSchema,
	SearchResponseSchema,
	type SearchResult,
	SettingsRequestSchema,
	UpdateContainerTagSettingsRequestSchema,
} from "../validation/api"

// Settings response schema - this is custom to console (not in shared validation)
const SettingsResponseSchema = z.object({
	message: z.string(),
	settings: z.object({
		excludeItems: z.array(z.string().min(1).max(20)).optional(),
		filterPrompt: z.string().min(1).max(750).optional(),
		includeItems: z.array(z.string().min(1).max(20)).optional(),
		shouldLLMFilter: z.boolean().optional(),
	}),
})

// Analytics request schema - custom to console
const AnalyticsRequestSchema = z.object({
	from: z.string().datetime().optional(),
	limit: z.number().int().min(1).max(100).default(20),
	page: z.number().int().min(1).default(1),
	period: z.enum(["24h", "7d", "30d", "all"]).optional(),
	to: z.string().datetime().optional(),
})

// Waitlist response schema
const WaitlistStatusResponseSchema = z.object({
	inWaitlist: z.boolean(),
	accessGranted: z.boolean(),
	createdAt: z.string().datetime(),
})

export const apiSchema = createSchema({
	// Inferred-memory review queue (Nova "Suggested for you")
	"@get/container-tags/:containerTag/inferred": {
		output: z.object({
			memories: z.array(
				z.object({
					id: z.string(),
					memory: z.string(),
					parentCount: z.number(),
					createdAt: z.string(),
					updatedAt: z.string(),
					metadata: z.record(z.string(), z.unknown()).nullable(),
				}),
			),
			total: z.number(),
		}),
		params: z.object({ containerTag: z.string() }),
	},

	"@post/container-tags/:containerTag/inferred/:memoryId/review": {
		input: z.object({ action: z.enum(["approve", "decline"]) }),
		output: z.object({
			id: z.string(),
			isInference: z.boolean(),
			reviewStatus: z.enum(["approved", "declined"]),
		}),
		params: z.object({ containerTag: z.string(), memoryId: z.string() }),
	},

	"@get/analytics/chat": {
		output: AnalyticsChatResponseSchema,
		query: AnalyticsRequestSchema,
	},
	"@get/analytics/memory": {
		output: AnalyticsMemoryResponseSchema,
		query: AnalyticsRequestSchema,
	},

	// Analytics operations
	"@get/analytics/usage": {
		output: AnalyticsUsageResponseSchema,
		query: AnalyticsRequestSchema,
	},

	// Connection operations - Add missing endpoints
	"@post/connections/:provider": {
		input: z.object({
			containerTags: z.array(z.string()).optional(),
			documentLimit: z.number().int().min(1).max(10000).optional(),
			metadata: z
				.record(z.union([z.string(), z.number(), z.boolean()]))
				.optional()
				.nullable(),
			redirectUrl: z.string().optional(),
		}),
		output: z.object({
			// authLink/expiresIn are present for OAuth providers (Drive/Notion/OneDrive)
			// but absent for credential-based ones like Granola where there's no redirect.
			authLink: z.string().optional(),
			expiresIn: z.string().optional(),
			id: z.string(),
			redirectsTo: z.string().optional(),
		}),
		params: z.object({
			provider: z.enum(["google-drive", "notion", "onedrive", "granola"]),
		}),
	},

	"@post/connections/list": {
		input: z.object({
			containerTags: z.array(z.string()).optional(),
		}),
		output: z.array(ConnectionResponseSchema),
	},

	"@get/connections": {
		output: z.array(ConnectionResponseSchema),
		query: z
			.object({
				endUserId: z.string().optional(),
			})
			.optional(),
	},

	// Connection operations
	"@get/connections/:connectionId": {
		output: ConnectionResponseSchema,
		params: z.object({ connectionId: z.string() }),
	},

	"@delete/connections/:connectionId": {
		output: z.object({
			id: z.string(),
			provider: z.string(),
		}),
		params: z.object({ connectionId: z.string() }),
		query: z.object({
			deleteDocuments: z.boolean().optional(),
		}),
	},

	"@get/connections/:connectionId/sync-runs": {
		output: z.array(
			z.object({
				id: z.string(),
				connectionId: z.string(),
				status: z.enum(["running", "completed", "failed"]),
				triggerType: z.enum(["event", "cron", "manual"]),
				startedAt: z.string(),
				completedAt: z.string().nullable(),
				itemsProcessed: z.number(),
				itemsFailed: z.number(),
				error: z.string().nullable(),
			}),
		),
		params: z.object({ connectionId: z.string() }),
	},

	"@post/connections/:provider/import": {
		input: z.object({
			containerTags: z.array(z.string()).optional(),
		}),
		output: z.unknown(),
		params: z.object({
			provider: z.enum([
				"google-drive",
				"notion",
				"onedrive",
				"gmail",
				"github",
				"web-crawler",
				"s3",
				"granola",
			]),
		}),
	},

	// Settings operations
	"@get/settings": {
		output: z.object({}).passthrough(),
	},
	"@patch/settings": {
		input: SettingsRequestSchema,
		output: SettingsResponseSchema,
	},
	"@post/settings/reset": {
		input: z.object({ confirmation: z.string() }),
		output: z.object({
			success: z.boolean(),
			deletedConnections: z.number(),
			deletedDocumentBatches: z.number(),
			deletedDocumentsApprox: z.number(),
			deletedMemoryRows: z.number(),
			deletedExtraSpaces: z.number(),
			clearedDefaultSpaceContext: z.boolean(),
			settingsReset: z.boolean(),
		}),
	},
	// Memory operations
	"@post/documents": {
		input: MemoryAddSchema,
		output: MemoryResponseSchema,
	},
	"@post/documents/batch": {
		input: z.object({
			documents: z
				.array(
					z.object({
						content: z.string(),
						containerTags: z.array(z.string()).optional(),
						containerTag: z.string().optional(),
						entityContext: z.string().max(1500).optional(),
						metadata: z.record(z.unknown()).optional(),
					}),
				)
				.min(1)
				.max(600),
			containerTag: z.string().optional(),
			entityContext: z.string().max(1500).optional(),
			metadata: z.record(z.unknown()).optional(),
		}),
		output: z.object({
			results: z.array(
				z.object({
					id: z.string(),
					status: z.string(),
					error: z.string().optional(),
					details: z.string().optional(),
				}),
			),
			success: z.number(),
			failed: z.number(),
		}),
	},
	"@post/documents/list": {
		body: z
			.object({
				limit: z.number().optional(),
				page: z.number().optional(),
				status: z.string().optional(),
				containerTags: z.array(z.string()).optional(),
			})
			.optional(),
		output: ListMemoriesResponseSchema,
	},
	"@post/documents/documents": {
		input: DocumentsWithMemoriesQuerySchema,
		output: DocumentsWithMemoriesResponseSchema,
	},
	"@post/documents/documents/by-ids": {
		input: z.object({
			ids: z.array(z.string()),
			by: z.enum(["id", "customId"]).optional(),
			containerTags: z.array(z.string()).optional(),
		}),
		output: DocumentsWithMemoriesResponseSchema,
	},
	"@post/documents/migrate-mcp": {
		input: MigrateMCPRequestSchema,
		output: MigrateMCPResponseSchema,
	},

	"@get/documents/processing": {
		output: ProcessingDocumentsResponseSchema,
		query: z
			.object({
				containerTags: z.array(z.string()).optional(),
			})
			.optional(),
	},

	"@get/documents/:id": {
		output: z.any(),
	},

	// Delete a memory
	"@delete/documents/:id": {
		output: z.any(), // 204 No-Content
		params: z.object({ id: z.string() }),
	},

	// Bulk delete memories
	"@delete/documents/bulk": {
		body: BulkDeleteMemoriesSchema,
		output: BulkDeleteMemoriesResponseSchema,
	},

	// Search operations
	"@post/search": {
		input: SearchRequestSchema,
		output: SearchResponseSchema,
	},

	// Project operations
	"@get/projects": {
		output: ListProjectsResponseSchema,
	},
	"@get/container-tags/list": {
		output: ListContainerTagsResponseSchema,
	},
	"@get/container-tags/:containerTag/profile": {
		output: z.object({
			profile: z.object({
				static: z.array(z.string()).optional(),
				dynamic: z.array(z.string()).optional(),
			}),
		}),
		params: z.object({
			containerTag: z.string(),
		}),
	},
	"@patch/container-tags/:containerTag": {
		input: UpdateContainerTagSettingsRequestSchema,
		output: ContainerTagSettingsUpdateSchema,
		params: z.object({
			containerTag: z.string(),
		}),
	},
	"@delete/container-tags/:containerTag": {
		output: z.object({
			success: z.boolean(),
			containerTag: z.string(),
			deletedDocumentsCount: z.number(),
			deletedMemoriesCount: z.number(),
		}),
		params: z.object({
			containerTag: z.string(),
		}),
	},
	"@post/projects": {
		input: CreateProjectSchema,
		output: ProjectSchema,
	},
	"@delete/projects/:projectId": {
		input: DeleteProjectSchema,
		output: DeleteProjectResponseSchema,
		params: z.object({
			projectId: z.string(),
		}),
	},

	// MCP operations
	"@get/mcp/has-login": {
		output: z.object({ previousLogin: z.boolean() }),
	},

	// Waitlist operations
	"@get/waitlist/status": {
		output: WaitlistStatusResponseSchema,
	},

	"@post/emails/welcome/pro": {
		input: z.object({
			email: z.string(),
			firstName: z.string(),
		}),
		output: z.object({
			message: z.string(),
		}),
	},

	// Weekly digest preferences
	"@get/digests/preferences": {
		output: z.object({ digestOptOut: z.boolean() }),
	},
	"@post/digests/preferences": {
		input: z.object({ digestOptOut: z.boolean() }),
		output: z.object({ digestOptOut: z.boolean() }),
	},

	// Weekly digest endpoints
	"@get/digests": {
		output: z.object({
			digests: z.array(
				z.object({
					id: z.string(),
					isoWeek: z.string(),
					emailSubject: z.string().nullable(),
					title: z.string().nullable(),
					status: z.enum(["pending", "processing", "completed", "failed"]),
					sentAt: z.string().nullable(),
					generatedAt: z.string(),
					highlightCount: z.number(),
					memoryCount: z.number(),
				}),
			),
			page: z.number(),
			limit: z.number(),
		}),
		query: z.object({
			page: z.number().optional(),
			limit: z.number().optional(),
		}),
	},

	"@get/digests/:id": {
		output: z.object({
			id: z.string(),
			isoWeek: z.string(),
			emailSubject: z.string().nullable(),
			status: z.enum(["pending", "processing", "completed", "failed"]),
			sentAt: z.string().nullable(),
			generatedAt: z.string(),
			digestData: z.object({
				title: z.string(),
				intro: z.string(),
				highlights: z.array(
					z.object({
						id: z.string(),
						title: z.string(),
						content: z.string(),
						format: z.enum(["paragraph", "bullets", "quote", "one_liner"]),
						query: z.string(),
						sourceDocumentIds: z.array(z.string()),
					}),
				),
				featureRecommendations: z.array(
					z.object({
						feature: z.string(),
						headline: z.string(),
						body: z.string(),
						ctaLabel: z.string(),
						ctaUrl: z.string(),
					}),
				),
				memoryCount: z.number(),
				spaceCount: z.number(),
			}),
		}),
	},
})

export const $fetch = createFetch({
	baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"}/v3`,
	credentials: "include",
	headers: { "X-App-Source": "nova" },
	onRequest: (context: { headers: Headers }) => {
		if (!context.headers.has("X-App-Source")) {
			context.headers.set("X-App-Source", "nova")
		}
	},
	retry: {
		attempts: 3,
		delay: 100,
		type: "linear",
	},
	schema: apiSchema,
})

// Re-export types that might be used elsewhere
export type { SearchResult }
