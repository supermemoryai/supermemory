import { z } from "zod"

export const MetadataSchema = z.record(
	z.union([z.string(), z.number(), z.boolean()]),
)
export type Metadata = z.infer<typeof MetadataSchema>

export const VisibilityEnum = z.enum(["public", "private", "unlisted"])
export type Visibility = z.infer<typeof VisibilityEnum>

export const DocumentTypeEnum = z.enum([
	"text",
	"pdf",
	"tweet",
	"google_doc",
	"google_slide",
	"google_sheet",
	"image",
	"video",
	"notion_doc",
	"webpage",
	"onedrive",
])
export type DocumentType = z.infer<typeof DocumentTypeEnum>

export const DocumentStatusEnum = z.enum([
	"unknown",
	"queued",
	"extracting",
	"chunking",
	"embedding",
	"indexing",
	"done",
	"failed",
])
export type DocumentStatus = z.infer<typeof DocumentStatusEnum>

export const ProcessingStepSchema = z.object({
	name: z.string(),
	startTime: z.number(),
	endTime: z.number().optional(),
	status: z.enum(["completed", "failed", "pending"]),
	error: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
	finalStatus: z.enum(["done", "failed"]).optional(),
})
export type ProcessingStep = z.infer<typeof ProcessingStepSchema>

export const ProcessingMetadataSchema = z.object({
	startTime: z.number(),
	endTime: z.number().optional(),
	duration: z.number().optional(),
	error: z.string().optional(),
	finalStatus: z.enum(["completed", "failed", "done"]).optional(),
	chunkingStrategy: z.string().optional(),
	tokenCount: z.number().optional(),
	steps: z.array(ProcessingStepSchema),
})
export type ProcessingMetadata = z.infer<typeof ProcessingMetadataSchema>

export const DocumentSchema = z.object({
	id: z.string(),
	customId: z.string().nullable().optional(),
	contentHash: z.string().nullable().optional(),

	// Organization and ownership
	orgId: z.string(),
	userId: z.string(),
	connectionId: z.string().nullable().optional(),

	// Content fields
	title: z.string().nullable().optional(),
	content: z.string().nullable().optional(),
	summary: z.string().nullable().optional(),
	url: z.string().nullable().optional(),
	source: z.string().nullable().optional(),
	type: DocumentTypeEnum.default("text"),
	status: DocumentStatusEnum.default("unknown"),

	// Metadata and processing
	metadata: MetadataSchema.nullable().optional(),
	processingMetadata: ProcessingMetadataSchema.nullable().optional(),
	raw: z.any().nullable().optional(), // bytea in DB
	ogImage: z.string().nullable().optional(),

	// Content statistics
	tokenCount: z.number().nullable().optional(),
	wordCount: z.number().nullable().optional(),
	chunkCount: z.number().default(0),
	averageChunkSize: z.number().nullable().optional(),

	summaryEmbedding: z.array(z.number()).nullable().optional(),
	summaryEmbeddingModel: z.string().nullable().optional(),
	summaryEmbeddingNew: z.array(z.number()).nullable().optional(),
	summaryEmbeddingModelNew: z.string().nullable().optional(),

	// Timestamps
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})
export type Document = z.infer<typeof DocumentSchema>

export const ChunkTypeEnum = z.enum(["text", "image"])
export type ChunkType = z.infer<typeof ChunkTypeEnum>

export const ChunkSchema = z.object({
	id: z.string(),
	documentId: z.string(),
	content: z.string(),
	embeddedContent: z.string().nullable().optional(),
	type: ChunkTypeEnum.default("text"),
	position: z.number(),
	metadata: MetadataSchema.nullable().optional(),

	embedding: z.array(z.number()).nullable().optional(),
	embeddingModel: z.string().nullable().optional(),
	embeddingNew: z.array(z.number()).nullable().optional(),
	embeddingNewModel: z.string().nullable().optional(),
	matryokshaEmbedding: z.array(z.number()).nullable().optional(),
	matryokshaEmbeddingModel: z.string().nullable().optional(),

	createdAt: z.coerce.date(),
})
export type Chunk = z.infer<typeof ChunkSchema>

