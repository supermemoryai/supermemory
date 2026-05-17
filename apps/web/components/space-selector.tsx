"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@lib/utils"
import { $fetch } from "@lib/api"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { DEFAULT_PROJECT_ID } from "@lib/constants"
import { XIcon, Loader2 } from "lucide-react"
import type { ContainerTagListType } from "@lib/types"
import { AddSpaceModal } from "./add-space-modal"
import { SelectSpacesModal } from "./select-spaces-modal"
import { useProjectMutations } from "@/hooks/use-project-mutations"
import { useContainerTags } from "@/hooks/use-container-tags"
import { motion } from "motion/react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogDescription,
} from "@repo/ui/components/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select"
import { Button } from "@repo/ui/components/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/tooltip"
import { analytics } from "@/lib/analytics"
import {
	compareSpacesUserFirst,
	spaceSelectorDisplayName,
} from "@/lib/ingest-auto-space"
import { detectPluginSpace, pluginInitial } from "@/lib/plugin-space"
import { usePluginSpaceMeta } from "@/hooks/use-plugin-space-meta"

export interface SpaceSelectorProps {
	selectedProjects: string[]
	onValueChange: (containerTags: string[]) => void
	variant?: "default" | "insideOut"
	triggerClassName?: string
	showNewSpace?: boolean
	enableDelete?: boolean
	compact?: boolean
}

const triggerVariants = {
	default:
		"h-10 min-h-10 shrink-0 rounded-full border border-[#161F2C] bg-muted px-3 gap-2 " +
		"hover:bg-white/5 hover:border-[#2261CA33] " +
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2261CA33]/35",
	insideOut:
		"h-10 min-h-10 gap-2 px-3 rounded-full bg-[#0D121A] shadow-inside-out hover:bg-[#121820]",
}

const RECENTS_KEY = "nova:space-selector:recents"
const RECENTS_MAX = 10

function readRecents(): string[] {
	if (typeof window === "undefined") return []
	try {
		const raw = window.localStorage.getItem(RECENTS_KEY)
		if (!raw) return []
		const parsed = JSON.parse(raw)
		return Array.isArray(parsed)
			? parsed.filter((x) => typeof x === "string")
			: []
	} catch {
		return []
	}
}

function writeRecents(tags: string[]) {
	if (typeof window === "undefined") return
	try {
		window.localStorage.setItem(RECENTS_KEY, JSON.stringify(tags))
	} catch {
		// ignore
	}
}

function formatCount(n: number): string {
	if (n < 1000) return String(n)
	if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`
	if (n < 1_000_000) return `${Math.floor(n / 1000)}k`
	return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`
}

