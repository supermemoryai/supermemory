"use client"

import {
	useMutation,
	useQueryClient,
	type QueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { $fetch } from "@lib/api"
import { useAuth } from "@lib/auth-context"
import { analytics } from "@/lib/analytics"
import { fetchSpaceSettings, spaceSettingsKey } from "@/hooks/use-space-context"
import { getBackendUrl } from "@/lib/url-helpers"
import {
	addOptimisticMemoryToQueryData,
	type OptimisticMemory,
	removeDocumentFromQueryData,
	removeDocumentsFromQueryData,
} from "@/lib/document-cache-updates"

/** Pull the human-readable message out of a $fetch error (handles `{error}`/`{message}`/string). */
function fetchErrorMessage(err: unknown, fallback: string): string {
	if (typeof err === "string") return err
	if (err && typeof err === "object") {
		const e = err as { error?: unknown; message?: unknown }
		if (typeof e.error === "string") return e.error
		if (typeof e.message === "string") return e.message
	}
	return fallback
}

interface UseDocumentMutationsOptions {
	onClose?: () => void
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

const FILE_UPLOAD_CONCURRENCY = 3
const BULK_LINK_BATCH_SIZE = 500
const fullDocumentQueryKey = (documentId: string) =>
	["document-full", documentId] as const

export type FileUploadEntry = { id: string; file: File }

export type FileUploadBatchResult = {
	failures: { id: string; message: string }[]
	successCount: number
}

export function useDocumentMutations({
	onClose,
}: UseDocumentMutationsOptions = {}) {
	const queryClient = useQueryClient()
	const { user } = useAuth()

	const defaultEntityContext = `This is ${user?.name ?? "a user"}, saving items in a personal knowledge management system. This may be websites, links, notes, journals, PDFs, etc. Understand the user from it into a graph.`

	// Skip when the space has its own context — sending one would overwrite the stored value.
	const resolveEntityContext = async (
		project: string,
	): Promise<string | undefined> => {
		try {
			const settings = await queryClient.fetchQuery({
				queryKey: spaceSettingsKey(project),
				queryFn: () => fetchSpaceSettings(project),
				staleTime: 60 * 1000,
			})
			return settings?.entityContext ? undefined : defaultEntityContext
		} catch {
			return defaultEntityContext
		}
	}

	const noteMutation = useMutation({
		mutationFn: async ({
			content,
			project,
		}: {
			content: string
			project: string
		}) => {
			const entityContext = await resolveEntityContext(project)
			const response = await $fetch("@post/documents", {
				body: {
					content,
					containerTags: [project],
					...(entityContext !== undefined ? { entityContext } : {}),
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
			queryClient.invalidateQueries({ queryKey: ["processing-documents"] })
			onClose?.()
		},
	})

	const linkMutation = useMutation({
		mutationFn: async ({ url, project }: { url: string; project: string }) => {
			const entityContext = await resolveEntityContext(project)
			const response = await $fetch("@post/documents", {
				body: {
					content: url,
					containerTags: [project],
					...(entityContext !== undefined ? { entityContext } : {}),
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
			queryClient.invalidateQueries({ queryKey: ["processing-documents"] })
			onClose?.()
		},
	})

	const bulkLinkMutation = useMutation({
		mutationFn: async ({
			urls,
			project,
		}: {
			urls: string[]
			project: string
		}): Promise<{ success: number; failed: number }> => {
			const entityContext = await resolveEntityContext(project)
			let success = 0
			let failed = 0

			for (let i = 0; i < urls.length; i += BULK_LINK_BATCH_SIZE) {
				const chunk = urls.slice(i, i + BULK_LINK_BATCH_SIZE)
				const response = await $fetch("@post/documents/batch", {
					body: {
						documents: chunk.map((url) => ({
							content: url,
							containerTags: [project],
							...(entityContext !== undefined ? { entityContext } : {}),
							metadata: { sm_source: "consumer" },
						})),
					},
				})
				if (response.error) {
					throw new Error(response.error?.message || "Failed to add links")
				}
				success += response.data?.success ?? 0
				failed += response.data?.failed ?? 0
			}

			return { success, failed }
		},
		onMutate: async ({ urls, project }) => {
			const previousQueries = await cancelAndSnapshotQueries(queryClient)
			const now = new Date().toISOString()

			for (const url of urls) {
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
			}

			return { previousQueries }
		},
		onError: (error, _variables, context) => {
			restoreQueriesFromSnapshot(queryClient, context?.previousQueries)
			toast.error("Failed to add links", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSuccess: (data, variables) => {
			for (let i = 0; i < data.success; i++) {
				analytics.documentAdded({ type: "link", project_id: variables.project })
			}
			queryClient.invalidateQueries({ queryKey: ["documents-with-memories"] })
			queryClient.invalidateQueries({ queryKey: ["processing-documents"] })
			if (data.failed === 0) {
				toast.success(`${data.success} links added!`, {
					description: "Your links are being processed",
				})
				onClose?.()
				return
			}
			if (data.success === 0) {
				toast.error("Failed to add links", {
					description: `All ${data.failed} links failed`,
				})
				return
			}
			toast.warning("Some links failed", {
				description: `${data.success} added, ${data.failed} failed`,
			})
		},
	})

	const fileMutation = useMutation({
		mutationFn: async ({
			fileEntries,
			title,
			description,
			project,
		}: {
			fileEntries: FileUploadEntry[]
			title?: string
			description?: string
			project: string
		}): Promise<FileUploadBatchResult> => {
			const applyMeta = fileEntries.length === 1
			const failures: { id: string; message: string }[] = []
			const entityContext = await resolveEntityContext(project)

			const uploadOne = async (entry: FileUploadEntry) => {
				const formData = new FormData()
				formData.append("file", entry.file)
				formData.append("containerTags", JSON.stringify([project]))
				if (entityContext !== undefined) {
					formData.append("entityContext", entityContext)
				}
				formData.append("metadata", JSON.stringify({ sm_source: "consumer" }))

				const response = await fetch(`${getBackendUrl()}/v3/documents/file`, {
					method: "POST",
					body: formData,
					credentials: "include",
				})

				if (!response.ok) {
					let message = "Failed to upload file"
					try {
						const error = (await response.json()) as { error?: string }
						if (error.error) message = error.error
					} catch {
						// ignore JSON parse errors
					}
					throw new Error(message)
				}

				const data = (await response.json()) as { id: string }

				if (applyMeta && (title || description)) {
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
			}

			for (let i = 0; i < fileEntries.length; i += FILE_UPLOAD_CONCURRENCY) {
				const slice = fileEntries.slice(i, i + FILE_UPLOAD_CONCURRENCY)
				await Promise.all(
					slice.map(async (entry) => {
						try {
							await uploadOne(entry)
						} catch (e) {
							failures.push({
								id: entry.id,
								message: e instanceof Error ? e.message : "Upload failed",
							})
						}
					}),
				)
			}

			const successCount = fileEntries.length - failures.length
			if (successCount === 0) {
				const firstFailure = failures[0]
				throw new Error(
					failures.length === 1 && firstFailure
						? firstFailure.message
						: `All ${failures.length} uploads failed`,
				)
			}

			return { failures, successCount }
		},
		onMutate: async ({ fileEntries, title, description, project }) => {
			if (fileEntries.length !== 1) {
				return {
					previousQueries: undefined as [unknown, unknown][] | undefined,
				}
			}
			const previousQueries = await cancelAndSnapshotQueries(queryClient)
			const entry = fileEntries[0]
			if (!entry) {
				return {
					previousQueries: undefined as [unknown, unknown][] | undefined,
				}
			}
			const now = new Date().toISOString()

			const optimisticMemory: OptimisticMemory = {
				id: `temp-file-${crypto.randomUUID()}`,
				content: "",
				url: null,
				title: title || entry.file.name,
				description: description || `Uploading ${entry.file.name}...`,
				containerTags: [project],
				createdAt: now,
				updatedAt: now,
				status: "processing",
				type: "file",
				metadata: {
					fileName: entry.file.name,
					fileSize: entry.file.size,
					mimeType: entry.file.type,
				},
				memoryEntries: [],
			}

			queryClient.setQueriesData(
				{ queryKey: ["documents-with-memories"] },
				(old) => addOptimisticMemoryToQueryData(old, optimisticMemory),
			)

			return { previousQueries }
		},
		onError: (error, variables, context) => {
			if (variables.fileEntries.length === 1) {
				restoreQueriesFromSnapshot(queryClient, context?.previousQueries)
			}
			toast.error("Failed to upload file", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSuccess: (data, variables) => {
			for (let i = 0; i < data.successCount; i++) {
				analytics.documentAdded({ type: "file", project_id: variables.project })
			}
			queryClient.invalidateQueries({ queryKey: ["documents-with-memories"] })
			queryClient.invalidateQueries({ queryKey: ["processing-documents"] })
			if (data.failures.length === 0) {
				toast.success(
					data.successCount === 1
						? "File uploaded successfully!"
						: `${data.successCount} files uploaded successfully!`,
					{
						description: "Your files are being processed",
					},
				)
				onClose?.()
				return
			}
			toast.warning("Some uploads failed", {
				description: `${data.successCount} uploaded, ${data.failures.length} failed — fix or retry below`,
			})
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
			queryClient.setQueryData(
				fullDocumentQueryKey(variables.documentId),
				variables.content,
			)
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
				throw new Error(
					fetchErrorMessage(response.error, "Failed to delete document"),
				)
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
			queryClient.removeQueries({
				queryKey: fullDocumentQueryKey(variables.documentId),
				exact: true,
			})
			queryClient.invalidateQueries({ queryKey: ["documents-with-memories"] })
			onClose?.()
		},
	})

	const bulkDeleteMutation = useMutation({
		mutationFn: async ({ documentIds }: { documentIds: string[] }) => {
			const response = await $fetch("@delete/documents/bulk", {
				body: { ids: documentIds },
			})

			if (response.error) {
				throw new Error(
					fetchErrorMessage(response.error, "Failed to delete documents"),
				)
			}

			return response.data
		},
		onMutate: async ({ documentIds }) => {
			const previousQueries = await cancelAndSnapshotQueries(queryClient)
			const idSet = new Set(documentIds)

			queryClient.setQueriesData(
				{ queryKey: ["documents-with-memories"] },
				(old) => removeDocumentsFromQueryData(old, idSet),
			)

			return { previousQueries }
		},
		onError: (error, _variables, context) => {
			restoreQueriesFromSnapshot(queryClient, context?.previousQueries)
			toast.error("Failed to delete documents", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSuccess: (_data, variables) => {
			analytics.documentsBulkDeleted({ count: variables.documentIds.length })
			toast.success(
				`${variables.documentIds.length} document${variables.documentIds.length === 1 ? "" : "s"} deleted`,
			)
			for (const documentId of variables.documentIds) {
				queryClient.removeQueries({
					queryKey: fullDocumentQueryKey(documentId),
					exact: true,
				})
			}
			queryClient.invalidateQueries({ queryKey: ["documents-with-memories"] })
		},
	})

	return {
		noteMutation,
		linkMutation,
		bulkLinkMutation,
		fileMutation,
		updateMutation,
		deleteMutation,
		bulkDeleteMutation,
	}
}
