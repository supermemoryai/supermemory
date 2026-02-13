"use client"

import {
	useMutation,
	useQueryClient,
	type QueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { $fetch } from "@lib/api"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { useAuth } from "@lib/auth-context"
import { analytics } from "@/lib/analytics"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>

interface DocumentWithId {
	id?: string
	customId?: string | null
}

interface DocumentsQueryData {
	documents: DocumentWithId[]
	totalCount: number
}

type InfiniteQueryData = {
	pages: DocumentsResponse[]
	pageParams: number[]
}

type QueryData = DocumentsQueryData | InfiniteQueryData

interface UseDocumentMutationsOptions {
	onClose?: () => void
}

interface OptimisticMemory {
	id: string
	content: string
	url: string | null
	title: string
	description: string
	containerTags: string[]
	createdAt: string
	updatedAt: string
	status: string
	type: string
	metadata: Record<string, unknown>
	memoryEntries: unknown[]
	isOptimistic?: boolean
}

function addOptimisticMemoryToQueryData(
	old: unknown,
	memory: OptimisticMemory,
): unknown {
	if (!old || typeof old !== "object") return old

	const data = old as Record<string, unknown>

	if ("pages" in data && Array.isArray(data.pages)) {
		return {
			...data,
			pages: data.pages.map((page: unknown, index: number) => {
				if (index !== 0) return page
				const p = page as Record<string, unknown>
				if (!p?.documents || !Array.isArray(p.documents)) return page
				return {
					...p,
					documents: [memory, ...p.documents],
					pagination: p.pagination
						? {
								...(p.pagination as Record<string, unknown>),
								totalItems:
									((p.pagination as Record<string, number>).totalItems ?? 0) +
									1,
							}
						: p.pagination,
				}
			}),
		}
	}

	if ("documents" in data && Array.isArray(data.documents)) {
		return {
			...data,
			documents: [memory, ...data.documents],
			totalCount: ((data.totalCount as number) ?? 0) + 1,
		}
	}

	return old
}

function removeDocumentFromQueryData(
	old: unknown,
	documentId: string,
): unknown {
	if (!old || typeof old !== "object") return old

	const data = old as Record<string, unknown>

	if ("pages" in data && Array.isArray(data.pages)) {
		return {
			...data,
			pages: data.pages.map((page: unknown) => {
				const p = page as Record<string, unknown>
				if (!p?.documents || !Array.isArray(p.documents)) return page
				return {
					...p,
					documents: (p.documents as DocumentWithId[]).filter(
						(doc) => doc.id !== documentId && doc.customId !== documentId,
					),
					pagination: p.pagination
						? {
								...(p.pagination as Record<string, unknown>),
								totalItems: Math.max(
									0,
									((p.pagination as Record<string, number>).totalItems ?? 0) -
										1,
								),
							}
						: p.pagination,
				}
			}),
		}
	}

	if ("documents" in data && Array.isArray(data.documents)) {
		return {
			...data,
			documents: (data.documents as DocumentWithId[]).filter(
				(doc) => doc.id !== documentId && doc.customId !== documentId,
			),
			totalCount: Math.max(0, ((data.totalCount as number) ?? 0) - 1),
		}
	}

	return old
}

async function cancelAndSnapshotQueries(
	queryClient: QueryClient,
): Promise<[unknown, unknown][]> {
	await queryClient.cancelQueries({ queryKey: ["documents-with-memories"] })
	return queryClient.getQueriesData({ queryKey: ["documents-with-memories"] })
}

function restoreQueriesFromSnapshot(
	queryClient: QueryClient,
	previousQueries: [unknown, unknown][] | undefined,
): void {
	if (!previousQueries) return
	for (const [queryKey, data] of previousQueries) {
		queryClient.setQueryData(queryKey as unknown[], data)
	}
}

export function useDocumentMutations({
	onClose,
}: UseDocumentMutationsOptions = {}) {
	const queryClient = useQueryClient()
	const { user } = useAuth()

	const entityContext = `This is ${user?.name ?? "a user"}, saving items in a personal knowledge management system. This may be websites, links, notes, journals, PDFs, etc. Understand the user from it into a graph.`

	const noteMutation = useMutation({
		mutationFn: async ({
			content,
			project,
		}: {
			content: string
			project: string
		}) => {
			const response = await $fetch("@post/documents", {
				body: {
					content,
					containerTags: [project],
					entityContext,
					metadata: { sm_source: "consumer" },
				},
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to add note")
			}

			return response.data
		},
		onMutate: async ({ content, project }) => {
			const previousQueries = await cancelAndSnapshotQueries(queryClient)
			const now = new Date().toISOString()

			const optimisticMemory: OptimisticMemory = {
				id: `temp-${crypto.randomUUID()}`,
				content,
				url: null,
				title: content.substring(0, 100),
				description: "Processing content...",
				containerTags: [project],
				createdAt: now,
				updatedAt: now,
				status: "queued",
				type: "note",
				metadata: {
					processingStage: "queued",
					processingMessage: "Added to processing queue",
				},
				memoryEntries: [],
				isOptimistic: true,
			}

			queryClient.setQueriesData(
				{ queryKey: ["documents-with-memories"] },
				(old) => addOptimisticMemoryToQueryData(old, optimisticMemory),
			)

			return { previousQueries }
		},
		onError: (error, _variables, context) => {
			restoreQueriesFromSnapshot(queryClient, context?.previousQueries)
			toast.error("Failed to add note", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSuccess: (_data, variables) => {
			analytics.documentAdded({ type: "note", project_id: variables.project })
			toast.success("Note added successfully!", {
				description: "Your note is being processed",
			})
			queryClient.invalidateQueries({ queryKey: ["documents-with-memories"] })
			onClose?.()
		},
	})

	const linkMutation = useMutation({
		mutationFn: async ({ url, project }: { url: string; project: string }) => {
			const response = await $fetch("@post/documents", {
				body: {
					content: url,
					containerTags: [project],
					entityContext,
					metadata: { sm_source: "consumer" },
				},
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to add link")
			}

			return response.data
		},
		onMutate: async ({ url, project }) => {
			const previousQueries = await cancelAndSnapshotQueries(queryClient)
			const now = new Date().toISOString()

			const optimisticMemory: OptimisticMemory = {
				id: `temp-${crypto.randomUUID()}`,
				content: "",
				url,
				title: "Processing...",
				description: "Extracting content...",
				containerTags: [project],
				createdAt: now,
				updatedAt: now,
				status: "queued",
				type: "link",
				metadata: {
					processingStage: "queued",
					processingMessage: "Added to processing queue",
				},
				memoryEntries: [],
				isOptimistic: true,
			}

			queryClient.setQueriesData(
				{ queryKey: ["documents-with-memories"] },
				(old) => addOptimisticMemoryToQueryData(old, optimisticMemory),
			)

			return { previousQueries }
		},
		onError: (error, _variables, context) => {
			restoreQueriesFromSnapshot(queryClient, context?.previousQueries)
			toast.error("Failed to add link", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSuccess: (_data, variables) => {
			analytics.documentAdded({ type: "link", project_id: variables.project })
			toast.success("Link added successfully!", {
				description: "Your link is being processed",
			})
			queryClient.invalidateQueries({ queryKey: ["documents-with-memories"] })
			onClose?.()
		},
	})

	const fileMutation = useMutation({
		mutationFn: async ({
			file,
			title,
			description,
			project,
		}: {
			file: File
			title?: string
			description?: string
			project: string
		}) => {
			const formData = new FormData()
			formData.append("file", file)
			formData.append("containerTags", JSON.stringify([project]))
			formData.append("entityContext", entityContext)
			formData.append("metadata", JSON.stringify({ sm_source: "consumer" }))

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/v3/documents/file`,
				{
					method: "POST",
					body: formData,
					credentials: "include",
				},
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || "Failed to upload file")
			}

			const data = await response.json()

			if (title || description) {
				await $fetch(`@patch/documents/${data.id}`, {
					body: {
						metadata: {
							...(title && { title }),
							...(description && { description }),
							sm_source: "consumer",
						},
					},
				})
			}

			return data
		},
		onMutate: async ({ file, title, description, project }) => {
			const previousQueries = await cancelAndSnapshotQueries(queryClient)
			const now = new Date().toISOString()

			const optimisticMemory: OptimisticMemory = {
				id: `temp-file-${crypto.randomUUID()}`,
				content: "",
				url: null,
				title: title || file.name,
				description: description || `Uploading ${file.name}...`,
				containerTags: [project],
				createdAt: now,
				updatedAt: now,
				status: "processing",
				type: "file",
				metadata: {
					fileName: file.name,
					fileSize: file.size,
					mimeType: file.type,
				},
				memoryEntries: [],
			}

			queryClient.setQueriesData(
				{ queryKey: ["documents-with-memories"] },
				(old) => addOptimisticMemoryToQueryData(old, optimisticMemory),
			)

			return { previousQueries }
		},
		onError: (error, _variables, context) => {
			restoreQueriesFromSnapshot(queryClient, context?.previousQueries)
			toast.error("Failed to upload file", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSuccess: (_data, variables) => {
			analytics.documentAdded({ type: "file", project_id: variables.project })
			toast.success("File uploaded successfully!", {
				description: "Your file is being processed",
			})
			queryClient.invalidateQueries({ queryKey: ["documents-with-memories"] })
			onClose?.()
		},
	})

	const updateMutation = useMutation({
		mutationFn: async ({
			documentId,
			content,
		}: {
			documentId: string
			content: string
		}) => {
			const response = await $fetch(`@patch/documents/${documentId}`, {
				body: {
					content,
					metadata: { sm_source: "consumer" },
				},
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to save document")
			}

			return response.data
		},
		onSuccess: (_data, variables) => {
			analytics.documentEdited({ document_id: variables.documentId })
			toast.success("Document saved successfully!")
			queryClient.invalidateQueries({ queryKey: ["documents-with-memories"] })
		},
		onError: (error) => {
			toast.error("Failed to save document", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const deleteMutation = useMutation({
		mutationFn: async ({ documentId }: { documentId: string }) => {
			const response = await $fetch("@delete/documents/:id", {
				params: { id: documentId },
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to delete document")
			}

			return response.data
		},
		onMutate: async ({ documentId }) => {
			const previousQueries = await cancelAndSnapshotQueries(queryClient)

			queryClient.setQueriesData(
				{ queryKey: ["documents-with-memories"] },
				(old) => removeDocumentFromQueryData(old, documentId),
			)

			return { previousQueries }
		},
		onError: (error, _variables, context) => {
			restoreQueriesFromSnapshot(queryClient, context?.previousQueries)
			toast.error("Failed to delete document", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSuccess: (_data, variables) => {
			analytics.documentDeleted({ document_id: variables.documentId })
			toast.success("Document deleted successfully!")
			queryClient.invalidateQueries({ queryKey: ["documents-with-memories"] })
			onClose?.()
		},
	})

	return {
		noteMutation,
		linkMutation,
		fileMutation,
		updateMutation,
		deleteMutation,
	}
}
