import { z } from "zod"
import "zod-openapi/extend"
import {
	MetadataSchema as BaseMetadataSchema,
	DocumentSchema,
	MemoryEntrySchema,
	OrganizationSettingsSchema,
	RequestTypeEnum,
} from "./schemas"

export const MetadataSchema = BaseMetadataSchema

export const SearchFiltersSchema = z
	.object({
		AND: z.array(z.unknown()).optional(),
		OR: z.array(z.unknown()).optional(),
	})
	.or(z.record(z.unknown()))

const exampleMetadata: Record<string, string | number | boolean> = {
	category: "technology",
	isPublic: true,
	readingTime: 5,
	source: "web",
	tag_1: "ai",
	tag_2: "machine-learning",
} as const

const exampleMemory = {
	connectionId: "conn_123",
	containerTags: ["user_123", "project_123"] as const,
	content: "This is a detailed article about machine learning concepts...",
	createdAt: new Date().toISOString(),
	customId: "mem_abc123",
	id: "acxV5LHMEsG2hMSNb4umbn",
	metadata: exampleMetadata,
	ogImage: "https://example.com/image.jpg",
	raw: "This is a detailed article about machine learning concepts...",
	source: "web",
	status: "done",
	summary:
		"A comprehensive guide to understanding the basics of machine learning and its applications.",
	title: "Introduction to Machine Learning",
	tokenCount: 1000,
	type: "text",
	updatedAt: new Date().toISOString(),
	url: "https://example.com/article",
} as const

export const MemorySchema = z
	.object({
		id: z.string().openapi({
			description: "Unique identifier of the memory.",
			example: "acxV5LHMEsG2hMSNb4umbn",
		}),
		customId: z.string().nullable().optional().openapi({
			description:
				"Optional custom ID of the memory. This could be an ID from your database that will uniquely identify this memory.",
			example: "mem_abc123",
		}),
		connectionId: z.string().nullable().optional().openapi({
			description:
				"Optional ID of connection the memory was created from. This is useful for identifying the source of the memory.",
			example: "conn_123",
		}),
		content: z
			.string()
			.nullable()
			.optional()
			.openapi({
				description:
					"The content to extract and process into a memory. This can be a URL to a website, a PDF, an image, or a video. \n\nPlaintext: Any plaintext format\n\nURL: A URL to a website, PDF, image, or video\n\nWe automatically detect the content type from the url's response format.",
				examples: [
					"This is a detailed article about machine learning concepts...",
					"https://example.com/article",
					"https://youtube.com/watch?v=abc123",
					"https://example.com/audio.mp3",
					"https://aws-s3.com/bucket/file.pdf",
					"https://example.com/image.jpg",
				],
			}),
		metadata: MetadataSchema.nullable().optional().openapi({
			description:
				"Optional metadata for the memory. This is used to store additional information about the memory. You can use this to store any additional information you need about the memory. Metadata can be filtered through. Keys must be strings and are case sensitive. Values can be strings, numbers, or booleans. You cannot nest objects.",
			example: exampleMetadata,
		}),
		source: z.string().nullable().optional().openapi({
			description: "Source of the memory",
			example: "web",
		}),
		status: DocumentSchema.shape.status.openapi({
			description: "Status of the memory",
			example: "done",
		}),
		summary: z.string().nullable().optional().openapi({
			description: "Summary of the memory content",
			example:
				"A comprehensive guide to understanding the basics of machine learning and its applications.",
		}),
		title: z.string().nullable().optional().openapi({
			description: "Title of the memory",
			example: "Introduction to Machine Learning",
		}),
		type: DocumentSchema.shape.type.openapi({
			description: "Type of the memory",
			example: "text",
		}),
		url: z.string().nullable().optional().openapi({
			description: "URL of the memory",
			example: "https://example.com/article",
		}),
		createdAt: z.string().openapi({
			description: "Creation timestamp",
			example: new Date().toISOString(),
			format: "date-time",
		}),
		updatedAt: z.string().openapi({
			description: "Last update timestamp",
			example: new Date().toISOString(),
			format: "date-time",
		}),
		containerTags: z
			.array(z.string())
			.optional()
			.readonly()
			.openapi({
				description:
					"Optional tags this memory should be containerized by. This can be an ID for your user, a project ID, or any other identifier you wish to use to group memories.",
				example: ["user_123", "project_123"] as const,
			}),
		chunkCount: z.number().default(0).openapi({
			description: "Number of chunks in the memory",
			example: 10,
		}),
	})
	.openapi({
		description: "Memory object",
		example: exampleMemory,
	})

