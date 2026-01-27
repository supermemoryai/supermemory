"use client"

import { useState, useMemo } from "react"
import { cn } from "@lib/utils"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { $fetch } from "@repo/lib/api"
import { DEFAULT_PROJECT_ID } from "@repo/lib/constants"
import { useQuery } from "@tanstack/react-query"
import { ChevronsLeftRight, Plus, Trash2, XIcon, Loader2 } from "lucide-react"
import type { Project } from "@repo/lib/types"
import { AddSpaceModal } from "./add-space-modal"
import { useProjectMutations } from "@/hooks/use-project-mutations"
import { motion } from "motion/react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import { Dialog, DialogContent } from "@repo/ui/components/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select"
import { Button } from "@repo/ui/components/button"
import { analytics } from "@/lib/analytics"

export interface SpaceSelectorProps {
	value: string
	onValueChange: (containerTag: string) => void
	variant?: "default" | "insideOut"
	showChevron?: boolean
	triggerClassName?: string
	contentClassName?: string
	showNewSpace?: boolean
	enableDelete?: boolean
	compact?: boolean
}

const triggerVariants = {
	default: "px-3 py-2 rounded-md hover:bg-white/5",
	insideOut: "px-3 py-2 rounded-full bg-[#0D121A] shadow-inside-out",
}

