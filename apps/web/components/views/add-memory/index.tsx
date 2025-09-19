import { $fetch } from "@lib/api";
import {
	fetchConsumerProProduct,
	fetchMemoriesFeature,
} from "@repo/lib/queries";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState,
} from "@ui/components/shadcn-io/dropzone";
import { useCustomer } from "autumn-js/react";
import {
	Brain,
	FileIcon,
	Link as LinkIcon,
	Loader2,
	PlugIcon,
	Plus,
	UploadIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { analytics } from "@/lib/analytics";
import { useProject } from "@/stores";
import { ConnectionsTabContent } from "../connections-tab-content";
import { ActionButtons } from "./action-buttons";
import { MemoryUsageRing } from "./memory-usage-ring";
import { ProjectSelection } from "./project-selection";
import { TabButton } from "./tab-button";

const TextEditor = dynamic(
	() => import("./text-editor").then((mod) => ({ default: mod.TextEditor })),
	{
		loading: () => (
			<div className="bg-white/5 border border-white/10 rounded-md">
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
);

// Simple function to extract plain text title from HTML content
const getPlainTextTitle = (htmlContent: string) => {
	const temp = document.createElement("div");
	temp.innerHTML = htmlContent;
	const plainText = temp.textContent || temp.innerText || htmlContent;
	const firstLine = plainText.split("\n")[0].trim();
	return firstLine.length > 0
		? firstLine.substring(0, 100)
		: plainText.substring(0, 100);
};

export function AddMemoryView({
	onClose,
	initialTab = "note",
}: {
	onClose?: () => void;
	initialTab?: "note" | "link" | "file" | "connect";
}) {
	const queryClient = useQueryClient();
	const { selectedProject, setSelectedProject } = useProject();
	const [showAddDialog, setShowAddDialog] = useState(true);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [activeTab, setActiveTab] = useState<
		"note" | "link" | "file" | "connect"
	>(initialTab);
	const autumn = useCustomer();
	const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
	const [newProjectName, setNewProjectName] = useState("");

	// Check memory limits
	const { data: memoriesCheck } = fetchMemoriesFeature(autumn);

	const memoriesUsed = memoriesCheck?.usage ?? 0;
	const memoriesLimit = memoriesCheck?.included_usage ?? 0;

	// Fetch projects for the dropdown
	const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const response = await $fetch("@get/projects");

			if (response.error) {
				throw new Error(response.error?.message || "Failed to load projects");
			}

			return response.data?.projects || [];
		},
		staleTime: 30 * 1000,
	});

	// Create project mutation
	const createProjectMutation = useMutation({
		mutationFn: async (name: string) => {
			const response = await $fetch("@post/projects", {
				body: { name },
			});

			if (response.error) {
				throw new Error(response.error?.message || "Failed to create project");
			}

			return response.data;
		},
		onSuccess: (data) => {
			analytics.projectCreated();
			toast.success("Project created successfully!");
			setShowCreateProjectDialog(false);
			setNewProjectName("");
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			// Set the newly created project as selected
			if (data?.containerTag) {
				setSelectedProject(data.containerTag);
				// Update form values
				addContentForm.setFieldValue("project", data.containerTag);
				fileUploadForm.setFieldValue("project", data.containerTag);
			}
		},
		onError: (error) => {
			toast.error("Failed to create project", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

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
			});
			formApi.reset();
		},
		validators: {
			onChange: z.object({
				content: z.string().min(1, "Content is required"),
				project: z.string(),
			}),
		},
	});

	// Re-validate content field when tab changes between note/link
	// biome-ignore  lint/correctness/useExhaustiveDependencies: It is what it is
	useEffect(() => {
		// Trigger validation of the content field when switching between note/link
		if (activeTab === "note" || activeTab === "link") {
			const currentValue = addContentForm.getFieldValue("content");
			if (currentValue) {
				addContentForm.validateField("content", "change");
			}
		}
	}, [activeTab]);

	// Form for file upload metadata
	const fileUploadForm = useForm({
		defaultValues: {
			title: "",
			description: "",
			project: selectedProject || "sm_project_default",
		},
		onSubmit: async ({ value, formApi }) => {
			if (selectedFiles.length === 0) {
				toast.error("Please select a file to upload");
				return;
			}

			for (const file of selectedFiles) {
				fileUploadMutation.mutate({
					file,
					title: value.title || undefined,
					description: value.description || undefined,
					project: value.project,
				});
			}

			formApi.reset();
			setSelectedFiles([]);
		},
	});

	const addContentMutation = useMutation({
		mutationFn: async ({
			content,
			project,
			contentType,
		}: {
			content: string;
			project: string;
			contentType: "note" | "link";
		}) => {
			console.log("📤 Creating memory...");

			const response = await $fetch("@post/documents", {
				body: {
					content: content,
					containerTags: [project],
					metadata: {
						sm_source: "consumer",
					},
				},
			});

			if (response.error) {
				throw new Error(
					response.error?.message || `Failed to add ${contentType}`,
				);
			}

			console.log("✅ Memory created:", response.data);
			return response.data;
		},
		onMutate: async ({ content, project, contentType }) => {
			console.log("🚀 OPTIMISTIC UPDATE: Starting for", contentType);

			// Cancel queries to prevent conflicts
			await queryClient.cancelQueries({
				queryKey: ["documents-with-memories", project],
			});
			console.log("📞 QUERIES CANCELLED for project:", project);

			// Get previous data for rollback
			const previousMemories = queryClient.getQueryData([
				"documents-with-memories",
				project,
			]);

			// Create optimistic memory with proper title
			const tempId = `temp-${Date.now()}`;
			const optimisticMemory = {
				id: tempId,
				content: contentType === "link" ? "" : content,
				url: contentType === "link" ? content : null,
				title:
					contentType === "link" ? "Processing..." : getPlainTextTitle(content),
				description: "Processing...",
				containerTags: [project],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				memoryEntries: [],
				isOptimistic: true,
			};

			console.log("🎯 Adding optimistic memory:", optimisticMemory);

			// Add to cache optimistically
			queryClient.setQueryData(
				["documents-with-memories", project],
				(old: any) => {
					if (old?.pages) {
						// Infinite query structure
						const newPages = [...old.pages];
						if (newPages.length > 0) {
							newPages[0] = {
								...newPages[0],
								documents: [optimisticMemory, ...(newPages[0].documents || [])],
							};
						} else {
							newPages.push({
								documents: [optimisticMemory],
								pagination: { currentPage: 1, totalPages: 1, totalCount: 1 },
							});
						}
						return { ...old, pages: newPages };
					}

					// Regular query structure
					return old
						? {
								...old,
								documents: [optimisticMemory, ...(old.documents || [])],
								totalCount: (old.totalCount || 0) + 1,
							}
						: { documents: [optimisticMemory], totalCount: 1 };
				},
			);

			return { previousMemories, optimisticId: tempId };
		},
		onError: (error, variables, context) => {
			console.log("❌ Mutation failed, rolling back");
			if (context?.previousMemories) {
				queryClient.setQueryData(
					["documents-with-memories", variables.project],
					context.previousMemories,
				);
			}
			toast.error(`Failed to add ${variables.contentType}`);
		},
		onSuccess: (data, variables, context) => {
			console.log(
				"✅ Mutation succeeded, starting simple polling for memory:",
				data.id,
			);
			analytics.memoryAdded({
				type: variables.contentType === "link" ? "link" : "note",
				project_id: variables.project,
				content_length: variables.content.length,
			});

			toast.success(
				`${variables.contentType === "link" ? "Link" : "Note"} added successfully!`,
			);
			setShowAddDialog(false);
			onClose?.();

			// Simple polling to replace optimistic update when ready
			const pollMemory = async () => {
				try {
					const memory = await $fetch(`@get/documents/${data.id}`);
					console.log("🔍 Polling memory:", memory.data);

					if (memory.data && !memory.error) {
						// Check if memory has been processed (has memory entries, substantial content, and NOT untitled/processing)
						const hasRealTitle =
							memory.data.title &&
							!memory.data.title.toLowerCase().includes("untitled") &&
							!memory.data.title.toLowerCase().includes("processing") &&
							memory.data.title.length > 3;

						const isReady =
							memory.data.memoryEntries?.length > 0 ||
							(memory.data.content &&
								memory.data.content.length > 10 &&
								hasRealTitle);

						console.log("📊 Memory ready check:", {
							isReady,
							hasMemoryEntries: memory.data.memoryEntries?.length,
							hasContent: memory.data.content?.length,
							title: memory.data.title,
							hasRealTitle,
							titleNotUntitled:
								memory.data.title &&
								!memory.data.title.toLowerCase().includes("untitled"),
							titleNotProcessing:
								memory.data.title &&
								!memory.data.title.toLowerCase().includes("processing"),
						});

						if (isReady) {
							console.log("✅ Memory ready, replacing optimistic update");
							// Replace optimistic memory with real data
							queryClient.setQueryData(
								["documents-with-memories", variables.project],
								(old: any) => {
									if (old?.pages) {
										const newPages = old.pages.map((page: any) => ({
											...page,
											documents: page.documents.map((doc: any) => {
												if (doc.isOptimistic && doc.id.startsWith("temp-")) {
													return { ...memory.data, isOptimistic: false };
												}
												return doc;
											}),
										}));
										return { ...old, pages: newPages };
									}
									return old;
								},
							);
							return true; // Stop polling
						}
					}
					return false; // Continue polling
				} catch (error) {
					console.error("❌ Error polling memory:", error);
					return false;
				}
			};

			// Poll every 3 seconds for up to 30 attempts (90 seconds)
			let attempts = 0;
			const maxAttempts = 30;

			const poll = async () => {
				if (attempts >= maxAttempts) {
					console.log("⚠️ Polling stopped after max attempts");
					return;
				}

				const isDone = await pollMemory();
				attempts++;

				if (!isDone && attempts < maxAttempts) {
					setTimeout(poll, 3000);
				}
			};

			// Start polling after 2 seconds
			setTimeout(poll, 2000);
		},
	});

	const fileUploadMutation = useMutation({
		mutationFn: async ({
			file,
			title,
			description,
			project,
		}: {
			file: File;
			title?: string;
			description?: string;
			project: string;
		}) => {
			// TEMPORARILY DISABLED: Limit check disabled
			// Check if user can add more memories
			// if (!canAddMemory && !isProUser) {
			// 	throw new Error(
			// 		`Free plan limit reached (${memoriesLimit} memories). Upgrade to Pro for up to 500 memories.`,
			// 	);
			// }

			const formData = new FormData();
			formData.append("file", file);
			formData.append("containerTags", JSON.stringify([project]));

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/v3/documents/file`,
				{
					method: "POST",
					body: formData,
					credentials: "include",
				},
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to upload file");
			}

			const data = await response.json();

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
				});
			}

			return data;
		},
		// Optimistic update
		onMutate: async ({ file, title, description, project }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: ["documents-with-memories", project],
			});

			// Snapshot the previous value
			const previousMemories = queryClient.getQueryData([
				"documents-with-memories",
				project,
			]);

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
			};

			// Optimistically update to include the new memory
			queryClient.setQueryData(
				["documents-with-memories", project],
				(old: any) => {
					// Handle infinite query structure
					if (old?.pages) {
						// This is an infinite query - add to the first page
						const newPages = [...old.pages];
						if (newPages.length > 0) {
							// Add to the first page
							const firstPage = { ...newPages[0] };
							firstPage.documents = [
								optimisticMemory,
								...(firstPage.documents || []),
							];
							newPages[0] = firstPage;
						} else {
							// No pages yet, create the first page
							newPages.push({
								documents: [optimisticMemory],
								pagination: { currentPage: 1, totalPages: 1, totalCount: 1 },
								totalCount: 1,
							});
						}

						return {
							...old,
							pages: newPages,
						};
					}
					// Fallback for regular query structure
					if (!old) return { documents: [optimisticMemory], totalCount: 1 };
					return {
						...old,
						documents: [optimisticMemory, ...(old.documents || [])],
						totalCount: (old.totalCount || 0) + 1,
					};
				},
			);

			// Return a context object with the snapshotted value
			return { previousMemories };
		},
		// If the mutation fails, roll back to the previous value
		onError: (error, variables, context) => {
			if (context?.previousMemories) {
				queryClient.setQueryData(
					["documents-with-memories", variables.project],
					context.previousMemories,
				);
			}
			toast.error("Failed to upload file", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
		onSuccess: (_data, variables) => {
			analytics.memoryAdded({
				type: "file",
				project_id: variables.project,
				file_size: variables.file.size,
				file_type: variables.file.type,
			});
			toast.success("File uploaded successfully!", {
				description: "Your file is being processed",
			});
			setShowAddDialog(false);
			onClose?.();
		},
		// Don't invalidate queries immediately - let optimistic updates work
		// onSettled: () => {
		//   queryClient.invalidateQueries({ queryKey: ["documents-with-memories"] })
		// },
	});

	return (
		<AnimatePresence mode="wait">
			{showAddDialog && (
				<Dialog
					key="add-memory-dialog"
					onOpenChange={(open) => {
						setShowAddDialog(open);
						if (!open) onClose?.();
					}}
					open={showAddDialog}
				>
					<DialogContent
						className="w-[95vw] max-w-3xl sm:max-w-3xl bg-[#0f1419] backdrop-blur-xl border-white/10 text-white z-[80] max-h-[90vh] overflow-y-auto"
						showCloseButton={false}
					>
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							initial={{ opacity: 0, scale: 0.95 }}
						>
							<DialogHeader>
								<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
									<div className="flex-1">
										<DialogTitle className="text-base">
											Add to Memory
										</DialogTitle>
										<DialogDescription className="text-white/50">
											Save any webpage, article, or file to your memory
										</DialogDescription>
									</div>
									<div className="sm:ml-4 order-first sm:order-last">
										<div className="bg-white/5 p-1 h-10 sm:h-8 rounded-md flex overflow-x-auto">
											<TabButton
												icon={Brain}
												isActive={activeTab === "note"}
												label="Note"
												onClick={() => setActiveTab("note")}
											/>
											<TabButton
												icon={LinkIcon}
												isActive={activeTab === "link"}
												label="Link"
												onClick={() => setActiveTab("link")}
											/>
											<TabButton
												icon={FileIcon}
												isActive={activeTab === "file"}
												label="File"
												onClick={() => setActiveTab("file")}
											/>
											<TabButton
												icon={PlugIcon}
												isActive={activeTab === "connect"}
												label="Connect"
												onClick={() => setActiveTab("connect")}
											/>
										</div>
									</div>
								</div>
							</DialogHeader>

							<div className="mt-4">
								{activeTab === "note" && (
									<div className="space-y-4">
										<form
											onSubmit={(e) => {
												e.preventDefault();
												e.stopPropagation();
												addContentForm.handleSubmit();
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
													<addContentForm.Field
														name="content"
														validators={{
															onChange: ({ value }) => {
																if (!value || value.trim() === "") {
																	return "Note is required";
																}
																return undefined;
															},
														}}
													>
														{({ state, handleChange, handleBlur }) => (
															<>
																<div
																	className={`bg-white/5 border border-white/10 rounded-md ${
																		addContentMutation.isPending
																			? "opacity-50"
																			: ""
																	}`}
																>
																	<TextEditor
																		className="text-white"
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
											<div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-end w-full gap-4">
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
														setShowAddDialog(false);
														onClose?.();
														addContentForm.reset();
													}}
													submitIcon={Plus}
													submitText="Add Note"
												/>
											</div>
										</form>
									</div>
								)}

								{activeTab === "link" && (
									<div className="space-y-4">
										<form
											onSubmit={(e) => {
												e.preventDefault();
												e.stopPropagation();
												addContentForm.handleSubmit();
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
																	return "Link is required";
																}
																try {
																	new URL(value);
																	return undefined;
																} catch {
																	return "Please enter a valid link";
																}
															},
														}}
													>
														{({ state, handleChange, handleBlur }) => (
															<>
																<Input
																	className={`bg-white/5 border-white/10 text-white ${
																		addContentMutation.isPending
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
											</div>
											<div className="mt-6 flex justify-between items-end w-full">
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
														setShowAddDialog(false);
														onClose?.();
														addContentForm.reset();
													}}
													submitIcon={Plus}
													submitText="Add Link"
												/>
											</div>
										</form>
									</div>
								)}

								{activeTab === "file" && (
									<div className="space-y-4">
										<form
											onSubmit={(e) => {
												e.preventDefault();
												e.stopPropagation();
												fileUploadForm.handleSubmit();
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
											</div>
											<div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-end w-full gap-4">
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
														setShowAddDialog(false);
														onClose?.();
														fileUploadForm.reset();
														setSelectedFiles([]);
													}}
													submitIcon={UploadIcon}
													submitText="Upload File"
												/>
											</div>
										</form>
									</div>
								)}

								{activeTab === "connect" && (
									<div className="space-y-4">
										<ConnectionsTabContent />
									</div>
								)}
							</div>
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
					<DialogContent className="w-[95vw] max-w-2xl sm:max-w-2xl bg-black/90 backdrop-blur-xl border-white/10 text-white z-[80] max-h-[90vh] overflow-y-auto">
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
							<DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0">
								<motion.div
									className="w-full sm:w-auto"
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									<Button
										className="bg-white/5 hover:bg-white/10 border-white/10 text-white w-full sm:w-auto"
										onClick={() => {
											setShowCreateProjectDialog(false);
											setNewProjectName("");
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
										className="bg-white/10 hover:bg-white/20 text-white border-white/20 w-full sm:w-auto"
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
	);
}

export function AddMemoryExpandedView() {
	const [showDialog, setShowDialog] = useState(false);
	const [selectedTab, setSelectedTab] = useState<
		"note" | "link" | "file" | "connect"
	>("note");

	const handleOpenDialog = (tab: "note" | "link" | "file" | "connect") => {
		setSelectedTab(tab);
		setShowDialog(true);
	};

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
	);
}