export const MemoryUpdateSchema = z.object({
	containerTags: z
		.array(z.string())
		.optional()
		.openapi({
			description:
				"Optional tags this memory should be containerized by. This can be an ID for your user, a project ID, or any other identifier you wish to use to group memories.",
			example: ["user_123", "project_123"],
		}),
	content: z.string().optional().openapi({
		description:
			"The content to extract and process into a memory. This can be a URL to a website, a PDF, an image, or a video. \n\nPlaintext: Any plaintext format\n\nURL: A URL to a website, PDF, image, or video\n\nWe automatically detect the content type from the url's response format.",
		example: "This is a detailed article about machine learning concepts...",
	}),
	customId: z.string().optional().openapi({
		description:
			"Optional custom ID of the memory. This could be an ID from your database that will uniquely identify this memory.",
		example: "mem_abc123",
	}),
	metadata: MetadataSchema.optional().openapi({
		description:
			"Optional metadata for the memory. This is used to store additional information about the memory. You can use this to store any additional information you need about the memory. Metadata can be filtered through. Keys must be strings and are case sensitive. Values can be strings, numbers, or booleans. You cannot nest objects.",
		example: exampleMetadata,
	}),
})

export const MemoryAddSchema = MemoryUpdateSchema

export const PaginationSchema = z
	.object({
		currentPage: z.number(),
		limit: z.number().max(1100).default(10),
		totalItems: z.number(),
		totalPages: z.number(),
	})
	.openapi({
		description: "Pagination metadata",
		example: {
			currentPage: 1,
			limit: 10,
			totalItems: 100,
			totalPages: 10,
		},
	})

export const GetMemoryResponseSchema = MemorySchema

export const ListMemoriesResponseSchema = z
	.object({
		memories: z.array(
			MemorySchema.pick({
				connectionId: true,
				containerTags: true,
				createdAt: true,
				customId: true,
				id: true,
				metadata: true,
				status: true,
				summary: true,
				title: true,
				type: true,
				updatedAt: true,
			}),
		),
		pagination: PaginationSchema,
	})
	.openapi({
		description: "List of memories",
		example: {
			memories: [
				{
					connectionId: exampleMemory.connectionId,
					containerTags: exampleMemory.containerTags,
					createdAt: exampleMemory.createdAt,
					customId: exampleMemory.customId,
					id: exampleMemory.id,
					metadata: exampleMemory.metadata,
					status: exampleMemory.status,
					summary: exampleMemory.summary,
					title: exampleMemory.title,
					type: exampleMemory.type,
					updatedAt: exampleMemory.updatedAt,
				},
			],
			pagination: {
				currentPage: 1,
				limit: 10,
				totalItems: 100,
				totalPages: 10,
			},
		},
	})

export const ListMemoriesQuerySchema = z
	.object({
		containerTags: z
			.array(z.string())
			.optional()
			.openapi({
				description:
					"Optional tags this memory should be containerized by. This can be an ID for your user, a project ID, or any other identifier you wish to use to group memories.",
				example: ["user_123", "project_123"],
			}),
		// TODO: Improve filter schema
		filters: z
			.string()
			.optional()
			.openapi({
				description: "Optional filters to apply to the search",
				example: JSON.stringify({
					AND: [
						{
							key: "group",
							negate: false,
							value: "jira_users",
						},
						{
							filterType: "numeric",
							key: "timestamp",
							negate: false,
							numericOperator: ">",
							value: "1742745777",
						},
					],
				}),
			}),
		limit: z
			.string()
			.regex(/^\d+$/)
			.or(z.number())
			.transform(Number)
			.refine((value) => value <= 1100, {
				message: "Limit cannot be greater than 1100",
			})
			.default("10")
			.openapi({
				description: "Number of items per page",
				example: "10",
			}),
		order: z
			.enum(["asc", "desc"])
			.default("desc")
			.openapi({ description: "Sort order", example: "desc" }),
		page: z
			.string()
			.regex(/^\d+$/)
			.or(z.number())
			.transform(Number)
			.default("1")
			.openapi({ description: "Page number to fetch", example: "1" }),
		sort: z
			.enum(["createdAt", "updatedAt"])
			.default("createdAt")
			.openapi({ description: "Field to sort by", example: "createdAt" }),
	})
	.openapi({
		description: "Query parameters for listing memories",
		example: {
			filters: JSON.stringify({
				AND: [
					{
						key: "group",
						negate: false,
						value: "jira_users",
					},
					{
						filterType: "numeric",
						key: "timestamp",
						negate: false,
						numericOperator: ">",
						value: "1742745777",
					},
				],
			}),
			limit: 10,
			order: "desc",
			page: 1,
			sort: "createdAt",
		},
	})

