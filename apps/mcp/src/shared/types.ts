import { z } from "zod"

// Shared types — imported by both server tools and widget views.
// Single source of truth for the server↔widget contract.

export const namespaceAccessSchema = z.object({
	namespace: z.string(),
	containerTag: z.string().optional(),
	permission: z.enum(["read", "write"]),
})

export type NamespaceAccess = z.infer<typeof namespaceAccessSchema>

// /v3/session has no v5 replacement and still sends container-tag field names.
const sessionNamespaceAccessSchema = z
	.object({ containerTag: z.string(), permission: z.enum(["read", "write"]) })
	.transform(({ containerTag, permission }) => ({
		namespace: containerTag,
		permission,
	}))

export const sessionScopeSchema = z.looseObject({
	type: z.enum(["full", "scoped"]),
	permission: z.enum(["read", "write"]).optional(),
	tag: z.string().optional(),
	tags: z.array(z.string()).optional(),
	rateLimit: z.number().optional(),
	expires: z.string().optional(),
})

export type SessionScope = z.infer<typeof sessionScopeSchema>

export const sessionInfoSchema = z
	.looseObject({
		user: z.looseObject({
			id: z.string().min(1),
			email: z.string().optional(),
			name: z.string().optional(),
		}),
		org: z.looseObject({ id: z.string().min(1) }).optional(),
		role: z.string().optional(),
		accessType: z.enum(["full", "restricted"]).optional(),
		containerTags: z.array(sessionNamespaceAccessSchema).nullable().optional(),
		scope: sessionScopeSchema.optional(),
	})
	.transform(
		({
			containerTags,
			...session
		}): typeof session & { namespaces?: NamespaceAccess[] | null } => ({
			...session,
			namespaces: containerTags,
		}),
	)

export type SessionInfo = z.output<typeof sessionInfoSchema>

