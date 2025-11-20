"use client"
import { $fetch } from "@lib/api"
import { fetchMemoriesFeature } from "@repo/lib/queries"
import { Button } from "@repo/ui/components/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog"
import {
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
} from "@repo/ui/components/tabs"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { Textarea } from "@repo/ui/components/textarea"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState,
} from "@ui/components/shadcn-io/dropzone"
import { useCustomer } from "autumn-js/react"
import {
	Brain,
	FileIcon,
	Link as LinkIcon,
	Loader2,
	PlugIcon,
	Plus,
	UploadIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { analytics } from "@/lib/analytics"
import { useProject } from "@/stores"
import { ConnectionsTabContent } from "../connections-tab-content"
import { ActionButtons } from "./action-buttons"
import { MemoryUsageRing } from "./memory-usage-ring"
import { ProjectSelection } from "./project-selection"

const TextEditor = dynamic(
	() => import("./text-editor").then((mod) => ({ default: mod.TextEditor })),
	{
		loading: () => (
			<div className="bg-foreground/5 border border-foreground/10 rounded-md">
				<div className="flex-1 min-h-48 max-h-64 overflow-y-auto flex items-center justify-center text-white/70">
					Loading editor...
				</div>
				<div className="p-1 flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-b-md">
					<div className="flex items-center gap-1 opacity-50">
						<div className="h-8 w-8 bg-white/10 rounded-sm animate-pulse" />
						<div className="h-8 w-8 bg-white/10 rounded-sm animate-pulse" />
						<div className="h-8 w-8 bg-white/10 rounded-sm animate-pulse" />
					</div>
				</div>
			</div>
		),
		ssr: false,
	},
)

export function AddMemoryView({
	onClose,
	initialTab = "note",
}: {
	onClose?: () => void
	initialTab?: "note" | "link" | "file" | "connect"
}) {
	const queryClient = useQueryClient()
	const { selectedProject, setSelectedProject } = useProject()
	const [showAddDialog, setShowAddDialog] = useState(true)
	const [selectedFiles, setSelectedFiles] = useState<File[]>([])
	const [activeTab, setActiveTab] = useState<
		"note" | "link" | "file" | "connect"
	>(initialTab)
	const autumn = useCustomer()
	const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false)
	const [newProjectName, setNewProjectName] = useState("")

	// Check memory limits
	const { data: memoriesCheck } = fetchMemoriesFeature(
		autumn,
		!autumn.isLoading,
	)

	const memoriesUsed = memoriesCheck?.usage ?? 0
	const memoriesLimit = memoriesCheck?.included_usage ?? 0

	// Fetch projects for the dropdown
	const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const response = await $fetch("@get/projects")

			if (response.error) {
				throw new Error(response.error?.message || "Failed to load projects")
			}

			return response.data?.projects || []
		},
		staleTime: 30 * 1000,
	})

	// Create project mutation
	const createProjectMutation = useMutation({
		mutationFn: async (name: string) => {
			const response = await $fetch("@post/projects", {
				body: { name },
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to create project")
			}

			return response.data
		},
		onSuccess: (data) => {
			analytics.projectCreated()
			toast.success("Project created successfully!")
			setShowCreateProjectDialog(false)
			setNewProjectName("")
			queryClient.invalidateQueries({ queryKey: ["projects"] })
			// Set the newly created project as selected
			if (data?.containerTag) {
				setSelectedProject(data.containerTag)
				// Update form values
				addContentForm.setFieldValue("project", data.containerTag)
				fileUploadForm.setFieldValue("project", data.containerTag)
			}
		},
		onError: (error) => {
			toast.error("Failed to create project", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const addContentForm = useForm({
		defaultValues: {
			content: "",
			project: selectedProject || "sm_project_default",
		},
		onSubmit: async ({ value, formApi }) => {
			addContentMutation.mutate({
				content: value.content,
				project: value.project,
				contentType: activeTab as "note" | "link",
			})
			formApi.reset()
		},
		validators: {
			onChange: z.object({
				content: z.string().min(1, "Content is required"),
				project: z.string(),
			}),
		},
	})

	// Re-validate content field when tab changes between note/link
	// biome-ignore  lint/correctness/useExhaustiveDependencies: It is what it is
	useEffect(() => {
		// Trigger validation of the content field when switching between note/link
		if (activeTab === "note" || activeTab === "link") {
			const currentValue = addContentForm.getFieldValue("content")
			if (currentValue) {
				addContentForm.validateField("content", "change")
			}
		}
	}, [activeTab])

	// Form for file upload metadata
	const fileUploadForm = useForm({
		defaultValues: {
			title: "",
			description: "",
			project: selectedProject || "sm_project_default",
		},
		onSubmit: async ({ value, formApi }) => {
			if (selectedFiles.length === 0) {
				toast.error("Please select a file to upload")
				return
			}

			for (const file of selectedFiles) {
				fileUploadMutation.mutate({
					file,
					title: value.title || undefined,
					description: value.description || undefined,
					project: value.project,
				})
			}

			formApi.reset()
			setSelectedFiles([])
		},
	})

	const addContentMutation = useMutation({
		mutationFn: async ({
			content,
			project,
			contentType,
		}: {
			content: string
			project: string
			contentType: "note" | "link"
		}) => {
			// close the modal
			onClose?.()

			const processingPromise = (async () => {
				// First, create the memory
				const response = await $fetch("@post/documents", {
					body: {
						content: content,
						containerTags: [project],
						metadata: {
							sm_source: "consumer", // Use "consumer" source to bypass limits
						},
					},
				})

				if (response.error) {
					throw new Error(
						response.error?.message || `Failed to add ${contentType}`,
					)
				}

				const memoryId = response.data.id

				// Polling function to check status
				const pollForCompletion = async (): Promise<any> => {
					let attempts = 0
					const maxAttempts = 60 // Maximum 5 minutes (60 attempts * 5 seconds)

					while (attempts < maxAttempts) {
						try {
							const memory = await $fetch<{ status: string; content: string }>(
								`@get/documents/${memoryId}`,
							)

							if (memory.error) {
								throw new Error(
									memory.error?.message || "Failed to fetch memory status",
								)
							}

							// Check if processing is complete
							// Adjust this condition based on your API response structure
							if (
								memory.data?.status === "done" ||
								// Sometimes the memory might be ready when it has content and no processing status
								memory.data?.content
							) {
								return memory.data
							}

							// If still processing, wait and try again
							await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds
							attempts++
						} catch (error) {
							console.error("Error polling memory status:", error)
							// Don't throw immediately, retry a few times
							if (attempts >= 3) {
								throw new Error("Failed to check processing status")
							}
							await new Promise((resolve) => setTimeout(resolve, 5000))
							attempts++
						}
					}

					// If we've exceeded max attempts, throw an error
					throw new Error(
						"Memory processing timed out. Please check back later.",
					)
				}

				// Wait for completion
				const completedMemory = await pollForCompletion()
				return completedMemory
			})()

			toast.promise(processingPromise, {
				loading: "Processing...",
				success: `${contentType === "link" ? "Link" : "Note"} created successfully!`,
				error: (err) =>
					`Failed to add ${contentType}: ${err instanceof Error ? err.message : "Unknown error"}`,
			})

			return processingPromise
		},
		onMutate: async ({ content, project, contentType }) => {
			console.log("🚀 onMutate starting...")

			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: ["documents-with-memories", project],
			})
			console.log("✅ Cancelled queries")

			// Snapshot the previous value
			const previousMemories = queryClient.getQueryData([
				"documents-with-memories",
				project,
			])
			console.log("📸 Previous memories:", previousMemories)

			// Create optimistic memory
			const optimisticMemory = {
				id: `temp-${Date.now()}`,
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
				status: "queued",
				type: contentType,
				metadata: {
					processingStage: "queued",
					processingMessage: "Added to processing queue",
				},
				memoryEntries: [],
				isOptimistic: true,
			}
			console.log("🎯 Created optimistic memory:", optimisticMemory)

			// Optimistically update to include the new memory
			queryClient.setQueryData(
				["documents-with-memories", project],
				(old: any) => {
					console.log("🔄 Old data:", old)
					const newData = old
						? {
								...old,
								documents: [optimisticMemory, ...(old.documents || [])],
								totalCount: (old.totalCount || 0) + 1,
							}
						: { documents: [optimisticMemory], totalCount: 1 }
					console.log("✨ New data:", newData)
					return newData
				},
			)

			console.log("✅ onMutate completed")
			return { previousMemories, optimisticId: optimisticMemory.id }
		},
		// If the mutation fails, roll back to the previous value
		onError: (error, variables, context) => {
			if (context?.previousMemories) {
				queryClient.setQueryData(
					["documents-with-memories", variables.project],
					context.previousMemories,
				)
			}
		},
		onSuccess: (_data, variables) => {
			analytics.memoryAdded({
				type: variables.contentType === "link" ? "link" : "note",
				project_id: variables.project,
				content_length: variables.content.length,
			})

			queryClient.invalidateQueries({
				queryKey: ["documents-with-memories", variables.project],
			})

			setTimeout(() => {
				queryClient.invalidateQueries({
					queryKey: ["documents-with-memories", variables.project],
				})
			}, 30000) // 30 seconds

			setTimeout(() => {
				queryClient.invalidateQueries({
					queryKey: ["documents-with-memories", variables.project],
				})
			}, 120000) // 2 minutes

			setShowAddDialog(false)
			onClose?.()
		},
	})

	const fileUploadMutation = useMutation({
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
			// TEMPORARILY DISABLED: Limit check disabled
			// Check if user can add more memories
			// if (!canAddMemory && !isProUser) {
			// 	throw new Error(
			// 		`Free plan limit reached (${memoriesLimit} memories). Upgrade to Pro for up to 500 memories.`,
			// 	);
			// }

			const formData = new FormData()
			formData.append("file", file)
			formData.append("containerTags", JSON.stringify([project]))
			formData.append("metadata", JSON.stringify({
				sm_source: "consumer",
			}))

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

			// If we have metadata, we can update the document after creation
			if (title || description) {
				await $fetch(`@patch/documents/${data.id}`, {
					body: {
						metadata: {
							...(title && { title }),
							...(description && { description }),
							sm_source: "consumer", // Use "consumer" source to bypass limits
						},
					},
				})
			}

			return data
		},
		// Optimistic update
		onMutate: async ({ file, title, description, project }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: ["documents-with-memories", project],
			})

			// Snapshot the previous value
			const previousMemories = queryClient.getQueryData([
				"documents-with-memories",
				project,
			])

			// Create optimistic memory for the file
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

			// Optimistically update to include the new memory
			queryClient.setQueryData(
				["documents-with-memories", project],
				(old: any) => {
					if (!old) return { documents: [optimisticMemory], totalCount: 1 }
					return {
						...old,
						documents: [optimisticMemory, ...(old.documents || [])],
						totalCount: (old.totalCount || 0) + 1,
					}
				},
			)

			// Return a context object with the snapshotted value
			return { previousMemories }
		},
		// If the mutation fails, roll back to the previous value
		onError: (error, variables, context) => {
			if (context?.previousMemories) {
				queryClient.setQueryData(
					["documents-with-memories", variables.project],
					context.previousMemories,
				)
			}
			toast.error("Failed to upload file", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
		onSuccess: (_data, variables) => {
			analytics.memoryAdded({
				type: "file",
				project_id: variables.project,
				file_size: variables.file.size,
				file_type: variables.file.type,
			})
			toast.success("File uploaded successfully!", {
				description: "Your file is being processed",
			})
			setShowAddDialog(false)
			onClose?.()
		},
		// Always refetch after error or success
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["documents-with-memories"] })
		},
	})

	return (
		<AnimatePresence mode="wait">
			{showAddDialog && (
				<Dialog
					key="add-memory-dialog"
					onOpenChange={(open) => {
						setShowAddDialog(open)
						if (!open) onClose?.()
					}}
					open={showAddDialog}
				>
					<DialogTitle className="sr-only">Memory Dialog</DialogTitle>
					<DialogContent
						className="w-[100vw] max-w-4xl sm:max-w-4xl backdrop-blur-xl border-white/10 z-[80] h-[52vh] overflow-y-auto p-4"
						showCloseButton={false}
					>
						<Tabs
							value={activeTab}
							onValueChange={(value) => setActiveTab(value as typeof activeTab)}
							className="flex flex-row gap-4"
							orientation="vertical"
						>
							<TabsList className="flex flex-col gap-2 max-w-48 h-fit bg-transparent p-0">
								<TabsTrigger
									value="note"
									className="flex flex-col gap-1 justify-start items-start h-auto w-full cursor-pointer"
								>
									<div className="flex gap-1 items-center">
										<Brain className="h-4 w-4" />
										Note
									</div>
									<span className="text-xs text-muted-foreground text-wrap text-left">
										Write down your thoughts
									</span>
								</TabsTrigger>
								<TabsTrigger
									value="link"
									className="flex flex-col gap-1 justify-start items-start h-auto w-full cursor-pointer"
								>
									<div className="flex gap-1 items-center">
										<LinkIcon className="h-4 w-4" />
										Link
									</div>
									<span className="text-xs text-muted-foreground text-wrap text-left">
										Save any webpage
									</span>
								</TabsTrigger>
								<TabsTrigger
									value="file"
									className="flex flex-col gap-1 justify-start items-start h-auto w-full cursor-pointer"
								>
									<div className="flex gap-1 items-center">
										<FileIcon className="h-4 w-4" />
										File
									</div>
									<span className="text-xs text-muted-foreground text-wrap text-left">
										Upload any file
									</span>
								</TabsTrigger>
								<TabsTrigger
									value="connect"
									className="flex flex-col gap-1 justify-start items-start h-auto w-full cursor-pointer"
								>
									<div className="flex gap-1 items-center">
										<PlugIcon className="h-4 w-4" />
										Connect
									</div>
									<span className="text-xs text-muted-foreground text-wrap text-left">
										Connect to your favorite apps
									</span>
								</TabsTrigger>
							</TabsList>

							<TabsContent value="note" className="space-y-4">
								<form
									onSubmit={(e) => {
										e.preventDefault()
										e.stopPropagation()
										addContentForm.handleSubmit()
									}}
									className="h-full flex flex-col"
								>
									<div className="grid gap-4">
										{/* Note Input */}
										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className="flex flex-col gap-2"
											initial={{ opacity: 0, y: 10 }}
											transition={{ delay: 0.1 }}
										>
											<addContentForm.Field
												name="content"
												validators={{
													onChange: ({ value }) => {
														if (!value || value.trim() === "") {
															return "Note is required"
														}
														return undefined
													},
												}}
											>
												{({ state, handleChange, handleBlur }) => (
													<>
								<div className={addContentMutation.isPending ? "opacity-50" : ""}>
									<TextEditor
										containerClassName="bg-white/5 border-white/10 rounded-md"
																disabled={addContentMutation.isPending}
																onBlur={handleBlur}
																onChange={handleChange}
																placeholder="Write your note here..."
																value={state.value}
															/>
														</div>
														{state.meta.errors.length > 0 && (
															<motion.p
																animate={{ opacity: 1, height: "auto" }}
																className="text-sm text-red-400 mt-1"
																exit={{ opacity: 0, height: 0 }}
																initial={{ opacity: 0, height: 0 }}
															>
																{state.meta.errors
																	.map((error) =>
																		typeof error === "string"
																			? error
																			: (error?.message ??
																				`Error: ${JSON.stringify(error)}`),
																	)
																	.join(", ")}
															</motion.p>
														)}
													</>
												)}
											</addContentForm.Field>
										</motion.div>
									</div>
									<div className="flex flex-col sm:flex-row sm:justify-between sm:items-end w-full gap-4 mt-auto">
										<div className="flex flex-col sm:flex-row sm:items-end gap-4 order-2 sm:order-1">
											{/* Project Selection */}
											<motion.div
												animate={{ opacity: 1, y: 0 }}
												className={`flex flex-col gap-2 flex-1 sm:flex-initial ${
													addContentMutation.isPending ? "opacity-50" : ""
												}`}
												initial={{ opacity: 0, y: 10 }}
												transition={{ delay: 0.15 }}
											>
												<addContentForm.Field name="project">
													{({ state, handleChange }) => (
														<ProjectSelection
															disabled={addContentMutation.isPending}
															id="note-project"
															isLoading={isLoadingProjects}
															onCreateProject={() =>
																setShowCreateProjectDialog(true)
															}
															onProjectChange={handleChange}
															projects={projects}
															selectedProject={state.value}
														/>
													)}
												</addContentForm.Field>
											</motion.div>

											<MemoryUsageRing
												memoriesLimit={memoriesLimit}
												memoriesUsed={memoriesUsed}
											/>
										</div>

										<ActionButtons
											isSubmitDisabled={!addContentForm.state.canSubmit}
											isSubmitting={addContentMutation.isPending}
											onCancel={() => {
												setShowAddDialog(false)
												onClose?.()
												addContentForm.reset()
											}}
											submitIcon={Plus}
											submitText="Add Note"
										/>
									</div>
								</form>
							</TabsContent>

							<TabsContent value="link" className="space-y-4">
								<form
									onSubmit={(e) => {
										e.preventDefault()
										e.stopPropagation()
										addContentForm.handleSubmit()
									}}
									className="h-full flex flex-col"
								>
									<div className="grid gap-4">
										{/* Link Input */}
										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className="flex flex-col gap-2"
											initial={{ opacity: 0, y: 10 }}
											transition={{ delay: 0.1 }}
										>
											<label
												className="text-sm font-medium"
												htmlFor="link-content"
											>
												Link
											</label>
											<addContentForm.Field
												name="content"
												validators={{
													onChange: ({ value }) => {
														if (!value || value.trim() === "") {
															return "Link is required"
														}
														try {
															new URL(value)
															return undefined
														} catch {
															return "Please enter a valid link"
														}
													},
												}}
											>
												{({ state, handleChange, handleBlur }) => (
													<>
														<Input
															className={`bg-black/5 border-black/10 ${
																addContentMutation.isPending ? "opacity-50" : ""
															}`}
															disabled={addContentMutation.isPending}
															id="link-content"
															onBlur={handleBlur}
															onChange={(e) => handleChange(e.target.value)}
															placeholder="https://example.com/article"
															value={state.value}
														/>
														{state.meta.errors.length > 0 && (
															<motion.p
																animate={{ opacity: 1, height: "auto" }}
																className="text-sm text-red-400 mt-1"
																exit={{ opacity: 0, height: 0 }}
																initial={{ opacity: 0, height: 0 }}
															>
																{state.meta.errors
																	.map((error) =>
																		typeof error === "string"
																			? error
																			: (error?.message ??
																				`Error: ${JSON.stringify(error)}`),
																	)
																	.join(", ")}
															</motion.p>
														)}
													</>
												)}
											</addContentForm.Field>
										</motion.div>
									</div>
									<div className="mt-auto flex justify-between items-end w-full">
										<div className="flex items-end gap-4">
											{/* Left side - Project Selection */}
											<motion.div
												animate={{ opacity: 1, y: 0 }}
												className={`flex flex-col gap-2 ${
													addContentMutation.isPending ? "opacity-50" : ""
												}`}
												initial={{ opacity: 0, y: 10 }}
												transition={{ delay: 0.15 }}
											>
												<addContentForm.Field name="project">
													{({ state, handleChange }) => (
														<ProjectSelection
															disabled={addContentMutation.isPending}
															id="link-project-2"
															isLoading={isLoadingProjects}
															onCreateProject={() =>
																setShowCreateProjectDialog(true)
															}
															onProjectChange={handleChange}
															projects={projects}
															selectedProject={state.value}
														/>
													)}
												</addContentForm.Field>
											</motion.div>

											<MemoryUsageRing
												memoriesLimit={memoriesLimit}
												memoriesUsed={memoriesUsed}
											/>
										</div>

										<ActionButtons
											isSubmitDisabled={!addContentForm.state.canSubmit}
											isSubmitting={addContentMutation.isPending}
											onCancel={() => {
												setShowAddDialog(false)
												onClose?.()
												addContentForm.reset()
											}}
											submitIcon={Plus}
											submitText="Add Link"
										/>
									</div>
								</form>
							</TabsContent>

							<TabsContent value="file" className="space-y-4">
						<form
									onSubmit={(e) => {
										e.preventDefault()
										e.stopPropagation()
										fileUploadForm.handleSubmit()
									}}
						className="h-full flex flex-col"
						>
									<div className="grid gap-4">
										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className="flex flex-col gap-2"
											initial={{ opacity: 0, y: 10 }}
											transition={{ delay: 0.1 }}
										>
											<label className="text-sm font-medium" htmlFor="file">
												File
											</label>
											<Dropzone
												accept={{
													"application/pdf": [".pdf"],
													"application/msword": [".doc"],
													"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
														[".docx"],
													"text/plain": [".txt"],
													"text/markdown": [".md"],
													"text/csv": [".csv"],
													"application/json": [".json"],
													"image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
												}}
												className="bg-black/5 border-black/10 hover:bg-black/10 min-h-40"
												maxFiles={10}
												maxSize={10 * 1024 * 1024} // 10MB
												onDrop={(acceptedFiles) =>
													setSelectedFiles(acceptedFiles)
												}
												src={selectedFiles}
											>
												<DropzoneEmptyState />
												<DropzoneContent className="overflow-auto" />
											</Dropzone>
										</motion.div>

										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className="flex flex-col gap-2"
											initial={{ opacity: 0, y: 10 }}
											transition={{ delay: 0.15 }}
										>
											<label
												className="text-sm font-medium"
												htmlFor="file-title"
											>
												Title (optional)
											</label>
											<fileUploadForm.Field name="title">
												{({ state, handleChange, handleBlur }) => (
													<Input
														className="bg-black/5 border-black/10"
														id="file-title"
														onBlur={handleBlur}
														onChange={(e) => handleChange(e.target.value)}
														placeholder="Give this file a title"
														value={state.value}
													/>
												)}
											</fileUploadForm.Field>
										</motion.div>

										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className="flex flex-col gap-2"
											initial={{ opacity: 0, y: 10 }}
											transition={{ delay: 0.2 }}
										>
											<label
												className="text-sm font-medium"
												htmlFor="file-description"
											>
												Description (optional)
											</label>
											<fileUploadForm.Field name="description">
												{({ state, handleChange, handleBlur }) => (
													<Textarea
														className="bg-black/5 border-black/10 min-h-20 max-h-40 overflow-y-auto resize-none"
														id="file-description"
														onBlur={handleBlur}
														onChange={(e) => handleChange(e.target.value)}
														placeholder="Add notes or context about this file"
														value={state.value}
													/>
												)}
											</fileUploadForm.Field>
										</motion.div>
									</div>
						<div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-end w-full gap-4 mt-auto">
										<div className="flex items-end gap-4">
											{/* Left side - Project Selection */}
											<motion.div
												animate={{ opacity: 1, y: 0 }}
												className={`flex flex-col gap-2 flex-1 sm:flex-initial ${
													fileUploadMutation.isPending ? "opacity-50" : ""
												}`}
												initial={{ opacity: 0, y: 10 }}
												transition={{ delay: 0.25 }}
											>
												<fileUploadForm.Field name="project">
													{({ state, handleChange }) => (
														<ProjectSelection
															disabled={fileUploadMutation.isPending}
															id="file-project"
															isLoading={isLoadingProjects}
															onCreateProject={() =>
																setShowCreateProjectDialog(true)
															}
															onProjectChange={handleChange}
															projects={projects}
															selectedProject={state.value}
														/>
													)}
												</fileUploadForm.Field>
											</motion.div>

											<MemoryUsageRing
												memoriesLimit={memoriesLimit}
												memoriesUsed={memoriesUsed}
											/>
										</div>

										<ActionButtons
											isSubmitDisabled={selectedFiles.length === 0}
											isSubmitting={fileUploadMutation.isPending}
											onCancel={() => {
												setShowAddDialog(false)
												onClose?.()
												fileUploadForm.reset()
												setSelectedFiles([])
											}}
											submitIcon={UploadIcon}
											submitText="Upload File"
										/>
									</div>
								</form>
							</TabsContent>

							<TabsContent value="connect" className="space-y-4">
								<ConnectionsTabContent />
							</TabsContent>
						</Tabs>
					</DialogContent>
				</Dialog>
			)}

			{/* Create Project Dialog */}
			{showCreateProjectDialog && (
				<Dialog
					key="create-project-dialog"
					onOpenChange={setShowCreateProjectDialog}
					open={showCreateProjectDialog}
				>
					<DialogContent className="w-[95vw] max-w-2xl sm:max-w-2xl bg-black/90 backdrop-blur-xl border-white/10 z-[80] max-h-[90vh] overflow-y-auto">
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							initial={{ opacity: 0, scale: 0.95 }}
						>
							<DialogHeader>
								<DialogTitle>Create New Project</DialogTitle>
								<DialogDescription className="text-white/60">
									Give your project a unique name
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<motion.div
									animate={{ opacity: 1, y: 0 }}
									className="flex flex-col gap-2"
									initial={{ opacity: 0, y: 10 }}
									transition={{ delay: 0.1 }}
								>
									<Label htmlFor="projectName">Project Name</Label>
									<Input
										id="projectName"
										onChange={(e) => setNewProjectName(e.target.value)}
										placeholder="My Awesome Project"
										value={newProjectName}
									/>
									<p className="text-xs text-white/50">
										This will help you organize your memories
									</p>
								</motion.div>
							</div>
							<DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0">
								<motion.div
									className="w-full sm:w-auto"
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									<Button
										className="bg-white/5 hover:bg-white/10 border-white/10 w-full sm:w-auto cursor-pointer"
										onClick={() => {
											setShowCreateProjectDialog(false)
											setNewProjectName("")
										}}
										type="button"
										variant="outline"
									>
										Cancel
									</Button>
								</motion.div>
								<motion.div
									className="w-full sm:w-auto"
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									<Button
										className="bg-white/10 hover:bg-white/20 border-white/20 w-full sm:w-auto cursor-pointer"
										disabled={
											createProjectMutation.isPending || !newProjectName.trim()
										}
										onClick={() => createProjectMutation.mutate(newProjectName)}
										type="button"
									>
										{createProjectMutation.isPending ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin mr-2" />
												Creating...
											</>
										) : (
											"Create Project"
										)}
									</Button>
								</motion.div>
							</DialogFooter>
						</motion.div>
					</DialogContent>
				</Dialog>
			)}
		</AnimatePresence>
	)
}