export const MemoryResponseSchema = z.object({
	id: z.string(),
	status: z.string(),
})

export const SearchRequestSchema = z.object({
	categoriesFilter: z
		.array(z.string())
		.optional()
		.openapi({
			description: "Optional category filters",
			example: ["technology", "science"],
			items: {
				enum: ["technology", "science", "business", "health"],
			},
			deprecated: true,
		}),
	chunkThreshold: z
		.number()
		.optional()
		.default(0)
		.refine((v) => v === undefined || (v >= 0 && v <= 1), {
			message: "chunkThreshold must be between 0 and 1",
			params: {
				max: 1,
				min: 0,
			},
		})
		.transform(Number)
		.openapi({
			description:
				"Threshold / sensitivity for chunk selection. 0 is least sensitive (returns most chunks, more results), 1 is most sensitive (returns lesser chunks, accurate results)",
			example: 0.5,
			maximum: 1,
			minimum: 0,
		}),
	containerTags: z
		.array(z.string())
		.optional()
		.openapi({
			description:
				"Optional tags this search should be containerized by. This can be an ID for your user, a project ID, or any other identifier you wish to use to filter memories.",
			example: ["user_123", "project_123"],
		}),
	docId: z.string().max(255).optional().openapi({
		description:
			"Optional document ID to search within. You can use this to find chunks in a very large document.",
		example: "doc_xyz789",
	}),
	documentThreshold: z
		.number()
		.optional()
		.default(0)
		.refine((v) => v === undefined || (v >= 0 && v <= 1), {
			message: "documentThreshold must be between 0 and 1",
			params: {
				max: 1,
				min: 0,
			},
		})
		.transform(Number)
		.openapi({
			description:
				"Threshold / sensitivity for document selection. 0 is least sensitive (returns most documents, more results), 1 is most sensitive (returns lesser documents, accurate results)",
			example: 0.5,
			maximum: 1,
			minimum: 0,
		}),
	filters: SearchFiltersSchema.optional().openapi({
		description: "Optional filters to apply to the search",
		example: {
			AND: [
				{
					key: "group",
					negate: false,
					value: "jira_users",
				},
				{
					filterType: "numeric",
					key: "timestamp",
					negate: false,
					numericOperator: ">",
					value: "1742745777",
				},
			],
		},
	}),
	includeFullDocs: z.boolean().optional().default(false).openapi({
		description:
			"If true, include full document in the response. This is helpful if you want a chatbot to know the full context of the document. ",
		example: false,
	}),
	includeSummary: z.boolean().optional().default(false).openapi({
		description:
			"If true, include document summary in the response. This is helpful if you want a chatbot to know the full context of the document. ",
		example: false,
	}),
	limit: z
		.number()
		.int()
		.positive()
		.optional()
		.default(10)
		.refine((v) => v === undefined || (v > 0 && v <= 100), {
			message: "limit must be between 1 and 100",
			params: {
				max: 100,
				min: 1,
			},
		})
		.openapi({
			description: "Maximum number of results to return",
			example: 10,
			maximum: 100,
			minimum: 1,
		}),
	onlyMatchingChunks: z.boolean().optional().default(true).openapi({
		description:
			"If true, only return matching chunks without context. Normally, we send the previous and next chunk to provide more context for LLMs. If you only want the matching chunk, set this to true.",
		example: false,
	}),
	q: z.string().min(1).openapi({
		description: "Search query string",
		example: "machine learning concepts",
		minLength: 1,
	}),
	rerank: z.boolean().optional().default(false).openapi({
		description:
			"If true, rerank the results based on the query. This is helpful if you want to ensure the most relevant results are returned.",
		example: false,
	}),
	rewriteQuery: z.boolean().optional().default(false).openapi({
		description:
			"If true, rewrites the query to make it easier to find documents. This increases the latency by about 400ms",
		example: false,
	}),
})

