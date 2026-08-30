import { z } from "zod"
import {
	containerTagAccessSchema,
	memoriesListSchema,
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

// Reuse the shared schema so the tool's output contract stays identical to what
// the client parses — the two can't drift.
export const listMemoriesOutputSchema = memoriesListSchema

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

export const searchDocumentsOutputSchema = z.object({
	query: z.string(),
	containerTag: z.string(),
	results: z.array(
		z.object({
			id: z.string(),
			text: z.string(),
			similarity: z.number(),
			title: z.string().optional(),
			type: z.string().optional(),
		}),
	),
	total: z.number(),
	timing: z.number(),
})

export type SearchDocumentsOutput = z.infer<typeof searchDocumentsOutputSchema>

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
})

export type WhoAmIOutput = z.infer<typeof whoAmIOutputSchema>
