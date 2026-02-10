"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
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

export function useDocumentMutations({
	onClose,
}: UseDocumentMutationsOptions = {}) {
	const queryClient = useQueryClient()
	const { user } = useAuth()

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
					content: content,
					containerTags: [project],
					entityContext: `This is ${user?.name ?? "a user"}, saving items in a personal knowledge management system. This may be websites, links, notes, journals, PDFs, etc. Understand the user from it into a graph.`,
					metadata: {
						sm_source: "consumer",
					},
				},
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to add note")
			}

			return response.data
		},
		onMutate: async ({ content, project }) => {
			await queryClient.cancelQueries({
				queryKey: ["documents-with-memories", project],
			})

			const previousMemories = queryClient.getQueryData([
				"documents-with-memories",
				project,
			])

			const optimisticMemory = {
				id: `temp-${crypto.randomUUID()}`,
				content: content,
				url: null,
				title: content.substring(0, 100),
				description: "Processing content...",
				containerTags: [project],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				status: "queued",
				type: "note",
				metadata: {
					processingStage: "queued",
					processingMessage: "Added to processing queue",
				},
				memoryEntries: [],
				isOptimistic: true,
			}

			queryClient.setQueryData(
				["documents-with-memories", project],
				(old: DocumentsQueryData | undefined) => {
					const existingDocs = old?.documents ?? []
					return {
						...old,
						documents: [optimisticMemory, ...existingDocs],
						totalCount: (old?.totalCount ?? 0) + 1,
					}
				},
			)

			return { previousMemories }
		},
		onError: (_error, variables, context) => {
			if (context?.previousMemories) {
				queryClient.setQueryData(
					["documents-with-memories", variables.project],
					context.previousMemories,
				)
			}
			toast.error("Failed to add note", {
				description: _error instanceof Error ? _error.message : "Unknown error",
			})
		},
		onSuccess: (_data, variables) => {
			analytics.documentAdded({
				type: "note",
				project_id: variables.project,
			})
			toast.success("Note added successfully!", {
				description: "Your note is being processed",
			})
			queryClient.invalidateQueries({
				queryKey: ["documents-with-memories", variables.project],
			})
			onClose?.()
		},
	})

	const linkMutation = useMutation({
		mutationFn: async ({ url, project }: { url: string; project: string }) => {
			const response = await $fetch("@post/documents", {
				body: {
					content: url,
					containerTags: [project],
					entityContext: `This is ${user?.name ?? "a user"}, saving items in a personal knowledge management system. This may be websites, links, notes, journals, PDFs, etc. Understand the user from it into a graph.`,
					metadata: {
						sm_source: "consumer",
					},
				},
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to add link")
			}

			return response.data
		},
		onMutate: async ({ url, project }) => {
			await queryClient.cancelQueries({
				queryKey: ["documents-with-memories", project],
			})

			const previousMemories = queryClient.getQueryData([
				"documents-with-memories",
				project,
			])

			const optimisticMemory = {
				id: `temp-${crypto.randomUUID()}`,
				content: "",
				url: url,
				title: "Processing...",
				description: "Extracting content...",
				containerTags: [project],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				status: "queued",
				type: "link",
				metadata: {
					processingStage: "queued",
					processingMessage: "Added to processing queue",
				},
				memoryEntries: [],
				isOptimistic: true,
			}

			queryClient.setQueryData(
				["documents-with-memories", project],
				(old: DocumentsQueryData | undefined) => {
					const existingDocs = old?.documents ?? []
					return {
						...old,
						documents: [optimisticMemory, ...existingDocs],
						totalCount: (old?.totalCount ?? 0) + 1,
					}
				},
			)

			return { previousMemories }
		},
		onError: (_error, variables, context) => {
			if (context?.previousMemories) {
				queryClient.setQueryData(
					["documents-with-memories", variables.project],
					context.previousMemories,
				)
			}
			toast.error("Failed to add link", {
				description: _error instanceof Error ? _error.message : "Unknown error",
			})
		},
		onSuccess: (_data, variables) => {
			analytics.documentAdded({
				type: "link",
				project_id: variables.project,
			})
			toast.success("Link added successfully!", {
				description: "Your link is being processed",
			})
			queryClient.invalidateQueries({
				queryKey: ["documents-with-memories", variables.project],
			})
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
			formData.append(
				"entityContext",
				`This is ${user?.name ?? "a user"}, saving items in a personal knowledge management system. This may be websites, links, notes, journals, PDFs, etc. Understand the user from it into a graph.`,
			)
			formData.append(
				"metadata",
				JSON.stringify({
					sm_source: "consumer",
				}),
			)

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
			await queryClient.cancelQueries({
				queryKey: ["documents-with-memories", project],
			})

			const previousMemories = queryClient.getQueryData([
				"documents-with-memories",
				project,
			])

			const optimisticMemory = {
				id: `temp-file-${crypto.randomUUID()}`,
				content: "",
				url: null,
				title: title || file.name,
				description: description || `Uploading ${file.name}...`,
				containerTags: [project],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				status: "processing",
				type: "file",
				metadata: {
					fileName: file.name,
					fileSize: file.size,
					mimeType: file.type,
				},
				memoryEntries: [],
			}

			queryClient.setQueryData(
				["documents-with-memories", project],
				(old: DocumentsQueryData | undefined) => {
					const existingDocs = old?.documents ?? []
					return {
						...old,
						documents: [optimisticMemory, ...existingDocs],
						totalCount: (old?.totalCount ?? 0) + 1,
					}
				},
			)

			return { previousMemories }
		},
		onError: (_error, variables, context) => {
			if (context?.previousMemories) {
				queryClient.setQueryData(
					["documents-with-memories", variables.project],
					context.previousMemories,
				)
			}
			toast.error("Failed to upload file", {
				description: _error instanceof Error ? _error.message : "Unknown error",
			})
		},
		onSuccess: (_data, variables) => {
			analytics.documentAdded({
				type: "file",
				project_id: variables.project,
			})
			toast.success("File uploaded successfully!", {
				description: "Your file is being processed",
			})
			queryClient.invalidateQueries({
				queryKey: ["documents-with-memories", variables.project],
			})
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
					metadata: {
						sm_source: "consumer",
					},
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
			queryClient.invalidateQueries({
				queryKey: ["documents-with-memories"],
			})
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
			await queryClient.cancelQueries({
				queryKey: ["documents-with-memories"],
			})

			const previousQueries = queryClient.getQueriesData({
				queryKey: ["documents-with-memories"],
			})

			queryClient.setQueriesData(
				{ queryKey: ["documents-with-memories"] },
				(old: QueryData | undefined) => {
					if (!old) return old

					if ("pages" in old) {
						const infiniteData = old as InfiniteQueryData
						return {
							...infiniteData,
							pages: infiniteData.pages.map((page) => {
								if (!page?.documents) return page
								return {
									...page,
									documents: page.documents.filter(
										(doc) =>
											doc.id !== documentId && doc.customId !== documentId,
									),
									pagination: page.pagination
										? {
												...page.pagination,
												totalItems: Math.max(
													0,
													(page.pagination.totalItems ?? 0) - 1,
												),
											}
										: page.pagination,
								}
							}),
						}
					}

					if ("documents" in old) {
						const queryData = old as DocumentsQueryData
						return {
							...queryData,
							documents: queryData.documents.filter((doc: DocumentWithId) => {
								return doc.id !== documentId && doc.customId !== documentId
							}),
							totalCount: Math.max(0, (queryData.totalCount ?? 0) - 1),
						}
					}

					return old
				},
			)

			return { previousQueries }
		},
		onError: (_error, _variables, context) => {
			if (context?.previousQueries) {
				context.previousQueries.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}
			toast.error("Failed to delete document", {
				description: _error instanceof Error ? _error.message : "Unknown error",
			})
		},
		onSuccess: (_data, variables) => {
			analytics.documentDeleted({ document_id: variables.documentId })
			toast.success("Document deleted successfully!")
			queryClient.invalidateQueries({
				queryKey: ["documents-with-memories"],
			})
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