export const Searchv4RequestSchema = z.object({
	containerTag: z.string().optional().openapi({
		description:
			"Optional tag this search should be containerized by. This can be an ID for your user, a project ID, or any other identifier you wish to use to filter memories.",
		example: "user_123",
	}),
	threshold: z
		.number()
		.optional()
		.default(0.6)
		.refine((v) => v === undefined || (v >= 0 && v <= 1), {
			message: "documentThreshold must be between 0 and 1",
			params: {
				max: 1,
				min: 0,
			},
		})
		.transform(Number)
		.openapi({
			description:
				"Threshold / sensitivity for memories selection. 0 is least sensitive (returns most memories, more results), 1 is most sensitive (returns lesser memories, accurate results)",
			example: 0.5,
			maximum: 1,
			minimum: 0,
		}),
	filters: SearchFiltersSchema.optional().openapi({
		description: "Optional filters to apply to the search",
		example: {
			AND: [
				{
					key: "group",
					negate: false,
					value: "jira_users",
				},
				{
					filterType: "numeric",
					key: "timestamp",
					negate: false,
					numericOperator: ">",
					value: "1742745777",
				},
			],
		},
	}),
	include: z
		.object({
			documents: z.boolean().default(false),
			summaries: z.boolean().default(false),
			relatedMemories: z.boolean().default(false),
		})
		.optional()
		.default({
			documents: false,
			summaries: false,
		}),
	limit: z
		.number()
		.int()
		.positive()
		.optional()
		.default(10)
		.refine((v) => v === undefined || (v > 0 && v <= 100), {
			message: "limit must be between 1 and 100",
			params: {
				max: 100,
				min: 1,
			},
		})
		.openapi({
			description: "Maximum number of results to return",
			example: 10,
			maximum: 100,
			minimum: 1,
		}),
	q: z.string().min(1).openapi({
		description: "Search query string",
		example: "machine learning concepts",
		minLength: 1,
	}),
	rerank: z.boolean().optional().default(false).openapi({
		description:
			"If true, rerank the results based on the query. This is helpful if you want to ensure the most relevant results are returned.",
		example: false,
	}),
	rewriteQuery: z.boolean().optional().default(false).openapi({
		description:
			"If true, rewrites the query to make it easier to find documents. This increases the latency by about 400ms",
		example: false,
	}),
})

export const SearchResultSchema = z.object({
	chunks: z
		.array(
			z
				.object({
					content: z.string().openapi({
						description: "Content of the matching chunk",
						example:
							"Machine learning is a subset of artificial intelligence...",
					}),
					isRelevant: z.boolean().openapi({
						description: "Whether this chunk is relevant to the query",
						example: true,
					}),
					score: z.number().openapi({
						description: "Similarity score for this chunk",
						example: 0.85,
						maximum: 1,
						minimum: 0,
					}),
				})
				.openapi({
					description: "Matching content chunk",
					example: {
						content:
							"Machine learning is a subset of artificial intelligence...",
						isRelevant: true,
						score: 0.85,
					},
				}),
		)
		.openapi({
			description: "Matching content chunks from the document",
			example: [
				{
					content: "Machine learning is a subset of artificial intelligence...",
					isRelevant: true,
					score: 0.85,
				},
			],
		}),
	createdAt: z.coerce.date().openapi({
		description: "Document creation date",
		example: new Date().toISOString(),
		format: "date-time",
	}),
	documentId: z.string().openapi({
		description: "ID of the matching document",
		example: "doc_xyz789",
	}),
	metadata: z.record(z.unknown()).nullable().openapi({
		description: "Document metadata",
		example: exampleMetadata,
	}),
	score: z.number().openapi({
		description: "Relevance score of the match",
		example: 0.95,
		maximum: 1,
		minimum: 0,
	}),
	summary: z.string().nullable().optional().openapi({
		description: "Document summary",
		example:
			"A comprehensive guide to understanding the basics of machine learning and its applications.",
	}),
	content: z.string().nullable().optional().openapi({
		description:
			"Full document content (only included when includeFullDocs=true)",
		example:
			"This is the complete content of the document about machine learning concepts...",
	}),
	title: z.string().nullable().openapi({
		description: "Document title",
		example: "Introduction to Machine Learning",
	}),
	updatedAt: z.coerce.date().openapi({
		description: "Document last update date",
		example: new Date().toISOString(),
		format: "date-time",
	}),
	type: z.string().nullable().openapi({
		description: "Document type",
		example: "web",
	}),
})

export const SearchResponseSchema = z.object({
	results: z.array(SearchResultSchema),
	timing: z.number(),
	total: z.number(),
})

// V4 Memory Search Schemas
export const MemorySearchDocumentSchema = z.object({
	id: z.string().openapi({
		description: "Document ID",
		example: "doc_xyz789",
	}),
	title: z.string().openapi({
		description: "Document title",
		example: "Introduction to Machine Learning",
	}),
	type: z.string().openapi({
		description: "Document type",
		example: "web",
	}),
	metadata: z.record(z.unknown()).nullable().openapi({
		description: "Document metadata",
		example: exampleMetadata,
	}),
	createdAt: z.coerce.date().openapi({
		description: "Document creation date",
		format: "date-time",
	}),
	updatedAt: z.coerce.date().openapi({
		description: "Document last update date",
		format: "date-time",
	}),
})

