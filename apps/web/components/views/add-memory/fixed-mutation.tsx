import { $fetch } from "@lib/api"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

// Simplified mutation that doesn't block UI with polling
export const createSimpleAddContentMutation = (
	queryClient: any,
	onClose?: () => void,
) => {
	return useMutation({
		mutationFn: async ({
			content,
			project,
			contentType,
		}: {
			content: string
			project: string
			contentType: "note" | "link"
		}) => {
			// Just create the memory, don't wait for processing
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
				throw new Error(
					response.error?.message || `Failed to add ${contentType}`,
				)
			}

			return { id: response.data.id, contentType }
		},
		onMutate: async ({ content, project, contentType }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: ["documents-with-memories", project],
			})

			// Snapshot the previous value
			const previousMemories = queryClient.getQueryData([
				"documents-with-memories",
				project,
			])

			// Create optimistic memory
			const tempId = `temp-${Date.now()}`
			const optimisticMemory = {
				id: tempId,
				content: contentType === "link" ? "" : content,
				url: contentType === "link" ? content : null,
				title:
					contentType === "link" ? "Processing..." : content.substring(0, 100),
				description:
					contentType === "link"
						? "Extracting content..."
						: "Processing content...",
				containerTags: [project],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				status: "processing",
				type: contentType,
				metadata: {
					processingStage: "queued",
					processingMessage: "Added to processing queue",
				},
				memoryEntries: [],
				isOptimistic: true,
			}

			// Optimistically update to include the new memory
			queryClient.setQueryData(
				["documents-with-memories", project],
				(old: any) => {
					// Handle infinite query structure
					if (old?.pages) {
						const newPages = [...old.pages]
						if (newPages.length > 0) {
							// Add to the first page
							const firstPage = { ...newPages[0] }
							firstPage.documents = [
								optimisticMemory,
								...(firstPage.documents || []),
							]
							newPages[0] = firstPage
						} else {
							// No pages yet, create the first page
							newPages.push({
								documents: [optimisticMemory],
								pagination: { currentPage: 1, totalPages: 1, totalCount: 1 },
								totalCount: 1,
							})
						}

						return {
							...old,
							pages: newPages,
						}
					}
					// Fallback for regular query structure
					const newData = old
						? {
								...old,
								documents: [optimisticMemory, ...(old.documents || [])],
								totalCount: (old.totalCount || 0) + 1,
							}
						: { documents: [optimisticMemory], totalCount: 1 }
					return newData
				},
			)

			return { previousMemories, optimisticId: tempId }
		},
		onError: (error, variables, context) => {
			// Roll back on error
			if (context?.previousMemories) {
				queryClient.setQueryData(
					["documents-with-memories", variables.project],
					context.previousMemories,
				)
			}
			toast.error(`Failed to add ${variables.contentType}`, {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSuccess: (data, variables, context) => {
			// Show success message
			toast.success(
				`${variables.contentType === "link" ? "Link" : "Note"} created successfully!`,
			)

			// Close modal
			onClose?.()

			// Start polling for this specific memory ID
			// The polling will happen in the background and update the optimistic memory when done
			startMemoryPolling(
				data.id,
				variables.project,
				context?.optimisticId,
				queryClient,
			)
		},
	})
}

// Background polling function
const startMemoryPolling = (
	memoryId: string,
	project: string,
	optimisticId: string | undefined,
	queryClient: any,
) => {
	const pollMemory = async () => {
		try {
			const memory = await $fetch(`@get/documents/${memoryId}`)

			if (memory.error) {
				console.error("Failed to fetch memory status:", memory.error)
				return false
			}

			const isComplete =
				memory.data?.status === "done" ||
				memory.data?.content ||
				memory.data?.memoryEntries?.length > 0

			if (isComplete) {
				// Replace optimistic memory with real data
				queryClient.setQueryData(
					["documents-with-memories", project],
					(old: any) => {
						if (old?.pages) {
							// Handle infinite query structure
							const newPages = old.pages.map((page: any) => ({
								...page,
								documents: page.documents.map((doc: any) => {
									if (doc.isOptimistic || doc.id === optimisticId) {
										// Replace with real memory
										return {
											...memory.data,
											isOptimistic: false,
										}
									}
									return doc
								}),
							}))

							return {
								...old,
								pages: newPages,
							}
						}
						// Handle regular query structure
						return {
							...old,
							documents: old.documents.map((doc: any) => {
								if (doc.isOptimistic || doc.id === optimisticId) {
									return {
										...memory.data,
										isOptimistic: false,
									}
								}
								return doc
							}),
						}
					},
				)
				return true // Stop polling
			}

			return false // Continue polling
		} catch (error) {
			console.error("Error polling memory:", error)
			return false // Continue polling
		}
	}

	// Poll every 3 seconds, max 60 attempts (3 minutes)
	let attempts = 0
	const maxAttempts = 60

	const poll = async () => {
		if (attempts >= maxAttempts) {
			console.log("Memory polling timed out")
			return
		}

		const isComplete = await pollMemory()
		attempts++

		if (!isComplete && attempts < maxAttempts) {
			setTimeout(poll, 3000) // Poll again in 3 seconds
		}
	}

	// Start polling after a short delay
	setTimeout(poll, 2000)
}