export function SpaceSelector({
	selectedProjects,
	onValueChange,
	variant = "default",
	triggerClassName,
	showNewSpace = true,
	enableDelete = false,
	compact = false,
}: SpaceSelectorProps) {
	const [showCreateDialog, setShowCreateDialog] = useState(false)
	const [showSelectSpacesModal, setShowSelectSpacesModal] = useState(false)
	const [recents, setRecents] = useState<string[]>([])
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
	const { allProjects, isLoading } = useContainerTags()

	useEffect(() => {
		setRecents(readRecents())
	}, [])

	const activeTag = selectedProjects[0] ?? DEFAULT_PROJECT_ID
	const { data: spaceCountData } = useQuery({
		queryKey: ["space-selector-count", activeTag],
		queryFn: async (): Promise<number> => {
			const response = await $fetch("@post/documents/documents", {
				body: {
					page: 1,
					limit: 1,
					sort: "createdAt",
					order: "desc",
					containerTags: [activeTag],
				},
				disableValidation: true,
			})
			if (response.error) return 0
			const data = response.data as {
				pagination?: { totalItems?: number }
			} | null
			return data?.pagination?.totalItems ?? 0
		},
		staleTime: 30 * 1000,
		enabled: !!activeTag,
	})

	const pluginTags = useMemo(
		() =>
			allProjects
				.filter(
					(p: ContainerTagListType) => !!detectPluginSpace(p.containerTag),
				)
				.map((p: ContainerTagListType) => p.containerTag),
		[allProjects],
	)
	const pluginMetaMap = usePluginSpaceMeta(pluginTags)

	const displayInfo = useMemo<{
		name: string
		emoji: string | null
		plugin: ReturnType<typeof detectPluginSpace>
	}>(() => {
		const containerTag = selectedProjects[0] ?? ""
		if (!containerTag || containerTag === DEFAULT_PROJECT_ID) {
			return { name: "My Space", emoji: "📁", plugin: null }
		}
		const found = allProjects.find(
			(p: ContainerTagListType) => p.containerTag === containerTag,
		)
		const plugin = detectPluginSpace(containerTag)
		const projectName = pluginMetaMap.get(containerTag)?.projectName
		const idForLabel = projectName || plugin?.projectId
		return {
			name: plugin
				? idForLabel
					? `${plugin.label} · ${idForLabel}`
					: plugin.label
				: spaceSelectorDisplayName(found, containerTag),
			emoji: found?.emoji || "📁",
			plugin,
		}
	}, [allProjects, selectedProjects, pluginMetaMap])

	const pushRecent = useCallback((tag: string) => {
		setRecents((prev) => {
			const next = [tag, ...prev.filter((t) => t !== tag)].slice(0, RECENTS_MAX)
			writeRecents(next)
			return next
		})
	}, [])

	const handleSelectSpacesApply = useCallback(
		(selected: string[]) => {
			const next = selected.slice(0, 1)
			const selectedTag = next[0]
			setShowSelectSpacesModal(false)
			onValueChange(next)
			if (selectedTag) {
				queueMicrotask(() => {
					analytics.spaceSwitched({ space_id: selectedTag })
					pushRecent(selectedTag)
				})
			}
		},
		[onValueChange, pushRecent],
	)

	const handleNewSpace = useCallback(() => {
		setShowSelectSpacesModal(false)
		setShowCreateDialog(true)
	}, [])

	const handleDeleteRequest = useCallback(
		(project: { id: string; name: string; containerTag: string }) => {
			setShowSelectSpacesModal(false)
			setDeleteDialog({
				open: true,
				project,
				action: "move",
				targetProjectId: "",
			})
		},
		[],
	)

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
		const filtered = allProjects.filter(
			(p: ContainerTagListType) =>
				p.id !== deleteDialog.project?.id &&
				p.containerTag !== deleteDialog.project?.containerTag,
		)
		const defaultProject = allProjects.find(
			(p: ContainerTagListType) => p.containerTag === DEFAULT_PROJECT_ID,
		)
		const isDefaultProjectBeingDeleted =
			deleteDialog.project?.containerTag === DEFAULT_PROJECT_ID
		if (defaultProject && !isDefaultProjectBeingDeleted) {
			const defaultProjectIncluded = filtered.some(
				(p: ContainerTagListType) => p.containerTag === DEFAULT_PROJECT_ID,
			)
			if (!defaultProjectIncluded) return [defaultProject, ...filtered]
		}
		return filtered.sort(compareSpacesUserFirst)
	}, [allProjects, deleteDialog.project])

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={() => setShowSelectSpacesModal(true)}
						aria-label={
							isLoading
								? "Loading spaces"
								: `Space: ${displayInfo.name}. Open selector.`
						}
						className={cn(
							"flex min-w-0 max-w-full items-center cursor-pointer transition-colors",
							triggerVariants[variant],
							variant === "default" && compact && "h-9 min-h-9 gap-1.5 px-2.5",
							dmSansClassName(),
							triggerClassName,
						)}
					>
						{displayInfo.plugin ? (
							displayInfo.plugin.iconSrc ? (
								<Image
									src={displayInfo.plugin.iconSrc}
									alt=""
									width={16}
									height={16}
									className={cn(
										"shrink-0 rounded-[3px]",
										compact ? "size-3.5" : "size-4",
									)}
									aria-hidden
								/>
							) : (
								<span
									className={cn(
										"shrink-0 flex items-center justify-center rounded-[3px] bg-[#1E232B] text-[#FAFAFA] text-[10px] font-semibold uppercase",
										compact ? "size-3.5" : "size-4",
									)}
									aria-hidden
								>
									{pluginInitial(displayInfo.plugin.label)}
								</span>
							)
						) : (
							<span
								className="shrink-0 text-sm font-bold tracking-[-0.98px]"
								aria-hidden
							>
								{displayInfo.emoji}
							</span>
						)}
						{!compact && (
							<span
								className={cn(
									"min-w-0 truncate text-sm font-medium text-white",
									"max-w-[10rem] md:max-w-[15rem]",
								)}
								title={isLoading ? undefined : displayInfo.name}
							>
								{isLoading ? "…" : displayInfo.name}
							</span>
						)}
						{!compact && spaceCountData !== undefined && spaceCountData > 0 && (
							<span className="shrink-0 text-[11px] text-[#737373] tabular-nums">
								· {formatCount(spaceCountData)}
							</span>
						)}
						{compact && (
							<span className="sr-only">
								{isLoading ? "Loading" : displayInfo.name}
							</span>
						)}
					</button>
				</TooltipTrigger>
				<TooltipContent side="bottom" className={dmSansClassName()}>
					Switch space
				</TooltipContent>
			</Tooltip>

			<AddSpaceModal
				isOpen={showCreateDialog}
				onClose={() => setShowCreateDialog(false)}
				onCreated={(containerTag) => {
					pushRecent(containerTag)
					onValueChange([containerTag])
				}}
			/>

			<SelectSpacesModal
				isOpen={showSelectSpacesModal}
				onClose={() => setShowSelectSpacesModal(false)}
				selectedProjects={selectedProjects}
				onApply={handleSelectSpacesApply}
				projects={allProjects}
				recents={recents}
				showNewSpace={showNewSpace}
				onNewSpace={handleNewSpace}
				enableDelete={enableDelete}
				onDeleteRequest={handleDeleteRequest}
			/>

			<Dialog
				open={deleteDialog.open}
				onOpenChange={(open: boolean) => {
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
						<div className="flex justify-between items-start gap-4">
							<div className="pl-1 space-y-1 flex-1">
								<DialogTitle
									className={cn(
										"font-semibold text-[#fafafa]",
										dmSans125ClassName(),
									)}
								>
									Delete space
								</DialogTitle>
								<DialogDescription className="text-[#737373] font-medium text-[16px] leading-[1.35]">
									What would you like to do with the documents and memories in{" "}
									<span className="text-[#fafafa] font-medium">
										"{deleteDialog.project?.name}"
									</span>
									?
								</DialogDescription>
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

						<div className="space-y-3">
							<button
								type="button"
								onClick={() =>
									setDeleteDialog((prev) => ({ ...prev, action: "move" }))
								}
								className={cn(
									"flex items-center gap-3 p-3 rounded-[12px] cursor-pointer transition-colors w-full text-left",
									deleteDialog.action === "move"
										? "bg-[#14161A] shadow-inside-out"
										: "bg-[#14161A]/50 hover:bg-[#14161A]/70",
								)}
							>
								<div
									className={cn(
										"w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
										deleteDialog.action === "move"
											? "border-[#4BA0FA]"
											: "border-[#737373]",
									)}
								>
									{deleteDialog.action === "move" && (
										<div className="w-2 h-2 rounded-full bg-[#4BA0FA]" />
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
										onValueChange={(val: string) =>
											setDeleteDialog((prev) => ({
												...prev,
												targetProjectId: val,
											}))
										}
									>
										<SelectTrigger
											className={cn(
												"bg-[#14161A] shadow-inside-out rounded-[12px] text-[#fafafa] text-[14px] h-[45px]",
												dmSansClassName(),
											)}
										>
											<SelectValue placeholder="Select target space" />
										</SelectTrigger>
										<SelectContent
											className={cn(
												"bg-[#14161A] border border-[rgba(82,89,102,0.2)] rounded-[12px]",
												dmSansClassName(),
											)}
										>
											{availableTargetProjects.map(
												(p: ContainerTagListType) => {
													const plugin = detectPluginSpace(p.containerTag)
													return (
														<SelectItem
															key={p.id}
															value={p.id}
															className="text-[#fafafa] hover:bg-[#1B1F24] cursor-pointer rounded-md"
														>
															<span className="flex items-center gap-2 min-w-0">
																{plugin ? (
																	plugin.iconSrc ? (
																		<Image
																			src={plugin.iconSrc}
																			alt=""
																			width={16}
																			height={16}
																			className="shrink-0 rounded-[3px]"
																			aria-hidden
																		/>
																	) : (
																		<span
																			className="shrink-0 flex items-center justify-center w-4 h-4 rounded-[3px] bg-[#1E232B] text-[#FAFAFA] text-[10px] font-semibold uppercase"
																			aria-hidden
																		>
																			{pluginInitial(plugin.label)}
																		</span>
																	)
																) : (
																	<span>{p.emoji || "📁"}</span>
																)}
																<span className="truncate">
																	{p.containerTag === DEFAULT_PROJECT_ID ? (
																		"My Space"
																	) : plugin ? (
																		<>
																			{plugin.label}
																			{plugin.projectId && (
																				<span className="ml-1.5 text-[11px] text-[#737373]">
																					· {plugin.projectId}
																				</span>
																			)}
																		</>
																	) : (
																		spaceSelectorDisplayName(p, p.containerTag)
																	)}
																</span>
															</span>
														</SelectItem>
													)
												},
											)}
										</SelectContent>
									</Select>
								</motion.div>
							)}

							<button
								type="button"
								onClick={() =>
									setDeleteDialog((prev) => ({ ...prev, action: "delete" }))
								}
								className={cn(
									"flex items-center gap-3 p-3 rounded-[12px] cursor-pointer transition-colors w-full text-left",
									deleteDialog.action === "delete"
										? "bg-[#14161A] shadow-inside-out"
										: "bg-[#14161A]/50 hover:bg-[#14161A]/70",
								)}
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

						<div className="flex items-center justify-end gap-[22px]">
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