export const MemorySearchResult = z.object({
	id: z.string().openapi({
		description: "Memory entry ID",
		example: "mem_abc123",
	}),
	memory: z.string().openapi({
		description: "The memory content",
		example: "John prefers machine learning over traditional programming",
	}),
	metadata: z
		.record(z.unknown())
		.nullable()
		.openapi({
			description: "Memory metadata",
			example: { source: "conversation", confidence: 0.9 },
		}),
	updatedAt: z.coerce.date().openapi({
		description: "Memory last update date",
		format: "date-time",
	}),
	similarity: z.number().openapi({
		description: "Similarity score between the query and memory entry",
		example: 0.89,
		maximum: 1,
		minimum: 0,
	}),
	version: z.number().nullable().optional().openapi({
		description: "Version number of this memory entry",
		example: 3,
	}),
	context: z
		.object({
			parents: z
				.array(
					z.object({
						relation: z.enum(["updates", "extends", "derives"]).openapi({
							description:
								"Relation type between this memory and its parent/child",
							example: "updates",
						}),
						version: z.number().nullable().optional().openapi({
							description:
								"Relative version distance from the primary memory (-1 for direct parent, -2 for grand-parent, etc.)",
							example: -1,
						}),
						memory: z.string().openapi({
							description: "The contextual memory content",
							example:
								"Earlier version: Dhravya is working on a patent at Cloudflare.",
						}),
						metadata: z.record(z.unknown()).nullable().optional().openapi({
							description: "Contextual memory metadata",
						}),
						updatedAt: z.coerce.date().openapi({
							description: "Contextual memory last update date",
							format: "date-time",
						}),
					}),
				)
				.optional(),
			children: z
				.array(
					z.object({
						relation: z.enum(["updates", "extends", "derives"]).openapi({
							description:
								"Relation type between this memory and its parent/child",
							example: "extends",
						}),
						version: z.number().nullable().optional().openapi({
							description:
								"Relative version distance from the primary memory (+1 for direct child, +2 for grand-child, etc.)",
							example: 1,
						}),
						memory: z.string().openapi({
							description: "The contextual memory content",
							example:
								"Later version: Dhravya has filed the patent successfully.",
						}),
						metadata: z.record(z.unknown()).nullable().optional().openapi({
							description: "Contextual memory metadata",
						}),
						updatedAt: z.coerce.date().openapi({
							description: "Contextual memory last update date",
							format: "date-time",
						}),
					}),
				)
				.optional(),
		})
		.optional()
		.openapi({
			description:
				"Object containing arrays of parent and child contextual memories",
		}),
	documents: z.array(MemorySearchDocumentSchema).optional().openapi({
		description: "Associated documents for this memory entry",
	}),
})

export const MemorySearchResponseSchema = z.object({
	results: z.array(MemorySearchResult).openapi({
		description: "Array of matching memory entries with similarity scores",
	}),
	timing: z.number().openapi({
		description: "Search execution time in milliseconds",
		example: 245,
	}),
	total: z.number().openapi({
		description: "Total number of results returned",
		example: 5,
	}),
})

export const ErrorResponseSchema = z.object({
	details: z.string().optional().openapi({
		description: "Additional error details",
		example: "Query must be at least 1 character long",
	}),
	error: z.string().openapi({
		description: "Error message",
		example: "Invalid request parameters",
	}),
})

export type SearchResult = z.infer<typeof SearchResultSchema>

export const SettingsRequestSchema = OrganizationSettingsSchema.omit({
	id: true,
	orgId: true,
	updatedAt: true,
})

export const ConnectionResponseSchema = z.object({
	createdAt: z.string().datetime(),
	documentLimit: z.number().optional(),
	email: z.string().optional(),
	expiresAt: z.string().datetime().optional(),
	id: z.string(),
	metadata: z.record(z.any()).optional(),
	provider: z.string(),
})

export const RequestTypeSchema = RequestTypeEnum

export const HourlyAnalyticsSchema = z.object({
	count: z.number(),
	hour: z.union([z.date(), z.string()]),
})

export const ApiKeyAnalyticsBaseSchema = z.object({
	count: z.number(),
	keyId: z.string(),
	keyName: z.string().nullable(),
	lastUsed: z.union([z.date(), z.string()]).nullable(),
})