export const ConnectionProviderEnum = z.enum([
	"notion",
	"google-drive",
	"onedrive",
])
export type ConnectionProvider = z.infer<typeof ConnectionProviderEnum>

export const ConnectionStateSchema = z.object({
	stateToken: z.string(),
	provider: ConnectionProviderEnum,
	orgId: z.string(),
	userId: z.string(),
	connectionId: z.string(),
	documentLimit: z.number().default(10000),
	redirectUrl: z.string().nullable().optional(),
	metadata: MetadataSchema,
	containerTags: z.array(z.string()).nullable().optional(),
	createdAt: z.coerce.date(),
	expiresAt: z.coerce.date().nullable().optional(),
})
export type ConnectionState = z.infer<typeof ConnectionStateSchema>

export const ConnectionSchema = z.object({
	id: z.string(),
	provider: ConnectionProviderEnum,
	orgId: z.string(),
	userId: z.string(),
	email: z.string().nullable().optional(),
	documentLimit: z.number().default(10000),
	containerTags: z.array(z.string()).nullable().optional(),

	// Token management
	accessToken: z.string().nullable().optional(),
	refreshToken: z.string().nullable().optional(),
	expiresAt: z.coerce.date().nullable().optional(),

	// Provider-specific metadata
	metadata: z.record(z.unknown()),

	createdAt: z.coerce.date(),
})
export type Connection = z.infer<typeof ConnectionSchema>

export const RequestTypeEnum = z.enum([
	"add",
	"search",
	"fast_search",
	"request",
	"update",
	"delete",
	"chat",
	"search_v4",
])
export type RequestType = z.infer<typeof RequestTypeEnum>

export const ApiRequestSchema = z.object({
	id: z.string(),
	type: RequestTypeEnum,
	orgId: z.string(),
	userId: z.string(),
	keyId: z.string().nullable().optional(),
	statusCode: z.number(),
	duration: z.number().nullable().optional(), // duration in ms

	// Request/Response data
	input: z.record(z.unknown()).nullable().optional(),
	output: z.record(z.unknown()).nullable().optional(),

	// Token usage tracking
	originalTokens: z.number().nullable().optional(),
	finalTokens: z.number().nullable().optional(),
	tokensSaved: z.number().nullable().optional(), // computed field

	// Cost tracking
	costSavedUSD: z.number().nullable().optional(),

	// Chat specific fields
	model: z.string().nullable().optional(),
	provider: z.string().nullable().optional(),
	conversationId: z.string().nullable().optional(),

	// Flags
	contextModified: z.boolean().default(false),

	// Metadata
	metadata: MetadataSchema.nullable().optional(),
	origin: z.string().default("api"),

	createdAt: z.coerce.date(),
})
export type ApiRequest = z.infer<typeof ApiRequestSchema>

export const SpaceSchema = z.object({
	id: z.string(),
	name: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	orgId: z.string(),
	ownerId: z.string(),
	containerTag: z.string().nullable().optional(),
	visibility: VisibilityEnum.default("private"),
	isExperimental: z.boolean().default(false),

	// Content indexing
	contentTextIndex: z.record(z.unknown()).default({}), // KnowledgeBase type
	indexSize: z.number().nullable().optional(),

	metadata: MetadataSchema.nullable().optional(),

	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})
export type Space = z.infer<typeof SpaceSchema>

export const MemoryRelationEnum = z.enum(["updates", "extends", "derives"])
export type MemoryRelation = z.infer<typeof MemoryRelationEnum>

