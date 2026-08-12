import { z } from "zod"
import {
	containerTagAccessSchema,
	paginationSchema,
	sessionScopeSchema,
} from "../../shared/types"

const documentStatusSchema = z.enum([
	"unknown",
	"queued",
	"extracting",
	"chunking",
	"embedding",
	"indexing",
	"done",
	"failed",
])

const documentTypeSchema = z.enum([
	"text",
	"pdf",
	"tweet",
	"google_doc",
	"google_slide",
	"google_sheet",
	"image",
	"video",
	"audio",
	"notion_doc",
	"webpage",
	"onedrive",
	"github_markdown",
])

const documentSummarySchema = z.object({
	id: z.string(),
	title: z.string().nullable(),
	type: documentTypeSchema,
	status: documentStatusSchema,
	createdAt: z.string(),
	updatedAt: z.string(),
	summary: z.string().nullable(),
})

const memoryHistorySchema = z.object({
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

const memoryEntryOutputSchema = z.object({
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
	history: z.array(memoryHistorySchema).optional(),
})

export const addMemoryOutputSchema = z.object({
	action: z.enum(["save", "forget"]),
	success: z.boolean(),
	containerTag: z.string(),
	message: z.string(),
	id: z.string().optional(),
	status: z.string().optional(),
})

export type AddMemoryOutput = z.infer<typeof addMemoryOutputSchema>

export const getDocumentOutputSchema = z.object({
	document: z.object({
		id: z.string(),
		title: z.string().nullable(),
		type: documentTypeSchema,
		status: documentStatusSchema,
		createdAt: z.string(),
		updatedAt: z.string(),
		url: z.string().nullable(),
		summary: z.string().nullable(),
		content: z.string().nullable(),
		contentTruncated: z.boolean(),
	}),
})

export type GetDocumentOutput = z.infer<typeof getDocumentOutputSchema>

export const listDocumentsOutputSchema = z.object({
	documents: z.array(documentSummarySchema),
	pagination: paginationSchema,
})

export type ListDocumentsOutput = z.infer<typeof listDocumentsOutputSchema>

export const listMemoriesOutputSchema = z.object({
	memoryEntries: z.array(memoryEntryOutputSchema),
	pagination: paginationSchema,
})

export type ListMemoriesOutput = z.infer<typeof listMemoriesOutputSchema>

export const searchMemoryOutputSchema = z.object({
	query: z.string(),
	containerTag: z.string(),
	profile: z
		.object({
			static: z.array(z.string()),
			dynamic: z.array(z.string()),
		})
		.optional(),
	results: z.array(
		z.object({
			id: z.string(),
			text: z.string(),
			similarity: z.number(),
			title: z.string().optional(),
		}),
	),
	total: z.number(),
	timing: z.number(),
})

export type SearchMemoryOutput = z.infer<typeof searchMemoryOutputSchema>

export const whoAmIOutputSchema = z.object({
	userId: z.string(),
	email: z.string().optional(),
	name: z.string().optional(),
	role: z.string(),
	accessType: z.enum(["full", "restricted"]),
	activeSpace: z.string().nullable(),
	assignedSpaces: z.array(containerTagAccessSchema).nullable(),
	scope: sessionScopeSchema.optional(),
	client: z
		.object({
			name: z.string(),
			version: z.string().optional(),
		})
		.optional(),
	sessionId: z.string().optional(),
})

export type WhoAmIOutput = z.infer<typeof whoAmIOutputSchema>
