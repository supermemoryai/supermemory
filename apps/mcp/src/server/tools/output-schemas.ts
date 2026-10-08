import { z } from "zod"
import { legacyNamespaceOutput } from "./compat"
import {
	namespaceAccessSchema,
	memoriesListSchema,
	paginationSchema,
	sessionScopeSchema,
} from "../../shared/types"

const documentSummarySchema = z.object({
	id: z.string(),
	title: z.string().nullable(),
	type: z.string(),
	status: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
	summary: z.string().nullable(),
})

export const addMemoryOutputSchema = z.object({
	action: z.enum(["save", "forget"]),
	success: z.boolean(),
	namespace: z.string(),
	...legacyNamespaceOutput,
	message: z.string(),
	id: z.string().optional(),
	status: z.string().optional(),
})

export type AddMemoryOutput = z.infer<typeof addMemoryOutputSchema>

export const getDocumentOutputSchema = z.object({
	namespace: z.string(),
	...legacyNamespaceOutput,
	document: z.object({
		id: z.string(),
		title: z.string().nullable(),
		type: z.string(),
		status: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
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

export const listMemoriesOutputSchema = memoriesListSchema

export type ListMemoriesOutput = z.infer<typeof listMemoriesOutputSchema>

export const searchMemoryOutputSchema = z.object({
	query: z.string(),
	namespace: z.string(),
	...legacyNamespaceOutput,
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

export const getProfileOutputSchema = z.object({
	namespace: z.string(),
	...legacyNamespaceOutput,
	profile: z.object({
		static: z.array(z.string()),
		dynamic: z.array(z.string()),
	}),
})

export type GetProfileOutput = z.infer<typeof getProfileOutputSchema>

export const whoAmIOutputSchema = z.object({
	userId: z.string(),
	email: z.string().optional(),
	name: z.string().optional(),
	role: z.string(),
	accessType: z.enum(["full", "restricted"]),
	activeSpace: z.string().nullable(),
	assignedSpaces: z.array(namespaceAccessSchema).nullable(),
	scope: sessionScopeSchema.optional(),
	client: z
		.object({
			name: z.string(),
			version: z.string().optional(),
		})
		.optional(),
})

export type WhoAmIOutput = z.infer<typeof whoAmIOutputSchema>