export const AnalyticsUsageResponseSchema = z.object({
	byKey: z.array(
		ApiKeyAnalyticsBaseSchema.extend({
			avgDuration: z.number().optional(),
		}),
	),
	hourly: z.array(
		HourlyAnalyticsSchema.extend({
			avgDuration: z.number().optional(),
		}),
	),
	pagination: PaginationSchema,
	totalMemories: z.number(),
	usage: z.array(
		z.object({
			avgDuration: z.number().optional(),
			count: z.number(),
			lastUsed: z.union([z.date(), z.string()]).nullable(),
			type: RequestTypeSchema,
		}),
	),
})

export const AnalyticsErrorResponseSchema = z.object({
	byKey: z.array(
		ApiKeyAnalyticsBaseSchema.extend({
			errorCount: z.number(),
			errorRate: z.number(),
		}),
	),
	errors: z.array(
		z.object({
			count: z.number(),
			percentage: z.number(),
			statusCode: z.number(),
			type: RequestTypeSchema,
		}),
	),
	hourly: z.array(
		HourlyAnalyticsSchema.extend({
			errorCount: z.number(),
			errorRate: z.number(),
		}),
	),
	pagination: PaginationSchema,
	summary: z.array(
		z.object({
			errorRate: z.number(),
			lastRequest: z.union([z.date(), z.string()]).nullable(),
			successRate: z.number(),
			totalRequests: z.number(),
			type: RequestTypeSchema,
		}),
	),
})

export const AnalyticsLogSchema = z.object({
	createdAt: z.date(),
	duration: z.number(),
	id: z.string(),
	ingestion: z
		.object({
			createdAt: z.date(),
			metadata: z.record(z.unknown()),
			status: z.string(),
			summary: z.string(),
			title: z.string(),
			url: z.string(),
		})
		.optional(),
	input: z.record(z.unknown()),
	output: z.discriminatedUnion("type", [
		z.object({
			response: MemoryResponseSchema,
			type: z.literal("add"),
		}),
		z.object({
			response: SearchResponseSchema,
			type: z.literal("search"),
		}),
		z.object({
			response: z.object({
				success: z.boolean(),
			}),
			type: z.literal("delete"),
		}),
		z.object({
			response: MemoryResponseSchema,
			type: z.literal("update"),
		}),
	]),
	statusCode: z.number(),
	type: RequestTypeSchema,
})

export const AnalyticsLogsResponseSchema = z.object({
	logs: z.array(z.unknown()),
	pagination: PaginationSchema,
})

export const AnalyticsChatResponseSchema = z.object({
	analytics: z.object({
		apiUsage: z.object({
			current: z.number(),
			limit: z.number(),
		}),
		latency: z.object({
			current: z.number(),
			trend: z.array(z.number()),
			unit: z.literal("ms"),
		}),
		usage: z.object({
			currentDay: z.enum(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]),
			tokensByDay: z.object({
				Fri: z.number(),
				Mon: z.number(),
				Sat: z.number(),
				Sun: z.number(),
				Thu: z.number(),
				Tue: z.number(),
				Wed: z.number(),
			}),
		}),
	}),
	overview: z.object({
		"7d": z.object({
			amountSaved: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			tokensProcessed: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			tokensSent: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			totalTokensSaved: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
		}),
		"30d": z.object({
			amountSaved: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			tokensProcessed: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			tokensSent: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			totalTokensSaved: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
		}),
		"90d": z.object({
			amountSaved: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			tokensProcessed: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			tokensSent: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			totalTokensSaved: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
		}),
		lifetime: z.object({
			amountSaved: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			tokensProcessed: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			tokensSent: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
			totalTokensSaved: z.object({
				current: z.number(),
				previousPeriod: z.number(),
			}),
		}),
	}),
})

export const AnalyticsMemoryResponseSchema = z.object({
	connectionsGrowth: z.number(),
	memoriesGrowth: z.number(),
	searchGrowth: z.number(),
	searchQueries: z.number(),
	tokensGrowth: z.number(),
	tokensProcessed: z.number(),
	totalConnections: z.number(),
	totalMemories: z.number(),
})

export const MemoryEntryAPISchema = MemoryEntrySchema.extend({
	sourceAddedAt: z.date().nullable(), // From join relationship
	sourceRelevanceScore: z.number().nullable(), // From join relationship
	sourceMetadata: z.record(z.unknown()).nullable(), // From join relationship
	spaceContainerTag: z.string().nullable(), // From join relationship
}).openapi({
	description: "Memory entry with source relationship data",
})

