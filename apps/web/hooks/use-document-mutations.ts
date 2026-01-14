"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { $fetch } from "@lib/api"

interface DocumentsQueryData {
	documents: unknown[]
	totalCount: number
}

interface UseDocumentMutationsOptions {
	onClose: () => void
}

export function useDocumentMutations({ onClose }: UseDocumentMutationsOptions) {
	const queryClient = useQueryClient()

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
				id: `temp-${Date.now()}`,
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
			toast.success("Note added successfully!", {
				description: "Your note is being processed",
			})
			queryClient.invalidateQueries({
				queryKey: ["documents-with-memories", variables.project],
			})
			onClose()
		},
	})

	const linkMutation = useMutation({
		mutationFn: async ({ url, project }: { url: string; project: string }) => {
			const response = await $fetch("@post/documents", {
				body: {
					content: url,
					containerTags: [project],
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
				id: `temp-${Date.now()}`,
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
			toast.success("Link added successfully!", {
				description: "Your link is being processed",
			})
			queryClient.invalidateQueries({
				queryKey: ["documents-with-memories", variables.project],
			})
			onClose()
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
				id: `temp-file-${Date.now()}`,
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
			toast.success("File uploaded successfully!", {
				description: "Your file is being processed",
			})
			queryClient.invalidateQueries({
				queryKey: ["documents-with-memories", variables.project],
			})
			onClose()
		},
	})

	return {
		noteMutation,
		linkMutation,
		fileMutation,
	}
}
