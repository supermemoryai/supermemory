"use client"

import { $fetch } from "@lib/api"
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select"
import { Skeleton } from "@repo/ui/components/skeleton"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { FolderIcon, Loader2, MoreVertical, Plus, Trash2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { useState } from "react"
import { toast } from "sonner"
import { useProject } from "@/stores"

// Projects View Component
export function ProjectsView() {
	const queryClient = useQueryClient()
	const { selectedProject, setSelectedProject } = useProject()
	const [showCreateDialog, setShowCreateDialog] = useState(false)
	const [projectName, setProjectName] = useState("")
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean
		project: null | { id: string; name: string; containerTag: string }
		action: "move" | "delete"
		targetProjectId: string
	}>({
		open: false,
		project: null,
		action: "move",
		targetProjectId: "",
	})
	const [expDialog, setExpDialog] = useState<{
		open: boolean
		projectId: string
	}>({
		open: false,
		projectId: "",
	})

	// Fetch projects
	const {
		data: projects = [],
		isLoading,
		// error,
	} = useQuery({
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
		onSuccess: () => {
			toast.success("Project created successfully!")
			setShowCreateDialog(false)
			setProjectName("")
			queryClient.invalidateQueries({ queryKey: ["projects"] })
		},
		onError: (error) => {
			toast.error("Failed to create project", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	// Delete project mutation
	const deleteProjectMutation = useMutation({
		mutationFn: async ({
			projectId,
			action,
			targetProjectId,
		}: {
			projectId: string
			action: "move" | "delete"
			targetProjectId?: string
		}) => {
			const response = await $fetch(`@delete/projects/${projectId}`, {
				body: { action, targetProjectId },
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to delete project")
			}

			return response.data
		},
		onSuccess: () => {
			toast.success("Project deleted successfully")
			setDeleteDialog({
				open: false,
				project: null,
				action: "move",
				targetProjectId: "",
			})
			queryClient.invalidateQueries({ queryKey: ["projects"] })

			// If we deleted the selected project, switch to default
			if (deleteDialog.project?.containerTag === selectedProject) {
				setSelectedProject("sm_project_default")
			}
		},
		onError: (error) => {
			toast.error("Failed to delete project", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	// Enable experimental mode mutation
	const enableExperimentalMutation = useMutation({
		mutationFn: async (projectId: string) => {
			const response = await $fetch(
				`@post/projects/${projectId}/enable-experimental`,
			)
			if (response.error) {
				throw new Error(
					response.error?.message || "Failed to enable experimental mode",
				)
			}
			return response.data
		},
		onSuccess: () => {
			toast.success("Experimental mode enabled for project")
			queryClient.invalidateQueries({ queryKey: ["projects"] })
			setExpDialog({ open: false, projectId: "" })
		},
		onError: (error) => {
			toast.error("Failed to enable experimental mode", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	// Handle project selection
	const handleProjectSelect = (containerTag: string) => {
		setSelectedProject(containerTag)
		toast.success("Project switched successfully")
	}

	return (
		<div className="space-y-4">
			<div className="mb-4">
				<p className="text-sm text-white/70">
					Organize your memories into separate projects
				</p>
			</div>

			<div className="flex justify-between items-center mb-4">
				<p className="text-sm text-white/50">Current project:</p>
				<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
					<Button
						className="bg-white/10 hover:bg-white/20 text-white border-white/20"
						onClick={() => setShowCreateDialog(true)}
						size="sm"
					>
						<Plus className="h-4 w-4 mr-2" />
						New Project
					</Button>
				</motion.div>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{[...Array(2)].map((_, i) => (
						<motion.div
							animate={{ opacity: 1 }}
							className="p-4 bg-white/5 rounded-lg"
							initial={{ opacity: 0 }}
							key={`skeleton-project-${Date.now()}-${i}`}
							transition={{ delay: i * 0.1 }}
						>
							<Skeleton className="h-12 w-full bg-white/10" />
						</motion.div>
					))}
				</div>
			) : projects.length === 0 ? (
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className="text-center py-8"
					initial={{ opacity: 0, scale: 0.9 }}
					transition={{ type: "spring", damping: 20 }}
				>
					<p className="text-white/50 mb-4">No projects yet</p>
					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<Button
							className="bg-white/10 hover:bg-white/20 text-white border-white/20"
							onClick={() => setShowCreateDialog(true)}
							size="sm"
							variant="secondary"
						>
							Create Your First Project
						</Button>
					</motion.div>
				</motion.div>
			) : (
				<motion.div className="space-y-2">
					<AnimatePresence>
						{/* Default project */}
						<motion.div
							animate={{ opacity: 1, x: 0 }}
							className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
								selectedProject === "sm_project_default"
									? "bg-white/20 border border-white/30"
									: "bg-white/5 hover:bg-white/10"
							}`}
							exit={{ opacity: 0, x: 20 }}
							initial={{ opacity: 0, x: -20 }}
							key="default-project"
							layout
							onClick={() => handleProjectSelect("sm_project_default")}
						>
							<div className="flex items-center gap-3">
								<motion.div
									animate={{ rotate: 0, opacity: 1 }}
									initial={{ rotate: -180, opacity: 0 }}
									transition={{ delay: 0.1 }}
								>
									<FolderIcon className="h-5 w-5 text-white/80" />
								</motion.div>
								<div>
									<p className="font-medium text-white">Default Project</p>
									<p className="text-sm text-white/60">
										Your default memory storage
									</p>
								</div>
							</div>
							{selectedProject === "sm_project_default" && (
								<motion.div
									animate={{ scale: 1 }}
									initial={{ scale: 0 }}
									transition={{ type: "spring", damping: 20 }}
								>
									<div className="w-2 h-2 bg-green-400 rounded-full" />
								</motion.div>
							)}
						</motion.div>

						{/* User projects */}
						{projects
							.filter((p) => p.containerTag !== "sm_project_default")
							.map((project, index) => (
								<motion.div
									animate={{ opacity: 1, x: 0 }}
									className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
										selectedProject === project.containerTag
											? "bg-white/20 border border-white/30"
											: "bg-white/5 hover:bg-white/10"
									}`}
									exit={{ opacity: 0, x: 20 }}
									initial={{ opacity: 0, x: -20 }}
									key={project.id}
									layout
									onClick={() => handleProjectSelect(project.containerTag)}
									transition={{ delay: (index + 1) * 0.05 }}
								>
									<div className="flex items-center gap-3">
										<motion.div
											animate={{ rotate: 0, opacity: 1 }}
											initial={{ rotate: -180, opacity: 0 }}
											transition={{ delay: (index + 1) * 0.05 + 0.2 }}
										>
											<FolderIcon className="h-5 w-5 text-white/80" />
										</motion.div>
										<div>
											<p className="font-medium text-white">{project.name}</p>
											<p className="text-sm text-white/60">
												Created{" "}
												{new Date(project.createdAt).toLocaleDateString()}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										{selectedProject === project.containerTag && (
											<motion.div
												animate={{ scale: 1 }}
												initial={{ scale: 0 }}
												transition={{ type: "spring", damping: 20 }}
											>
												<div className="w-2 h-2 bg-green-400 rounded-full" />
											</motion.div>
										)}
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													className="text-white/50 hover:text-white"
													onClick={(e) => e.stopPropagation()}
													size="icon"
													variant="ghost"
												>
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												align="end"
												className="bg-black/90 border-white/10"
											>
												{/* Show experimental toggle only if NOT experimental and NOT default project */}
												{!project.isExperimental &&
													project.containerTag !== "sm_project_default" && (
														<DropdownMenuItem
															className="text-blue-400 hover:text-blue-300 cursor-pointer"
															onClick={(e) => {
																e.stopPropagation()
																setExpDialog({
																	open: true,
																	projectId: project.id,
																})
															}}
														>
															<div className="h-4 w-4 mr-2 rounded border border-blue-400" />
															Enable Experimental Mode
														</DropdownMenuItem>
													)}
												{project.isExperimental && (
													<DropdownMenuItem
														className="text-blue-300/50"
														disabled
													>
														<div className="h-4 w-4 mr-2 rounded bg-blue-400" />
														Experimental Mode Active
													</DropdownMenuItem>
												)}
												<DropdownMenuItem
													className="text-red-400 hover:text-red-300 cursor-pointer"
													onClick={(e) => {
														e.stopPropagation()
														setDeleteDialog({
															open: true,
															project: {
																id: project.id,
																name: project.name,
																containerTag: project.containerTag,
															},
															action: "move",
															targetProjectId: "",
														})
													}}
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Delete Project
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</motion.div>
							))}
					</AnimatePresence>
				</motion.div>
			)}

			{/* Create Project Dialog */}
			<AnimatePresence>
				{showCreateDialog && (
					<Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
						<DialogContent className="sm:max-w-2xl bg-black/90 backdrop-blur-xl border-white/10 text-white">
							<motion.div
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
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
											onChange={(e) => setProjectName(e.target.value)}
											placeholder="My Awesome Project"
											value={projectName}
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
												setShowCreateDialog(false)
												setProjectName("")
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
												createProjectMutation.isPending || !projectName.trim()
											}
											onClick={() => createProjectMutation.mutate(projectName)}
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

			{/* Delete Project Dialog */}
			<AnimatePresence>
				{deleteDialog.open && deleteDialog.project && (
					<Dialog
						onOpenChange={(open) =>
							setDeleteDialog((prev) => ({ ...prev, open }))
						}
						open={deleteDialog.open}
					>
						<DialogContent className="sm:max-w-3xl bg-black/90 backdrop-blur-xl border-white/10 text-white">
							<motion.div
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								initial={{ opacity: 0, scale: 0.95 }}
							>
								<DialogHeader>
									<DialogTitle>Delete Project</DialogTitle>
									<DialogDescription className="text-white/60">
										Are you sure you want to delete "{deleteDialog.project.name}
										"? Choose what to do with the documents in this project.
									</DialogDescription>
								</DialogHeader>
								<div className="grid gap-4 py-4">
									<div className="space-y-4">
										<div className="flex items-center space-x-2">
											<input
												checked={deleteDialog.action === "move"}
												className="w-4 h-4"
												id="move"
												name="action"
												onChange={() =>
													setDeleteDialog((prev) => ({
														...prev,
														action: "move",
													}))
												}
												type="radio"
											/>
											<Label
												className="text-white cursor-pointer"
												htmlFor="move"
											>
												Move documents to another project
											</Label>
										</div>
										{deleteDialog.action === "move" && (
											<motion.div
												animate={{ opacity: 1, height: "auto" }}
												className="ml-6"
												exit={{ opacity: 0, height: 0 }}
												initial={{ opacity: 0, height: 0 }}
											>
												<Select
													onValueChange={(value) =>
														setDeleteDialog((prev) => ({
															...prev,
															targetProjectId: value,
														}))
													}
													value={deleteDialog.targetProjectId}
												>
													<SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
														<SelectValue placeholder="Select target project..." />
													</SelectTrigger>
													<SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
														<SelectItem
															className="text-white hover:bg-white/10"
															value="sm_project_default"
														>
															Default Project
														</SelectItem>
														{projects
															.filter(
																(p) =>
																	p.id !== deleteDialog.project?.id &&
																	p.containerTag !== "sm_project_default",
															)
															.map((project) => (
																<SelectItem
																	className="text-white hover:bg-white/10"
																	key={project.id}
																	value={project.id}
																>
																	{project.name}
																</SelectItem>
															))}
													</SelectContent>
												</Select>
											</motion.div>
										)}
										<div className="flex items-center space-x-2">
											<input
												checked={deleteDialog.action === "delete"}
												className="w-4 h-4"
												id="delete"
												name="action"
												onChange={() =>
													setDeleteDialog((prev) => ({
														...prev,
														action: "delete",
													}))
												}
												type="radio"
											/>
											<Label
												className="text-white cursor-pointer"
												htmlFor="delete"
											>
												Delete all documents in this project
											</Label>
										</div>
										{deleteDialog.action === "delete" && (
											<motion.p
												animate={{ opacity: 1 }}
												className="text-sm text-red-400 ml-6"
												initial={{ opacity: 0 }}
											>
												⚠️ This action cannot be undone. All documents will be
												permanently deleted.
											</motion.p>
										)}
									</div>
								</div>
								<DialogFooter>
									<motion.div
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
									>
										<Button
											className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
											onClick={() =>
												setDeleteDialog({
													open: false,
													project: null,
													action: "move",
													targetProjectId: "",
												})
											}
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
											className={`${
												deleteDialog.action === "delete"
													? "bg-red-600 hover:bg-red-700"
													: "bg-white/10 hover:bg-white/20"
											} text-white border-white/20`}
											disabled={
												deleteProjectMutation.isPending ||
												(deleteDialog.action === "move" &&
													!deleteDialog.targetProjectId)
											}
											onClick={() => {
												if (deleteDialog.project) {
													deleteProjectMutation.mutate({
														projectId: deleteDialog.project.id,
														action: deleteDialog.action,
														targetProjectId:
															deleteDialog.action === "move"
																? deleteDialog.targetProjectId
																: undefined,
													})
												}
											}}
											type="button"
										>
											{deleteProjectMutation.isPending ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin mr-2" />
													{deleteDialog.action === "move"
														? "Moving..."
														: "Deleting..."}
												</>
											) : deleteDialog.action === "move" ? (
												"Move & Delete Project"
											) : (
												"Delete Everything"
											)}
										</Button>
									</motion.div>
								</DialogFooter>
							</motion.div>
						</DialogContent>
					</Dialog>
				)}
			</AnimatePresence>

			{/* Experimental Mode Confirmation Dialog */}
			<AnimatePresence>
				{expDialog.open && (
					<Dialog
						onOpenChange={(open) => setExpDialog({ ...expDialog, open })}
						open={expDialog.open}
					>
						<DialogContent className="sm:max-w-lg bg-black/90 backdrop-blur-xl border-white/10 text-white">
							<motion.div
								animate={{ opacity: 1, scale: 1 }}
								className="flex flex-col gap-4"
								exit={{ opacity: 0, scale: 0.95 }}
								initial={{ opacity: 0, scale: 0.95 }}
							>
								<DialogHeader>
									<DialogTitle className="text-white">
										Enable Experimental Mode?
									</DialogTitle>
									<DialogDescription className="text-white/60">
										Experimental mode enables beta features and advanced memory
										relationships for this project.
										<br />
										<br />
										<span className="text-yellow-400 font-medium">
											Warning:
										</span>{" "}
										This action is{" "}
										<span className="text-red-400 font-bold">irreversible</span>
										. Once enabled, you cannot return to regular mode for this
										project.
									</DialogDescription>
								</DialogHeader>
								<DialogFooter>
									<motion.div
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
									>
										<Button
											className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
											onClick={() =>
												setExpDialog({ open: false, projectId: "" })
											}
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
											className="bg-blue-600 hover:bg-blue-700 text-white"
											disabled={enableExperimentalMutation.isPending}
											onClick={() =>
												enableExperimentalMutation.mutate(expDialog.projectId)
											}
											type="button"
										>
											{enableExperimentalMutation.isPending ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin mr-2" />
													Enabling...
												</>
											) : (
												"Enable Experimental Mode"
											)}
										</Button>
									</motion.div>
								</DialogFooter>
							</motion.div>
						</DialogContent>
					</Dialog>
				)}
			</AnimatePresence>
		</div>
	)
}