// Extended document schema with memory entries
export const DocumentWithMemoriesSchema = z
	.object({
		id: DocumentSchema.shape.id,
		customId: DocumentSchema.shape.customId,
		contentHash: DocumentSchema.shape.contentHash,
		orgId: DocumentSchema.shape.orgId,
		userId: DocumentSchema.shape.userId,
		connectionId: DocumentSchema.shape.connectionId,
		title: DocumentSchema.shape.title,
		content: DocumentSchema.shape.content,
		summary: DocumentSchema.shape.summary,
		url: DocumentSchema.shape.url,
		source: DocumentSchema.shape.source,
		type: DocumentSchema.shape.type,
		status: DocumentSchema.shape.status,
		metadata: DocumentSchema.shape.metadata,
		processingMetadata: DocumentSchema.shape.processingMetadata,
		raw: DocumentSchema.shape.raw,
		tokenCount: DocumentSchema.shape.tokenCount,
		wordCount: DocumentSchema.shape.wordCount,
		chunkCount: DocumentSchema.shape.chunkCount,
		averageChunkSize: DocumentSchema.shape.averageChunkSize,
		summaryEmbedding: DocumentSchema.shape.summaryEmbedding,
		summaryEmbeddingModel: DocumentSchema.shape.summaryEmbeddingModel,
		createdAt: DocumentSchema.shape.createdAt,
		updatedAt: DocumentSchema.shape.updatedAt,
		memoryEntries: z.array(MemoryEntryAPISchema),
	})
	.openapi({
		description: "Document with associated memory entries",
	})

export const DocumentsWithMemoriesResponseSchema = z
	.object({
		documents: z.array(DocumentWithMemoriesSchema),
		pagination: PaginationSchema,
	})
	.openapi({
		description: "List of documents with their memory entries",
	})

export const DocumentsWithMemoriesQuerySchema = z
	.object({
		page: z.number().default(1).openapi({
			description: "Page number to fetch",
			example: 1,
		}),
		limit: z.number().default(10).openapi({
			description: "Number of items per page",
			example: 10,
		}),
		sort: z.enum(["createdAt", "updatedAt"]).default("createdAt").openapi({
			description: "Field to sort by",
			example: "createdAt",
		}),
		order: z.enum(["asc", "desc"]).default("desc").openapi({
			description: "Sort order",
			example: "desc",
		}),
		containerTags: z
			.array(z.string())
			.optional()
			.openapi({
				description: "Optional container tags to filter documents by",
				example: ["sm_project_default"],
			}),
	})
	.openapi({
		description: "Query parameters for listing documents with memory entries",
	})

export const MigrateMCPRequestSchema = z
	.object({
		userId: z.string().openapi({
			description: "User ID to migrate documents for",
			example: "user_123",
		}),
		projectId: z.string().default("default").openapi({
			description: "Project ID to migrate documents to",
			example: "school",
		}),
	})
	.openapi({
		description: "Request body for migrating MCP documents",
	})

export const MigrateMCPResponseSchema = z
	.object({
		success: z.boolean().openapi({
			description: "Whether the migration was successful",
			example: true,
		}),
		migratedCount: z.number().openapi({
			description: "Number of documents migrated",
			example: 5,
		}),
		message: z.string().openapi({
			description: "Status message",
			example: "Successfully migrated 5 documents",
		}),
		documentIds: z
			.array(z.string())
			.optional()
			.openapi({
				description: "IDs of migrated documents",
				example: ["doc_123", "doc_456", "doc_789"],
			}),
	})
	.openapi({
		description: "Response for MCP document migration",
	})

// Processing documents schema
export const ProcessingDocumentsResponseSchema = z
	.object({
		documents: z.array(
			MemorySchema.pick({
				id: true,
				customId: true,
				title: true,
				type: true,
				status: true,
				createdAt: true,
				updatedAt: true,
				metadata: true,
				containerTags: true,
			}),
		),
		totalCount: z.number().openapi({
			description: "Total number of processing documents",
			example: 5,
		}),
	})
	.openapi({
		description: "List of documents currently being processed",
		example: {
			documents: [
				{
					id: "doc_123",
					customId: "custom_123",
					title: "My Document",
					type: "text",
					status: "extracting",
					createdAt: "2024-12-27T12:00:00Z",
					updatedAt: "2024-12-27T12:01:00Z",
					metadata: {},
					containerTags: ["sm_project_default"],
				},
			],
			totalCount: 5,
		},
	})