export const MemoryEntrySchema = z.object({
	id: z.string(),
	memory: z.string(), // The actual memory content
	spaceId: z.string(),
	orgId: z.string(),
	userId: z.string().nullable().optional(),

	// Version control
	version: z.number().default(1),
	isLatest: z.boolean().default(true),
	parentMemoryId: z.string().nullable().optional(),
	rootMemoryId: z.string().nullable().optional(),

	// Memory relationships
	memoryRelations: z.record(MemoryRelationEnum).default({}),

	// Source tracking
	sourceCount: z.number().default(1),

	// Status flags
	isInference: z.boolean().default(false),
	isForgotten: z.boolean().default(false),
	forgetAfter: z.coerce.date().nullable().optional(),
	forgetReason: z.string().nullable().optional(),

	// Embeddings
	memoryEmbedding: z.array(z.number()).nullable().optional(),
	memoryEmbeddingModel: z.string().nullable().optional(),
	memoryEmbeddingNew: z.array(z.number()).nullable().optional(),
	memoryEmbeddingNewModel: z.string().nullable().optional(),

	metadata: z.record(z.unknown()).nullable().optional(),

	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>

export const DocumentsToSpacesSchema = z.object({
	documentId: z.string(),
	spaceId: z.string(),
})
export type DocumentsToSpaces = z.infer<typeof DocumentsToSpacesSchema>

export const MemoryDocumentSourceSchema = z.object({
	memoryEntryId: z.string(),
	documentId: z.string(),
	relevanceScore: z.number().default(100),
	metadata: z.record(z.unknown()).nullable().optional(),
	addedAt: z.coerce.date(),
})
export type MemoryDocumentSource = z.infer<typeof MemoryDocumentSourceSchema>

export const SpaceRoleEnum = z.enum(["owner", "admin", "editor", "viewer"])
export type SpaceRole = z.infer<typeof SpaceRoleEnum>

export const SpacesToMembersSchema = z.object({
	spaceId: z.string(),
	userId: z.string(),
	role: SpaceRoleEnum.default("viewer"),
	metadata: MetadataSchema.nullable().optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})
export type SpacesToMembers = z.infer<typeof SpacesToMembersSchema>

export const OrganizationSettingsSchema = z.object({
	id: z.string(),
	orgId: z.string(),

	// LLM Filtering
	shouldLLMFilter: z.boolean().default(false),
	filterPrompt: z.string().nullable().optional(),
	includeItems: z.array(z.string()).nullable().optional(),
	excludeItems: z.array(z.string()).nullable().optional(),

	// Google Drive custom keys
	googleDriveCustomKeyEnabled: z.boolean().default(false),
	googleDriveClientId: z.string().nullable().optional(),
	googleDriveClientSecret: z.string().nullable().optional(),

	// Notion custom keys
	notionCustomKeyEnabled: z.boolean().default(false),
	notionClientId: z.string().nullable().optional(),
	notionClientSecret: z.string().nullable().optional(),

	// OneDrive custom keys
	onedriveCustomKeyEnabled: z.boolean().default(false),
	onedriveClientId: z.string().nullable().optional(),
	onedriveClientSecret: z.string().nullable().optional(),

	updatedAt: z.coerce.date(),
})
export type OrganizationSettings = z.infer<typeof OrganizationSettingsSchema>

export const schemas = {
	// Base types
	MetadataSchema,
	VisibilityEnum,

	// Content
	DocumentTypeEnum,
	DocumentStatusEnum,
	ProcessingStepSchema,
	ProcessingMetadataSchema,
	DocumentSchema,
	ChunkTypeEnum,
	ChunkSchema,

	// Connections
	ConnectionProviderEnum,
	ConnectionStateSchema,
	ConnectionSchema,

	// Analytics
	RequestTypeEnum,
	ApiRequestSchema,

	// Spaces and Memory
	SpaceSchema,
	MemoryRelationEnum,
	MemoryEntrySchema,
	DocumentsToSpacesSchema,
	MemoryDocumentSourceSchema,
	SpaceRoleEnum,
	SpacesToMembersSchema,

	// Auth
	OrganizationSettingsSchema,
} as const