export function SpaceSelector({
	value,
	onValueChange,
	variant = "default",
	showChevron = false,
	triggerClassName,
	contentClassName,
	showNewSpace = true,
	enableDelete = false,
	compact = false,
}: SpaceSelectorProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [showCreateDialog, setShowCreateDialog] = useState(false)
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean
		project: { id: string; name: string; containerTag: string } | null
		action: "move" | "delete"
		targetProjectId: string
	}>({
		open: false,
		project: null,
		action: "move",
		targetProjectId: "",
	})

	const { deleteProjectMutation } = useProjectMutations()

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

	const selectedProject = useMemo(() => {
		if (value === DEFAULT_PROJECT_ID) return { name: "My Space", emoji: "📁" }
		const found = projects.find((p: Project) => p.containerTag === value)
		return found
			? { name: found.name, emoji: found.emoji }
			: { name: value, emoji: undefined }
	}, [projects, value])

	const selectedProjectName = selectedProject.name
	const selectedProjectEmoji = selectedProject.emoji || "📁"

	const handleSelect = (containerTag: string) => {
		if (containerTag !== value) {
			analytics.spaceSwitched({ space_id: containerTag })
		}
		onValueChange(containerTag)
		setIsOpen(false)
	}

	const handleNewSpace = () => {
		setIsOpen(false)
		setShowCreateDialog(true)
	}

	const handleDeleteClick = (
		e: React.MouseEvent,
		project: { id: string; name: string; containerTag: string },
	) => {
		e.stopPropagation()
		e.preventDefault()
		setDeleteDialog({
			open: true,
			project,
			action: "move",
			targetProjectId: "",
		})
	}

	const handleDeleteConfirm = () => {
		if (!deleteDialog.project) return

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
					setIsOpen(false)
				},
			},
		)
	}

	const handleDeleteCancel = () => {
		setDeleteDialog({
			open: false,
			project: null,
			action: "move",
			targetProjectId: "",
		})
	}

	const availableTargetProjects = useMemo(() => {
		const filtered = projects.filter(
			(p: Project) =>
				p.id !== deleteDialog.project?.id &&
				p.containerTag !== deleteDialog.project?.containerTag,
		)

		const defaultProject = projects.find(
			(p: Project) => p.containerTag === DEFAULT_PROJECT_ID,
		)

		const isDefaultProjectBeingDeleted =
			deleteDialog.project?.containerTag === DEFAULT_PROJECT_ID

		if (defaultProject && !isDefaultProjectBeingDeleted) {
			const defaultProjectIncluded = filtered.some(
				(p: Project) => p.containerTag === DEFAULT_PROJECT_ID,
			)
			if (!defaultProjectIncluded) {
				return [defaultProject, ...filtered]
			}
		}

		return filtered
	}, [projects, deleteDialog.project])

	return (
		<>
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className={cn(
							"flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
							triggerVariants[variant],
							dmSansClassName(),
							triggerClassName,
						)}
					>
						<span className="text-sm font-bold tracking-[-0.98px]">
							{selectedProjectEmoji}
						</span>
						{!compact && (
							<span className="text-sm font-medium text-white">
								{isLoading ? "..." : selectedProjectName}
							</span>
						)}
						{showChevron && (
							<ChevronsLeftRight className="size-4 rotate-90 text-white/70" />
						)}
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="start"
					className={cn(
						"min-w-[200px] p-1.5 rounded-xl border border-[#2E3033] shadow-[0px_1.5px_20px_0px_rgba(0,0,0,0.65)]",
						dmSansClassName(),
						contentClassName,
					)}
					style={{
						background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
					}}
				>
					<div className="flex flex-col gap-2">
						<div className="flex flex-col">
							{/* Default Project - no delete allowed */}
							<DropdownMenuItem
								onClick={() => handleSelect(DEFAULT_PROJECT_ID)}
								className={cn(
									"flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-white text-sm font-medium",
									value === DEFAULT_PROJECT_ID
										? "bg-[#293952]/40"
										: "opacity-60 hover:opacity-100 hover:bg-[#293952]/40",
								)}
							>
								<span className="font-bold tracking-[-0.98px]">📁</span>
								<span className="flex-1">My Space</span>
							</DropdownMenuItem>

							{/* User Projects */}
							{projects
								.filter((p: Project) => p.containerTag !== DEFAULT_PROJECT_ID)
								.map((project: Project) => (
									<DropdownMenuItem
										key={project.id}
										onClick={() => handleSelect(project.containerTag)}
										className={cn(
											"flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-white text-sm font-medium group",
											value === project.containerTag
												? "bg-[#293952]/40"
												: "opacity-60 hover:opacity-100 hover:bg-[#293952]/40",
										)}
									>
										<span className="font-bold tracking-[-0.98px]">
											{project.emoji || "📁"}
										</span>
										<span className="truncate flex-1">{project.name}</span>
										{enableDelete && (
											<button
												type="button"
												onClick={(e) =>
													handleDeleteClick(e, {
														id: project.id,
														name: project.name,
														containerTag: project.containerTag,
													})
												}
												className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-500/20"
											>
												<Trash2 className="size-3.5 text-red-500" />
											</button>
										)}
									</DropdownMenuItem>
								))}
						</div>

						{showNewSpace && (
							<button
								type="button"
								onClick={handleNewSpace}
								className="flex items-center justify-center gap-2 px-3 py-2 rounded-md cursor-pointer text-white text-sm font-medium border border-[#161F2C] hover:bg-[#0D121A]/80 transition-colors"
								style={{
									background:
										"linear-gradient(180deg, #0D121A 0%, #000000 100%)",
								}}
							>
								<Plus className="size-4" />
								<span>New Space</span>
							</button>
						)}
					</div>
				</DropdownMenuContent>
			</DropdownMenu>

			<AddSpaceModal
				isOpen={showCreateDialog}
				onClose={() => setShowCreateDialog(false)}
			/>

			{/* Delete Confirmation Dialog - matching /new design system */}
			<Dialog
				open={deleteDialog.open}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteDialog({
							open: false,
							project: null,
							action: "move",
							targetProjectId: "",
						})
					}
				}}
			>
				<DialogContent
					className={cn(
						"w-[90%]! max-w-[500px]! border-none bg-[#1B1F24] flex flex-col p-4 gap-4 rounded-[22px]",
						dmSansClassName(),
					)}
					style={{
						boxShadow:
							"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
					}}
					showCloseButton={false}
				>
					<div className="flex flex-col gap-4">
						<div
							id="delete-dialog-header"
							className="flex justify-between items-start gap-4"
						>
							<div className="pl-1 space-y-1 flex-1">
								<p
									className={cn(
										"font-semibold text-[#fafafa]",
										dmSans125ClassName(),
									)}
								>
									Delete space
								</p>
								<p className="text-[#737373] font-medium text-[16px] leading-[1.35]">
									What would you like to do with the documents and memories in{" "}
									<span className="text-[#fafafa] font-medium">
										"{deleteDialog.project?.name}"
									</span>
									?
								</p>
							</div>
							<DialogPrimitive.Close
								className="bg-[#0D121A] w-7 h-7 flex items-center justify-center focus:ring-ring rounded-full transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border border-[rgba(115,115,115,0.2)] shrink-0"
								style={{
									boxShadow:
										"inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
								}}
							>
								<XIcon stroke="#737373" />
								<span className="sr-only">Close</span>
							</DialogPrimitive.Close>
						</div>

						<div id="delete-dialog-content" className="space-y-3">
							<button
								id="move-option"
								type="button"
								onClick={() =>
									setDeleteDialog((prev) => ({ ...prev, action: "move" }))
								}
								className={cn(
									"flex items-center gap-3 p-3 rounded-[12px] cursor-pointer transition-colors w-full text-left",
									deleteDialog.action === "move"
										? "bg-[#14161A] border border-[rgba(82,89,102,0.3)]"
										: "bg-[#14161A]/50 border border-transparent hover:border-[rgba(82,89,102,0.2)]",
								)}
								style={{
									boxShadow:
										deleteDialog.action === "move"
											? "0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08)"
											: "none",
								}}
							>
								<div
									className={cn(
										"w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
										deleteDialog.action === "move"
											? "border-blue-500"
											: "border-[#737373]",
									)}
								>
									{deleteDialog.action === "move" && (
										<div className="w-2 h-2 rounded-full bg-blue-500" />
									)}
								</div>
								<span className="text-[#fafafa] text-sm font-medium">
									Move to another space
								</span>
							</button>

							{deleteDialog.action === "move" && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									className="ml-7"
								>
									<Select
										value={deleteDialog.targetProjectId}
										onValueChange={(val) =>
											setDeleteDialog((prev) => ({
												...prev,
												targetProjectId: val,
											}))
										}
									>
										<SelectTrigger
											className={cn(
												"bg-[#14161A] border border-[rgba(82,89,102,0.2)] rounded-[12px] text-[#fafafa] text-[14px] h-[45px]",
												dmSansClassName(),
											)}
											style={{
												boxShadow:
													"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
											}}
										>
											<SelectValue placeholder="Select target space" />
										</SelectTrigger>
										<SelectContent
											className={cn(
												"bg-[#14161A] border border-[rgba(82,89,102,0.2)] rounded-[12px]",
												dmSansClassName(),
											)}
											style={{
												boxShadow:
													"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08)",
											}}
										>
											{availableTargetProjects.map((p: Project) => (
												<SelectItem
													key={p.id}
													value={p.id}
													className="text-[#fafafa] hover:bg-[#1B1F24] cursor-pointer rounded-md"
												>
													<span className="flex items-center gap-2">
														<span>{p.emoji || "📁"}</span>
														<span>
															{p.containerTag === DEFAULT_PROJECT_ID
																? "My Space"
																: p.name}
														</span>
													</span>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</motion.div>
							)}

							<button
								id="delete-option"
								type="button"
								onClick={() =>
									setDeleteDialog((prev) => ({ ...prev, action: "delete" }))
								}
								className={cn(
									"flex items-center gap-3 p-3 rounded-[12px] cursor-pointer transition-colors w-full text-left",
									deleteDialog.action === "delete"
										? "bg-[#14161A] border border-[rgba(220,38,38,0.3)]"
										: "bg-[#14161A]/50 border border-transparent hover:border-[rgba(82,89,102,0.2)]",
								)}
								style={{
									boxShadow:
										deleteDialog.action === "delete"
											? "0px 1px 2px 0px rgba(87,0,0,0.1), inset 0px 0px 0px 1px rgba(67,43,43,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08)"
											: "none",
								}}
							>
								<div
									className={cn(
										"w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
										deleteDialog.action === "delete"
											? "border-red-500"
											: "border-[#737373]",
									)}
								>
									{deleteDialog.action === "delete" && (
										<div className="w-2 h-2 rounded-full bg-red-500" />
									)}
								</div>
								<span className="text-[#fafafa] text-sm font-medium">
									Delete everything permanently
								</span>
							</button>

							{deleteDialog.action === "delete" && (
								<motion.p
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="text-xs text-red-400 ml-7"
								>
									All documents and memories will be permanently deleted.
								</motion.p>
							)}
						</div>

						<div
							id="delete-dialog-footer"
							className="flex items-center justify-end gap-[22px]"
						>
							<button
								type="button"
								onClick={handleDeleteCancel}
								disabled={deleteProjectMutation.isPending}
								className={cn(
									"text-[#737373] font-medium text-[14px] cursor-pointer transition-colors hover:text-[#999]",
									dmSansClassName(),
								)}
							>
								Cancel
							</button>
							<Button
								variant="insideOut"
								onClick={handleDeleteConfirm}
								disabled={
									deleteProjectMutation.isPending ||
									(deleteDialog.action === "move" &&
										!deleteDialog.targetProjectId)
								}
								className={cn(
									"px-4 py-[10px] rounded-full",
									deleteDialog.action === "delete" &&
										"bg-red-600 hover:bg-red-700 border-red-700",
								)}
							>
								{deleteProjectMutation.isPending ? (
									<>
										<Loader2 className="size-4 animate-spin mr-2" />
										{deleteDialog.action === "move"
											? "Moving..."
											: "Deleting..."}
									</>
								) : deleteDialog.action === "move" ? (
									"Move & Delete"
								) : (
									"Delete Everything"
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
