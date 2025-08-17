import { $fetch } from "@lib/api"
import {
	fetchConsumerProProduct,
	fetchMemoriesFeature,
} from "@repo/lib/queries"
import { Button } from "@repo/ui/components/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@repo/ui/components/tabs"
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
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { useProject } from "@/stores"
import { ConnectionsTabContent } from "./connections-tab-content"
import { analytics } from "@/lib/analytics"

// // Processing status component
// function ProcessingStatus({ status }: { status: string }) {
// 	const statusConfig = {
// 		queued: { color: "text-yellow-400", label: "Queued", icon: "⏳" },
// 		extracting: { color: "text-blue-400", label: "Extracting", icon: "📤" },
// 		chunking: { color: "text-indigo-400", label: "Chunking", icon: "✂️" },
// 		embedding: { color: "text-purple-400", label: "Embedding", icon: "🧠" },
// 		indexing: { color: "text-pink-400", label: "Indexing", icon: "📝" },
// 		unknown: { color: "text-gray-400", label: "Processing", icon: "⚙️" },
// 	}

// 	const config =
// 		statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown

// 	return (
// 		<div className={`flex items-center gap-1 text-xs ${config.color}`}>
// 			<span>{config.icon}</span>
// 			<span>{config.label}</span>
// 		</div>
// 	)
// }

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
	const { data: memoriesCheck } = fetchMemoriesFeature(autumn as any)

	const memoriesUsed = memoriesCheck?.usage ?? 0
	const memoriesLimit = memoriesCheck?.included_usage ?? 0

	// Check if user is pro
	const { data: proCheck } = fetchConsumerProProduct(autumn as any)
	const isProUser = proCheck?.allowed ?? false

	const canAddMemory = memoriesUsed < memoriesLimit

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

	const handleUpgrade = async () => {
		try {
			await autumn.attach({
				productId: "consumer_pro",
				successUrl: "https://app.supermemory.ai/",
			})
			window.location.reload()
		} catch (error) {
			console.error(error)
		}
	}

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
				const response = await $fetch("@post/memories", {
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
								"@get/memories/" + memoryId,
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
					throw new Error("Memory processing timed out. Please check back later.")
				}

				// Wait for completion
				const completedMemory = await pollForCompletion()
				return completedMemory
			})()

			toast.promise(processingPromise, {
				loading: "Processing...",
				success: `${contentType === "link" ? "Link" : "Note"} created successfully!`,
				error: (err) => `Failed to add ${contentType}: ${err instanceof Error ? err.message : "Unknown error"}`,
			})

			return processingPromise
		},
		onMutate: async ({ content, project, contentType }) => {
			console.log("🚀 onMutate starting...")

			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: ["documents-with-memories", project] })
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
				description: contentType === "link" ? "Extracting content..." : "Processing content...",
				containerTags: [project],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				status: "queued",
				type: contentType,
				metadata: {
					processingStage: "queued",
					processingMessage: "Added to processing queue"
				},
				memoryEntries: [],
				isOptimistic: true,
			}
			console.log("🎯 Created optimistic memory:", optimisticMemory)

			// Optimistically update to include the new memory
			queryClient.setQueryData(["documents-with-memories", project], (old: any) => {
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
			})

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
			
			queryClient.invalidateQueries({ queryKey: ["documents-with-memories", variables.project] })
			
			setTimeout(() => {
				queryClient.invalidateQueries({ queryKey: ["documents-with-memories", variables.project] })
			}, 30000) // 30 seconds
			
			setTimeout(() => {
				queryClient.invalidateQueries({ queryKey: ["documents-with-memories", variables.project] })
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

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/v3/memories/file`,
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
				await $fetch(`@patch/memories/${data.id}`, {
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
			await queryClient.cancelQueries({ queryKey: ["documents-with-memories", project] })

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
			queryClient.setQueryData(["documents-with-memories", project], (old: any) => {
				if (!old) return { documents: [optimisticMemory], totalCount: 1 }
				return {
					...old,
					documents: [optimisticMemory, ...(old.documents || [])],
					totalCount: (old.totalCount || 0) + 1,
				}
			})

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
					<DialogContent className="sm:max-w-3xl bg-[#0f1419] backdrop-blur-xl border-white/10 text-white z-[80]">
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							initial={{ opacity: 0, scale: 0.95 }}
						>
							<DialogHeader>
								<DialogTitle>Add to Memory</DialogTitle>
								<DialogDescription className="text-white/60">
									Save any webpage, article, or file to your memory
								</DialogDescription>
								{
									<motion.div
										animate={{ opacity: 1, y: 0 }}
										className="mt-2"
										initial={{ opacity: 0, y: -10 }}
									>
										<div className="text-xs text-white/50">
											{memoriesUsed} of {memoriesLimit} memories used
											{!isProUser && memoriesUsed >= memoriesLimit * 0.8 && (
												<span className="text-yellow-400 ml-2">
													• {memoriesLimit - memoriesUsed} remaining
												</span>
											)}
										</div>
										{!canAddMemory && !isProUser && (
											<motion.div
												animate={{ opacity: 1, height: "auto" }}
												className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
												initial={{ opacity: 0, height: 0 }}
											>
												<p className="text-sm text-yellow-400">
													You've reached the free plan limit.
													<Button
														asChild
														className="text-yellow-400 hover:text-yellow-300 px-2"
														onClick={handleUpgrade}
														size="sm"
														variant="link"
													>
														Upgrade to Pro
													</Button>
													for up to 5000 memories.
												</p>
											</motion.div>
										)}
									</motion.div>
								}
							</DialogHeader>

							<Tabs
								className="mt-4"
								onValueChange={(v) =>
									setActiveTab(v as "note" | "link" | "file" | "connect")
								}
								value={activeTab}
							>
								<TabsList className="grid w-full grid-cols-4 bg-white/5">
									<TabsTrigger
										className="data-[state=active]:bg-white/10"
										value="note"
									>
										<Brain className="h-4 w-4 mr-2" />
										Note
									</TabsTrigger>
									<TabsTrigger
										className="data-[state=active]:bg-white/10"
										value="link"
									>
										<LinkIcon className="h-4 w-4 mr-2" />
										Link
									</TabsTrigger>
									<TabsTrigger
										className="data-[state=active]:bg-white/10"
										value="file"
									>
										<FileIcon className="h-4 w-4 mr-2" />
										File
									</TabsTrigger>
									<TabsTrigger
										className="data-[state=active]:bg-white/10"
										value="connect"
									>
										<PlugIcon className="h-4 w-4 mr-2" />
										Connect
									</TabsTrigger>
								</TabsList>

								<TabsContent className="space-y-4 mt-4" value="note">
									<form
										onSubmit={(e) => {
											e.preventDefault()
											e.stopPropagation()
											addContentForm.handleSubmit()
										}}
									>
										<div className="grid gap-4">
											{/* Note Input */}
											<motion.div
												animate={{ opacity: 1, y: 0 }}
												className="flex flex-col gap-2"
												initial={{ opacity: 0, y: 10 }}
												transition={{ delay: 0.1 }}
											>
												<label
													className="text-sm font-medium"
													htmlFor="note-content"
												>
													Note
												</label>
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
															<Textarea
																className={`bg-white/5 border-white/10 text-white min-h-32 max-h-64 overflow-y-auto resize-none ${addContentMutation.isPending
																	? "opacity-50"
																	: ""
																	}`}
																disabled={addContentMutation.isPending}
																id="note-content"
																onBlur={handleBlur}
																onChange={(e) => handleChange(e.target.value)}
																placeholder="Write your note here..."
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

											{/* Project Selection */}
											<motion.div
												animate={{ opacity: 1, y: 0 }}
												className={`flex flex-col gap-2 ${addContentMutation.isPending ? "opacity-50" : ""
													}`}
												initial={{ opacity: 0, y: 10 }}
												transition={{ delay: 0.15 }}
											>
												<label
													className="text-sm font-medium"
													htmlFor="note-project"
												>
													Project
												</label>
												<addContentForm.Field name="project">
													{({ state, handleChange }) => (
														<Select
															disabled={
																isLoadingProjects ||
																addContentMutation.isPending
															}
															onValueChange={(value) => {
																if (value === "create-new-project") {
																	setShowCreateProjectDialog(true)
																} else {
																	handleChange(value)
																}
															}}
															value={state.value}
														>
															<SelectTrigger
																className="bg-white/5 border-white/10 text-white"
																id="note-project"
															>
																<SelectValue placeholder="Select a project" />
															</SelectTrigger>
															<SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
																<SelectItem
																	className="text-white hover:bg-white/10"
																	key="default"
																	value="sm_project_default"
																>
																	Default Project
																</SelectItem>
																{projects
																	.filter(
																		(p) =>
																			p.containerTag !== "sm_project_default" &&
																			p.id,
																	)
																	.map((project) => (
																		<SelectItem
																			className="text-white hover:bg-white/10"
																			key={project.id || project.containerTag}
																			value={project.containerTag}
																		>
																			{project.name}
																		</SelectItem>
																	))}
																<SelectItem
																	className="text-white hover:bg-white/10 border-t border-white/10 mt-1"
																	key="create-new"
																	value="create-new-project"
																>
																	<div className="flex items-center gap-2">
																		<Plus className="h-4 w-4" />
																		<span>Create new project</span>
																	</div>
																</SelectItem>
															</SelectContent>
														</Select>
													)}
												</addContentForm.Field>
												<p className="text-xs text-white/50 mt-1">
													Choose which project to save this note to
												</p>
											</motion.div>
										</div>
										<DialogFooter className="mt-6">
											<motion.div
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
											>
												<Button
													className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
													onClick={() => {
														setShowAddDialog(false)
														onClose?.()
														addContentForm.reset()
													}}
													type="button"
													variant="outline"
												>
													Cancel
												</Button>
											</motion.div>
											<motion.div
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
											>
												<Button
													className="bg-white/10 hover:bg-white/20 text-white border-white/20"
													disabled={
														addContentMutation.isPending ||
														!addContentForm.state.canSubmit
													}
													type="submit"
												>
													{addContentMutation.isPending ? (
														<>
															<Loader2 className="h-4 w-4 animate-spin mr-2" />
															Adding...
														</>
													) : (
														<>
															<Plus className="h-4 w-4 mr-2" />
															Add Note
														</>
													)}
												</Button>
											</motion.div>
										</DialogFooter>
									</form>
								</TabsContent>

								<TabsContent className="space-y-4 mt-4" value="link">
									<form
										onSubmit={(e) => {
											e.preventDefault()
											e.stopPropagation()
											addContentForm.handleSubmit()
										}}
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
																className={`bg-white/5 border-white/10 text-white ${addContentMutation.isPending
																	? "opacity-50"
																	: ""
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

											{/* Project Selection */}
											<motion.div
												animate={{ opacity: 1, y: 0 }}
												className={`flex flex-col gap-2 ${addContentMutation.isPending ? "opacity-50" : ""
													}`}
												initial={{ opacity: 0, y: 10 }}
												transition={{ delay: 0.15 }}
											>
												<label
													className="text-sm font-medium"
													htmlFor="link-project"
												>
													Project
												</label>
												<addContentForm.Field name="project">
													{({ state, handleChange }) => (
														<Select
															disabled={
																isLoadingProjects ||
																addContentMutation.isPending
															}
															onValueChange={(value) => {
																if (value === "create-new-project") {
																	setShowCreateProjectDialog(true)
																} else {
																	handleChange(value)
																}
															}}
															value={state.value}
														>
															<SelectTrigger
																className="bg-white/5 border-white/10 text-white"
																id="link-project"
															>
																<SelectValue placeholder="Select a project" />
															</SelectTrigger>
															<SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
																<SelectItem
																	className="text-white hover:bg-white/10"
																	key="default"
																	value="sm_project_default"
																>
																	Default Project
																</SelectItem>
																{projects
																	.filter(
																		(p) =>
																			p.containerTag !== "sm_project_default" &&
																			p.id,
																	)
																	.map((project) => (
																		<SelectItem
																			className="text-white hover:bg-white/10"
																			key={project.id || project.containerTag}
																			value={project.containerTag}
																		>
																			{project.name}
																		</SelectItem>
																	))}
																<SelectItem
																	className="text-white hover:bg-white/10 border-t border-white/10 mt-1"
																	key="create-new"
																	value="create-new-project"
																>
																	<div className="flex items-center gap-2">
																		<Plus className="h-4 w-4" />
																		<span>Create new project</span>
																	</div>
																</SelectItem>
															</SelectContent>
														</Select>
													)}
												</addContentForm.Field>
												<p className="text-xs text-white/50 mt-1">
													Choose which project to save this link to
												</p>
											</motion.div>
										</div>
										<DialogFooter className="mt-6">
											<motion.div
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
											>
												<Button
													className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
													onClick={() => {
														setShowAddDialog(false)
														onClose?.()
														addContentForm.reset()
													}}
													type="button"
													variant="outline"
												>
													Cancel
												</Button>
											</motion.div>
											<motion.div
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
											>
												<Button
													className="bg-white/10 hover:bg-white/20 text-white border-white/20"
													disabled={
														addContentMutation.isPending ||
														!addContentForm.state.canSubmit
													}
													type="submit"
												>
													{addContentMutation.isPending ? (
														<>
															<Loader2 className="h-4 w-4 animate-spin mr-2" />
															Adding...
														</>
													) : (
														<>
															<Plus className="h-4 w-4 mr-2" />
															Add Link
														</>
													)}
												</Button>
											</motion.div>
										</DialogFooter>
									</form>
								</TabsContent>

								<TabsContent className="space-y-4 mt-4" value="file">
									<form
										onSubmit={(e) => {
											e.preventDefault()
											e.stopPropagation()
											fileUploadForm.handleSubmit()
										}}
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
														"image/*": [
															".png",
															".jpg",
															".jpeg",
															".gif",
															".webp",
														],
													}}
													className="bg-white/5 border-white/10 hover:bg-white/10 min-h-40"
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
															className="bg-white/5 border-white/10 text-white"
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
															className="bg-white/5 border-white/10 text-white min-h-20 max-h-40 overflow-y-auto resize-none"
															id="file-description"
															onBlur={handleBlur}
															onChange={(e) => handleChange(e.target.value)}
															placeholder="Add notes or context about this file"
															value={state.value}
														/>
													)}
												</fileUploadForm.Field>
											</motion.div>

											<motion.div
												animate={{ opacity: 1, y: 0 }}
												className="flex flex-col gap-2"
												initial={{ opacity: 0, y: 10 }}
												transition={{ delay: 0.25 }}
											>
												<label
													className="text-sm font-medium"
													htmlFor="file-project"
												>
													Project
												</label>
												<fileUploadForm.Field name="project">
													{({ state, handleChange }) => (
														<Select
															disabled={isLoadingProjects}
															onValueChange={(value) => {
																if (value === "create-new-project") {
																	setShowCreateProjectDialog(true)
																} else {
																	handleChange(value)
																}
															}}
															value={state.value}
														>
															<SelectTrigger
																className="bg-white/5 border-white/10 text-white"
																id="file-project"
															>
																<SelectValue placeholder="Select a project" />
															</SelectTrigger>
															<SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
																<SelectItem
																	className="text-white hover:bg-white/10"
																	key="default"
																	value="sm_project_default"
																>
																	Default Project
																</SelectItem>
																{projects
																	.filter(
																		(p) =>
																			p.containerTag !== "sm_project_default" &&
																			p.id,
																	)
																	.map((project) => (
																		<SelectItem
																			className="text-white hover:bg-white/10"
																			key={project.id || project.containerTag}
																			value={project.containerTag}
																		>
																			{project.name}
																		</SelectItem>
																	))}
																<SelectItem
																	className="text-white hover:bg-white/10 border-t border-white/10 mt-1"
																	key="create-new"
																	value="create-new-project"
																>
																	<div className="flex items-center gap-2">
																		<Plus className="h-4 w-4" />
																		<span>Create new project</span>
																	</div>
																</SelectItem>
															</SelectContent>
														</Select>
													)}
												</fileUploadForm.Field>
												<p className="text-xs text-white/50 mt-1">
													Choose which project to save this file to
												</p>
											</motion.div>
										</div>
										<DialogFooter className="mt-6">
											<motion.div
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
											>
												<Button
													className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
													onClick={() => {
														setShowAddDialog(false)
														onClose?.()
														fileUploadForm.reset()
														setSelectedFiles([])
													}}
													type="button"
													variant="outline"
												>
													Cancel
												</Button>
											</motion.div>
											<motion.div
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
											>
												<Button
													className="bg-white/10 hover:bg-white/20 text-white border-white/20"
													disabled={
														fileUploadMutation.isPending ||
														selectedFiles.length === 0
													}
													type="submit"
												>
													{fileUploadMutation.isPending ? (
														<>
															<Loader2 className="h-4 w-4 animate-spin mr-2" />
															Uploading...
														</>
													) : (
														<>
															<UploadIcon className="h-4 w-4 mr-2" />
															Upload File
														</>
													)}
												</Button>
											</motion.div>
										</DialogFooter>
									</form>
								</TabsContent>

								<TabsContent className="space-y-4 mt-4" value="connect">
									<ConnectionsTabContent />
								</TabsContent>
							</Tabs>
						</motion.div>
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
					<DialogContent className="sm:max-w-2xl bg-black/90 backdrop-blur-xl border-white/10 text-white z-[80]">
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
										className="bg-white/5 border-white/10 text-white"
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
							<DialogFooter>
								<motion.div
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									<Button
										className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
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
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									<Button
										className="bg-white/10 hover:bg-white/20 text-white border-white/20"
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
							className="bg-white/10 hover:bg-white/20 text-white border-white/20"
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
							className="bg-white/10 hover:bg-white/20 text-white border-white/20"
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
							className="bg-white/10 hover:bg-white/20 text-white border-white/20"
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
							className="bg-white/10 hover:bg-white/20 text-white border-white/20"
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