// Project schemas
export const ProjectSchema = z
	.object({
		id: z.string().openapi({
			description: "Unique identifier of the project",
			example: "proj_abc123",
		}),
		name: z.string().openapi({
			description: "Display name of the project",
			example: "My Awesome Project",
		}),
		containerTag: z.string().openapi({
			description:
				"Container tag for organizing memories (format: sm_project_{name})",
			example: "sm_project_my_awesome_project",
		}),
		createdAt: z.string().openapi({
			description: "Creation timestamp",
			example: new Date().toISOString(),
			format: "date-time",
		}),
		updatedAt: z.string().openapi({
			description: "Last update timestamp",
			example: new Date().toISOString(),
			format: "date-time",
		}),
		isExperimental: z.boolean().openapi({
			description: "Whether the project (space) is in experimental mode",
			example: false,
		}),
		documentCount: z.number().optional().openapi({
			description: "Number of documents in this project",
			example: 42,
		}),
	})
	.openapi({
		description: "Project object for organizing memories",
	})

export const CreateProjectSchema = z
	.object({
		name: z.string().min(1).max(100).openapi({
			description: "Name for the project",
			example: "My Awesome Project",
			minLength: 1,
			maxLength: 100,
		}),
	})
	.openapi({
		description: "Request body for creating a new project",
	})

export const ListProjectsResponseSchema = z
	.object({
		projects: z.array(ProjectSchema).openapi({
			description: "List of projects",
		}),
	})
	.openapi({
		description: "Response containing list of projects",
	})

export const DeleteProjectSchema = z
	.object({
		action: z.enum(["move", "delete"]).openapi({
			description: "Action to perform on documents in the project",
			example: "move",
		}),
		targetProjectId: z.string().optional().openapi({
			description: "Target project ID when action is 'move'",
			example: "proj_xyz789",
		}),
	})
	.refine(
		(data) => {
			// If action is "move", targetProjectId is required
			if (data.action === "move") {
				return !!data.targetProjectId
			}
			return true
		},
		{
			message: "targetProjectId is required when action is 'move'",
			path: ["targetProjectId"],
		},
	)
	.openapi({
		description: "Request body for deleting a project",
	})

export const DeleteProjectResponseSchema = z
	.object({
		success: z.boolean().openapi({
			description: "Whether the deletion was successful",
			example: true,
		}),
		message: z.string().openapi({
			description: "Status message",
			example: "Project deleted successfully",
		}),
		documentsAffected: z.number().openapi({
			description: "Number of documents affected by the operation",
			example: 10,
		}),
		memoriesAffected: z.number().openapi({
			description: "Number of memories affected by the operation",
			example: 5,
		}),
	})
	.openapi({
		description: "Response for project deletion",
	})

// Bulk delete schema - supports both IDs and container tags
export const BulkDeleteMemoriesSchema = z
	.object({
		ids: z
			.array(z.string())
			.min(1)
			.max(100)
			.optional()
			.openapi({
				description: "Array of memory IDs to delete (max 100 at once)",
				example: ["acxV5LHMEsG2hMSNb4umbn", "bxcV5LHMEsG2hMSNb4umbn"],
			}),
		containerTags: z
			.array(z.string())
			.min(1)
			.optional()
			.openapi({
				description:
					"Array of container tags - all memories in these containers will be deleted",
				example: ["user_123", "project_123"],
			}),
	})
	.refine(
		(data) => {
			// At least one of ids or containerTags must be provided
			return !!data.ids?.length || !!data.containerTags?.length
		},
		{
			message: "Either 'ids' or 'containerTags' must be provided",
		},
	)
	.openapi({
		description:
			"Request body for bulk deleting memories by IDs or container tags",
		example: {
			ids: ["acxV5LHMEsG2hMSNb4umbn", "bxcV5LHMEsG2hMSNb4umbn"],
		},
	})

export const BulkDeleteMemoriesResponseSchema = z
	.object({
		success: z.boolean().openapi({
			description: "Whether the bulk deletion was successful",
			example: true,
		}),
		deletedCount: z.number().openapi({
			description: "Number of memories successfully deleted",
			example: 2,
		}),
		errors: z
			.array(
				z.object({
					id: z.string(),
					error: z.string(),
				}),
			)
			.optional()
			.openapi({
				description:
					"Array of errors for memories that couldn't be deleted (only applicable when deleting by IDs)",
			}),
		containerTags: z
			.array(z.string())
			.optional()
			.openapi({
				description:
					"Container tags that were processed (only applicable when deleting by container tags)",
				example: ["user_123", "project_123"],
			}),
	})
	.openapi({
		description: "Response for bulk memory deletion",
	})