export function AddMemoryExpandedView() {
	const [showDialog, setShowDialog] = useState(false)
	const [selectedTab, setSelectedTab] = useState<
		"note" | "link" | "file" | "connect"
	>("note")

	const handleOpenDialog = (tab: "note" | "link" | "file" | "connect") => {
		setSelectedTab(tab)
		setShowDialog(true)
	}

	return (
		<>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="space-y-6"
				initial={{ opacity: 0, y: 10 }}
			>
				<p className="text-sm text-white/70">
					Save any webpage, article, or file to your memory
				</p>

				<div className="flex flex-wrap gap-2">
					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<Button
							className="bg-white/10 hover:bg-white/20 border-white/20 cursor-pointer"
							onClick={() => handleOpenDialog("note")}
							size="sm"
							variant="outline"
						>
							<Brain className="h-4 w-4 mr-2" />
							Note
						</Button>
					</motion.div>

					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<Button
							className="bg-white/10 hover:bg-white/20 border-white/20 cursor-pointer"
							onClick={() => handleOpenDialog("link")}
							size="sm"
							variant="outline"
						>
							<LinkIcon className="h-4 w-4 mr-2" />
							Link
						</Button>
					</motion.div>

					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<Button
							className="bg-white/10 hover:bg-white/20 border-white/20 cursor-pointer"
							onClick={() => handleOpenDialog("file")}
							size="sm"
							variant="outline"
						>
							<FileIcon className="h-4 w-4 mr-2" />
							File
						</Button>
					</motion.div>

					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<Button
							className="bg-white/10 hover:bg-white/20 border-white/20 cursor-pointer"
							onClick={() => handleOpenDialog("connect")}
							size="sm"
							variant="outline"
						>
							<PlugIcon className="h-4 w-4 mr-2" />
							Connect
						</Button>
					</motion.div>
				</div>
			</motion.div>

			{showDialog && (
				<AddMemoryView
					initialTab={selectedTab}
					onClose={() => setShowDialog(false)}
				/>
			)}
		</>
	)
}
