"use client";

import { $fetch } from "@repo/lib/api";
import { DEFAULT_PROJECT_ID } from "@repo/lib/constants";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ChevronDown,
	FolderIcon,
	Loader2,
	MoreHorizontal,
	MoreVertical,
	Plus,
	Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useProjectMutations } from "@/hooks/use-project-mutations";
import { useProjectName } from "@/hooks/use-project-name";
import { useProject } from "@/stores";
import { CreateProjectDialog } from "./create-project-dialog";

interface Project {
	id: string;
	name: string;
	containerTag: string;
	createdAt: string;
	updatedAt: string;
	isExperimental?: boolean;
}

export function ProjectSelector() {
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState(false);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const { selectedProject } = useProject();
	const projectName = useProjectName();
	const { switchProject, deleteProjectMutation } = useProjectMutations();
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean;
		project: null | { id: string; name: string; containerTag: string };
		action: "move" | "delete";
		targetProjectId: string;
	}>({
		open: false,
		project: null,
		action: "move",
		targetProjectId: DEFAULT_PROJECT_ID,
	});
	const [expDialog, setExpDialog] = useState<{
		open: boolean;
		projectId: string;
	}>({
		open: false,
		projectId: "",
	});

	const { data: projects = [], isLoading } = useQuery({
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

	const enableExperimentalMutation = useMutation({
		mutationFn: async (projectId: string) => {
			const response = await $fetch(
				`@post/projects/${projectId}/enable-experimental`,
			);
			if (response.error) {
				throw new Error(
					response.error?.message || "Failed to enable experimental mode",
				);
			}
			return response.data;
		},
		onSuccess: () => {
			toast.success("Experimental mode enabled for project");
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			setExpDialog({ open: false, projectId: "" });
		},
		onError: (error) => {
			toast.error("Failed to enable experimental mode", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	const handleProjectSelect = (containerTag: string) => {
		switchProject(containerTag);
		setIsOpen(false);
	};

	const handleCreateNewProject = () => {
		setIsOpen(false);
		setShowCreateDialog(true);
	};

	return (
		<div className="relative">
			<motion.button
				className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
				onClick={() => setIsOpen(!isOpen)}
				whileHover={{ scale: 1.01 }}
				whileTap={{ scale: 0.99 }}
			>
				<FolderIcon className="h-3.5 w-3.5 text-white/70" />
				<span className="text-xs font-medium text-white/90 max-w-32 truncate">
					{isLoading ? "..." : projectName}
				</span>
				<motion.div
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.15 }}
				>
					<ChevronDown className="h-3 w-3 text-white/50" />
				</motion.div>
			</motion.button>

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
							className="absolute top-full left-0 mt-1 w-56 bg-[#0f1419] backdrop-blur-xl border border-white/10 rounded-md shadow-xl z-50 overflow-hidden"
							initial={{ opacity: 0, y: -5, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -5, scale: 0.98 }}
							transition={{ duration: 0.15 }}
						>
							<div className="p-1.5 max-h-64 overflow-y-auto">
								{/* Default Project */}
								<motion.div
									className={`flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer ${
										selectedProject === DEFAULT_PROJECT_ID
											? "bg-white/15"
											: "hover:bg-white/8"
									}`}
									onClick={() => handleProjectSelect(DEFAULT_PROJECT_ID)}
								>
									<div className="flex items-center gap-2">
										<FolderIcon className="h-3.5 w-3.5 text-white/70" />
										<span className="text-xs font-medium text-white">
											Default
										</span>
									</div>
								</motion.div>

								{/* User Projects */}
								{projects
									.filter((p: Project) => p.containerTag !== DEFAULT_PROJECT_ID)
									.map((project: Project, index: number) => (
										<motion.div
											key={project.id}
											className={`flex items-center justify-between p-2 rounded-md transition-colors group ${
												selectedProject === project.containerTag
													? "bg-white/15"
													: "hover:bg-white/8"
											}`}
											initial={{ opacity: 0, x: -5 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: index * 0.03 }}
										>
											<div
												className="flex items-center gap-2 flex-1 cursor-pointer"
												onClick={() =>
													handleProjectSelect(project.containerTag)
												}
											>
												<FolderIcon className="h-3.5 w-3.5 text-white/70" />
												<span className="text-xs font-medium text-white truncate max-w-32">
													{project.name}
												</span>
											</div>
											<div className="flex items-center gap-1">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<motion.button
															className="p-1 hover:bg-white/10 rounded transition-all"
															onClick={(e) => e.stopPropagation()}
															whileHover={{ scale: 1.1 }}
															whileTap={{ scale: 0.9 }}
														>
															<MoreHorizontal className="h-3 w-3 text-white/50" />
														</motion.button>
													</DropdownMenuTrigger>
													<DropdownMenuContent
														align="end"
														className="bg-black/90 border-white/10"
													>
														{/* Show experimental toggle only if NOT experimental and NOT default project */}
														{!project.isExperimental &&
															project.containerTag !== DEFAULT_PROJECT_ID && (
																<DropdownMenuItem
																	className="text-blue-400 hover:text-blue-300 cursor-pointer text-xs"
																	onClick={(e) => {
																		e.stopPropagation();
																		setExpDialog({
																			open: true,
																			projectId: project.id,
																		});
																		setIsOpen(false);
																	}}
																>
																	<div className="h-3 w-3 mr-2 rounded border border-blue-400" />
																	Enable Experimental Mode
																</DropdownMenuItem>
															)}
														{project.isExperimental && (
															<DropdownMenuItem
																className="text-blue-300/50 text-xs"
																disabled
															>
																<div className="h-3 w-3 mr-2 rounded bg-blue-400" />
																Experimental Mode Active
															</DropdownMenuItem>
														)}
														<DropdownMenuItem
															className="text-red-400 hover:text-red-300 cursor-pointer text-xs"
															onClick={(e) => {
																e.stopPropagation();
																setDeleteDialog({
																	open: true,
																	project: {
																		id: project.id,
																		name: project.name,
																		containerTag: project.containerTag,
																	},
																	action: "move",
																	targetProjectId: "",
																});
																setIsOpen(false);
															}}
														>
															<Trash2 className="h-3 w-3 mr-2" />
															Delete Project
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</motion.div>
									))}

								<motion.div
									className="flex items-center gap-2 p-2 rounded-md hover:bg-white/8 transition-colors cursor-pointer border-t border-white/10 mt-1"
									onClick={handleCreateNewProject}
									whileHover={{ x: 1 }}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: (projects.length + 1) * 0.03 }}
								>
									<Plus className="h-3.5 w-3.5 text-white/70" />
									<span className="text-xs font-medium text-white/80">
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
						<DialogContent className="sm:max-w-2xl bg-black/90 backdrop-blur-xl border-white/10 text-white">
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
												className="text-white cursor-pointer text-sm"
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
															value={DEFAULT_PROJECT_ID}
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
												className="text-white cursor-pointer text-sm"
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
																});
															},
														},
													);
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
	);
}