export const namespaceInfoSchema = z.object({
	id: z.string(),
	namespace: z.string(),
	containerTag: z.string().optional(),
	description: z.string().nullish(),
	documentCount: z.number().int().nonnegative(),
	memoryCount: z.number().int().nonnegative(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

export type NamespaceInfo = z.infer<typeof namespaceInfoSchema>

export const spaceSummarySchema = z.object({
	namespace: z.string(),
	containerTag: z.string().optional(),
	description: z.string().nullish(),
	documentCount: z.number().int().nonnegative(),
	memoryCount: z.number().int().nonnegative(),
	updatedAt: z.string(),
})

export const listSpacesOutputSchema = z.object({
	spaces: z.array(spaceSummarySchema),
	count: z.number().int().nonnegative(),
})

export const memoryRelationSchema = z.enum(["updates", "extends", "derives"])

export const documentMemoryEntrySchema = z.looseObject({
	id: z.string(),
	memory: z.string(),
	spaceId: z.string(),
	isStatic: z.boolean().nullish(),
	isLatest: z.boolean().nullish(),
	isForgotten: z.boolean().nullish(),
	forgetAfter: z.string().nullish(),
	forgetReason: z.string().nullish(),
	version: z.number().nullish(),
	parentMemoryId: z.string().nullish(),
	rootMemoryId: z.string().nullish(),
	memoryRelations: z.record(z.string(), memoryRelationSchema).nullish(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

export type DocumentMemoryEntry = z.infer<typeof documentMemoryEntrySchema>

export const documentWithMemoriesSchema = z.looseObject({
	id: z.string(),
	title: z.string().nullish(),
	summary: z.string().nullish(),
	type: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
	memoryEntries: z.array(documentMemoryEntrySchema),
})

export type DocumentWithMemories = z.infer<typeof documentWithMemoriesSchema>

export const paginationSchema = z.object({
	currentPage: z.number().int().nonnegative(),
	limit: z.number().int().nonnegative(),
	totalItems: z.number().int().nonnegative(),
	totalPages: z.number().int().nonnegative(),
})

export const documentsApiResponseSchema = z.object({
	documents: z.array(documentWithMemoriesSchema),
	pagination: paginationSchema,
})

export type DocumentsApiResponse = z.infer<typeof documentsApiResponseSchema>

// Shared by the client and the list_memories output schema so the two can't drift.
export const memoryEntryHistorySchema = z.object({
	id: z.string(),
	memory: z.string(),
	version: z.number(),
	createdAt: z.string(),
	updatedAt: z.string(),
	parentMemoryId: z.string().nullish(),
	rootMemoryId: z.string().nullish(),
	isLatest: z.boolean().optional(),
	isForgotten: z.boolean().optional(),
})

export type MemoryEntryHistory = z.infer<typeof memoryEntryHistorySchema>

export const memoryEntrySchema = z.object({
	id: z.string(),
	memory: z.string(),
	version: z.number(),
	isLatest: z.boolean(),
	isForgotten: z.boolean(),
	isStatic: z.boolean().optional(),
	isInference: z.boolean().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
	sourceCount: z.number().optional(),
	documentIds: z.array(z.string()).optional(),
	history: z.array(memoryEntryHistorySchema).optional(),
})

export type MemoryEntry = z.infer<typeof memoryEntrySchema>

export const memoriesListSchema = z.object({
	memoryEntries: z.array(memoryEntrySchema),
	pagination: paginationSchema,
})

export type MemoriesList = z.infer<typeof memoriesListSchema>

// ViewMessage — discriminated union returned by app tools as `structuredContent`.
// The widget uses an exhaustive switch on `view` to dispatch to the correct view component.
// Adding a new view here is a compile error in App.tsx until the case is handled.
const viewIdSchema = z.string().uuid().optional()

export const pickerViewSchema = z.object({
	view: z.literal("picker"),
	viewId: viewIdSchema,
	namespaces: z.array(namespaceInfoSchema),
	activeNamespace: z.string().nullish(),
	assignedNamespaces: z.array(namespaceAccessSchema).nullable().optional(),
	containerTags: z.array(namespaceInfoSchema).optional(),
	activeTag: z.string().nullish(),
	assignedTags: z.array(namespaceAccessSchema).nullable().optional(),
})

export const confirmationViewSchema = z.object({
	view: z.literal("confirmation"),
	viewId: viewIdSchema,
	namespace: z.string(),
	containerTag: z.string().optional(),
})

export const saveViewSchema = z.object({
	view: z.literal("save"),
	viewId: viewIdSchema,
	activeNamespace: z.string().nullish(),
	writableNamespaces: z.array(z.string()),
	prefill: z.string().optional(),
	activeTag: z.string().nullish(),
	writableTags: z.array(z.string()).optional(),
})

export const saveSuccessViewSchema = z.object({
	view: z.literal("save-success"),
	viewId: viewIdSchema,
	id: z.string(),
	namespace: z.string(),
	containerTag: z.string().optional(),
})

export const uploadViewSchema = z.object({
	view: z.literal("upload"),
	viewId: viewIdSchema,
	activeNamespace: z.string().nullish(),
	writableNamespaces: z.array(z.string()),
	activeTag: z.string().nullish(),
	writableTags: z.array(z.string()).optional(),
})

export const uploadSuccessViewSchema = z.object({
	view: z.literal("upload-success"),
	viewId: viewIdSchema,
	id: z.string(),
	fileName: z.string(),
	namespace: z.string(),
	containerTag: z.string().optional(),
})

export const uploadPreparationSchema = z.object({
	uploadUrl: z.string().url(),
	uploadToken: z.string().min(1),
	expiresAt: z.number().int().positive(),
})

export const uploadResponseSchema = z.object({
	id: z.string(),
	status: z.string(),
})

export const graphViewSchema = z.object({
	view: z.literal("graph"),
	viewId: viewIdSchema,
	namespace: z.string().optional(),
	containerTag: z.string().optional(),
	documents: z.array(documentWithMemoriesSchema),
	totalCount: z.number().int().nonnegative(),
	documentCount: z.number().int().nonnegative(),
	memoryCount: z.number().int().nonnegative(),
	totalDocumentCount: z.number().int().nonnegative(),
	truncated: z.boolean(),
	rendered: z.literal(true),
})

export const viewMessageSchema = z.discriminatedUnion("view", [
	pickerViewSchema,
	confirmationViewSchema,
	saveViewSchema,
	saveSuccessViewSchema,
	uploadViewSchema,
	uploadSuccessViewSchema,
	graphViewSchema,
])

export type ViewMessage = z.infer<typeof viewMessageSchema>

export type ViewName = ViewMessage["view"]
