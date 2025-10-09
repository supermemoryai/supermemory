"use client"

import { $fetch } from "@repo/lib/api"
import { DEFAULT_PROJECT_ID } from "@repo/lib/constants"
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
import { Label } from "@repo/ui/components/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select"
import { useQuery } from "@tanstack/react-query"
import {
	ChevronDown,
	FolderIcon,
	Loader2,
	MoreHorizontal,
	Plus,
	Trash2,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { useProjectMutations } from "@/hooks/use-project-mutations"
import { useProjectName } from "@/hooks/use-project-name"
import { useProject } from "@/stores"
import { CreateProjectDialog } from "./create-project-dialog"

interface Project {
	id: string
	name: string
	containerTag: string
	createdAt: string
	updatedAt: string
	isExperimental?: boolean
}

export function ProjectSelector() {
	const [isOpen, setIsOpen] = useState(false)
	const [showCreateDialog, setShowCreateDialog] = useState(false)
	const { selectedProject } = useProject()
	const projectName = useProjectName()
	const { switchProject, deleteProjectMutation } = useProjectMutations()
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean
		project: null | { id: string; name: string; containerTag: string }
		action: "move" | "delete"
		targetProjectId: string
	}>({
		open: false,
		project: null,
		action: "move",
		targetProjectId: DEFAULT_PROJECT_ID,
	})

	const { data: projects = [], isLoading } = useQuery({
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

	const handleProjectSelect = (containerTag: string) => {
		switchProject(containerTag)
		setIsOpen(false)
	}

	const handleCreateNewProject = () => {
		setIsOpen(false)
		setShowCreateDialog(true)
	}

	return (
		<div className="relative">
			<Button
				type="button"
				variant="ghost"
				className="flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors"
				onClick={() => setIsOpen(!isOpen)}
			>
				<FolderIcon className="h-3.5 w-3.5" />
				<span className="text-xs font-medium max-w-32 truncate">
					{isLoading ? "..." : projectName}
				</span>
				<motion.div
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.25 }}
				>
					<ChevronDown className="h-3 w-3" />
				</motion.div>
			</Button>

			<AnimatePresence>
				{isOpen && (
					<>
						<motion.div
							className="fixed inset-0 z-40"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setIsOpen(false)}
						/>

						<motion.div
							className="absolute top-full left-0 mt-1 w-56 bg-background/95 backdrop-blur-xl border border-border rounded-md shadow-xl z-50 overflow-hidden"
							initial={{ opacity: 0, y: -5, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -5, scale: 0.98 }}
							transition={{ duration: 0.15 }}
						>
							<div className="p-1.5 max-h-64 overflow-y-auto">
								<Button
									variant="ghost"
									className={`flex items-center w-full justify-between p-2 rounded-md transition-colors cursor-pointer ${
										selectedProject === DEFAULT_PROJECT_ID
											? "bg-accent"
											: "hover:bg-accent/20"
									}`}
									onClick={() => handleProjectSelect(DEFAULT_PROJECT_ID)}
								>
									<div className="flex items-center gap-2">
										<FolderIcon className="h-3.5 w-3.5" />
										<span className="text-xs font-medium">Default Project</span>
									</div>
								</Button>

								{/* User Projects */}
								{projects
									.filter((p: Project) => p.containerTag !== DEFAULT_PROJECT_ID)
									.map((project: Project) => (
										<div
											key={project.id}
											className={`flex items-center justify-between p-2 rounded-md transition-colors group ${
												selectedProject === project.containerTag
													? "bg-accent"
													: "hover:bg-accent/50"
											}`}
										>
											<button
												className="flex items-center gap-2 flex-1 cursor-pointer"
												type="button"
												onClick={() =>
													handleProjectSelect(project.containerTag)
												}
											>
												<FolderIcon className="h-3.5 w-3.5 opacity-70" />
												<span className="text-xs font-medium truncate max-w-32">
													{project.name}
												</span>
											</button>
											<div className="flex items-center gap-1">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-6 w-6"
															onClick={(e) => e.stopPropagation()}
														>
															<MoreHorizontal className="h-3 w-3" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															className="cursor-pointer text-xs hover:text-red-500"
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
																setIsOpen(false)
															}}
														>
															<Trash2 className="h-3 w-3" />
															Delete Project
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</div>
									))}

								<motion.div
									className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer border-t border-border mt-1"
									onClick={handleCreateNewProject}
									whileHover={{ x: 1 }}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: (projects.length + 1) * 0.03 }}
								>
									<Plus className="h-3.5 w-3.5 text-foreground/70" />
									<span className="text-xs font-medium text-foreground/80">
										New Project
									</span>
								</motion.div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>

			<CreateProjectDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
			/>

			{/* Delete Project Dialog */}
			<AnimatePresence>
				{deleteDialog.open && deleteDialog.project && (
					<Dialog
						onOpenChange={(open) =>
							setDeleteDialog((prev) => ({ ...prev, open }))
						}
						open={deleteDialog.open}
					>
						<DialogContent className="sm:max-w-2xl">
							<motion.div
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								initial={{ opacity: 0, scale: 0.95 }}
							>
								<DialogHeader>
									<DialogTitle>Delete Project</DialogTitle>
									<DialogDescription>
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
											<Label className="cursor-pointer text-sm" htmlFor="move">
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
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select target project..." />
													</SelectTrigger>
													<SelectContent>
														<SelectItem
															value={
																projects.find(
																	(p) => p.containerTag === DEFAULT_PROJECT_ID,
																)?.id || ""
															}
														>
															Default Project
														</SelectItem>
														{projects
															.filter(
																(p: Project) =>
																	p.id !== deleteDialog.project?.id &&
																	p.containerTag !== DEFAULT_PROJECT_ID,
															)
															.map((project: Project) => (
																<SelectItem key={project.id} value={project.id}>
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
												className="cursor-pointer text-sm"
												htmlFor="delete"
											>
												Delete all documents in this project
											</Label>
										</div>
										{deleteDialog.action === "delete" && (
											<motion.p
												animate={{ opacity: 1 }}
												className="text-sm text-red-600 dark:text-red-400 ml-6"
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
											className={
												deleteDialog.action === "delete"
													? "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white"
													: ""
											}
											disabled={
												deleteProjectMutation.isPending ||
												(deleteDialog.action === "move" &&
													!deleteDialog.targetProjectId)
											}
											onClick={() => {
												if (deleteDialog.project) {
													deleteProjectMutation.mutate(
														{
															projectId: deleteDialog.project.id,
															action: deleteDialog.action,
															targetProjectId:
																deleteDialog.action === "move"
																	? deleteDialog.targetProjectId
																	: undefined,
														},
														{
															onSuccess: () => {
																setDeleteDialog({
																	open: false,
																	project: null,
																	action: "move",
																	targetProjectId: "",
																})
															},
														},
													)
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
		</div>
	)
}
