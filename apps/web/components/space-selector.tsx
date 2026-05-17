"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@lib/utils"
import { $fetch } from "@lib/api"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { DEFAULT_PROJECT_ID } from "@lib/constants"
import { ChevronDownIcon, Sparkles, XIcon, Loader2, Trash2 } from "lucide-react"
import type { ContainerTagListType } from "@lib/types"
import { AUTO_CHAT_SPACE_ID } from "@/lib/chat-auto-space"
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
import { useAuth } from "@lib/auth-context"
import { analytics } from "@/lib/analytics"
import {
	compareSpacesUserFirst,
	isOwnConversationSpace,
	spaceSelectorDisplayName,
} from "@/lib/ingest-auto-space"
import { detectPluginSpace, pluginInitial } from "@/lib/plugin-space"
import { usePluginSpaceMeta } from "@/hooks/use-plugin-space-meta"
import NovaOrb from "@/components/nova/nova-orb"

export interface SpaceSelectorProps {
	selectedProjects: string[]
	onValueChange: (containerTags: string[]) => void
	variant?: "default" | "insideOut"
	triggerClassName?: string
	showNewSpace?: boolean
	enableDelete?: boolean
	compact?: boolean
	includeAuto?: boolean
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

type DeleteProjectTarget = {
	id: string
	name: string
	containerTag: string
}

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
	includeAuto = false,
}: SpaceSelectorProps) {
	const [showCreateDialog, setShowCreateDialog] = useState(false)
	const [showSelectSpacesModal, setShowSelectSpacesModal] = useState(false)
	const [recents, setRecents] = useState<string[]>([])
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean
		project: DeleteProjectTarget | null
		action: "move" | "delete"
		targetProjectId: string
	}>({
		open: false,
		project: null,
		action: "move",
		targetProjectId: "",
	})
	const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
		open: boolean
		projects: DeleteProjectTarget[]
		confirmation: string
	}>({
		open: false,
		projects: [],
		confirmation: "",
	})

	const { deleteProjectMutation, deleteProjectsMutation } =
		useProjectMutations()
	const { allProjects, isLoading } = useContainerTags()
	const { user } = useAuth()

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
		enabled: !!activeTag && activeTag !== AUTO_CHAT_SPACE_ID,
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
		isAuto: boolean
		isOwnSpace: boolean
	}>(() => {
		const containerTag = selectedProjects[0] ?? ""
		if (includeAuto && containerTag === AUTO_CHAT_SPACE_ID) {
			return {
				name: "Auto",
				emoji: null,
				plugin: null,
				isAuto: true,
				isOwnSpace: false,
			}
		}
		if (!containerTag || containerTag === DEFAULT_PROJECT_ID) {
			return {
				name: "My Space",
				emoji: "📁",
				plugin: null,
				isAuto: false,
				isOwnSpace: false,
			}
		}
		const found = allProjects.find(
			(p: ContainerTagListType) => p.containerTag === containerTag,
		)
		const plugin = detectPluginSpace(containerTag)
		const isOwnSpace = isOwnConversationSpace({ containerTag }, user?.id)
		const projectName = pluginMetaMap.get(containerTag)?.projectName
		const idForLabel = projectName || plugin?.projectId
		return {
			name: plugin
				? idForLabel
					? `${plugin.label} · ${idForLabel}`
					: plugin.label
				: spaceSelectorDisplayName(found, containerTag, {
						currentUserId: user?.id,
					}),
			emoji: found?.emoji || "📁",
			plugin,
			isAuto: false,
			isOwnSpace,
		}
	}, [allProjects, selectedProjects, pluginMetaMap, includeAuto, user?.id])

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
			if (selectedTag && selectedTag !== AUTO_CHAT_SPACE_ID) {
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

	const handleDeleteRequest = useCallback((project: DeleteProjectTarget) => {
		setShowSelectSpacesModal(false)
		setDeleteDialog({
			open: true,
			project,
			action: "move",
			targetProjectId: "",
		})
	}, [])

	const handleBulkDeleteRequest = useCallback(
		(projects: DeleteProjectTarget[]) => {
			if (projects.length === 0) return
			setShowSelectSpacesModal(false)
			setBulkDeleteDialog({
				open: true,
				projects,
				confirmation: "",
			})
		},
		[],
	)

	const handleDeleteConfirm = () => {
		if (!deleteDialog.project) return
		deleteProjectMutation.mutate(
			{
				projectId: deleteDialog.project.id,
				containerTag: deleteDialog.project.containerTag,
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

	const handleBulkDeleteCancel = () => {
		setBulkDeleteDialog({
			open: false,
			projects: [],
			confirmation: "",
		})
	}

	const handleBulkDeleteConfirm = () => {
		if (
			bulkDeleteDialog.confirmation !== "DELETE" ||
			bulkDeleteDialog.projects.length === 0
		) {
			return
		}

		deleteProjectsMutation.mutate(
			{
				projects: bulkDeleteDialog.projects,
			},
			{
				onSettled: () => {
					setBulkDeleteDialog({
						open: false,
						projects: [],
						confirmation: "",
					})
				},
			},
		)
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
						{displayInfo.isAuto ? (
							<Sparkles className="size-3.5 shrink-0 text-[#4BA0FA]" />
						) : displayInfo.isOwnSpace ? (
							<NovaOrb
								size={compact ? 14 : 16}
								className="shrink-0 blur-[0.45px]!"
							/>
						) : displayInfo.plugin ? (
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
						{!compact && (
							<ChevronDownIcon
								className="size-3.5 shrink-0 text-[#737373]"
								aria-hidden
							/>
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
				includeAuto={includeAuto}
				onNewSpace={handleNewSpace}
				enableDelete={enableDelete}
				onDeleteRequest={handleDeleteRequest}
				onBulkDeleteRequest={handleBulkDeleteRequest}
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
													const isOwnSpace = isOwnConversationSpace(p, user?.id)
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
																) : isOwnSpace ? (
																	<NovaOrb
																		size={16}
																		className="shrink-0 blur-[0.45px]!"
																	/>
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
																		spaceSelectorDisplayName(
																			p,
																			p.containerTag,
																			{
																				currentUserId: user?.id,
																			},
																		)
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

			<Dialog
				open={bulkDeleteDialog.open}
				onOpenChange={(open: boolean) => {
					if (!open) handleBulkDeleteCancel()
				}}
			>
				<DialogContent
					className={cn(
						"w-[90%]! max-w-[520px]! border-none bg-[#1B1F24] flex flex-col p-4 gap-4 rounded-[22px]",
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
									Delete {bulkDeleteDialog.projects.length}{" "}
									{bulkDeleteDialog.projects.length === 1 ? "space" : "spaces"}?
								</DialogTitle>
								<DialogDescription className="text-[#737373] font-medium text-[15px] leading-[1.4]">
									This permanently deletes the selected container tags and every
									document and memory inside them. This cannot be undone.
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

						<div className="rounded-[12px] bg-[#14161A] p-3 shadow-inside-out">
							<div className="max-h-36 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
								{bulkDeleteDialog.projects.slice(0, 8).map((project) => (
									<div
										key={project.containerTag}
										className="flex min-w-0 items-center gap-2 text-[13px] text-[#fafafa]"
									>
										<Trash2 className="size-3.5 shrink-0 text-red-400" />
										<span className="truncate">{project.name}</span>
									</div>
								))}
								{bulkDeleteDialog.projects.length > 8 && (
									<p className="text-[12px] text-[#737373]">
										+{bulkDeleteDialog.projects.length - 8} more
									</p>
								)}
							</div>
						</div>

						<label className="space-y-2">
							<span className="block text-[13px] font-medium text-[#FAFAFA]">
								Type DELETE to confirm
							</span>
							<input
								type="text"
								value={bulkDeleteDialog.confirmation}
								onChange={(e) =>
									setBulkDeleteDialog((prev) => ({
										...prev,
										confirmation: e.target.value,
									}))
								}
								className={cn(
									"w-full rounded-[12px] border border-[rgba(82,89,102,0.35)] bg-[#0D121A] px-3 py-2.5 text-sm font-medium text-[#fafafa] shadow-inside-out placeholder:text-[#737373] focus:outline-none focus:ring-1 focus:ring-red-400/40",
									dmSansClassName(),
								)}
								placeholder="DELETE"
								autoComplete="off"
							/>
						</label>

						<div className="flex items-center justify-end gap-[22px]">
							<button
								type="button"
								onClick={handleBulkDeleteCancel}
								disabled={deleteProjectsMutation.isPending}
								className={cn(
									"text-[#737373] font-medium text-[14px] cursor-pointer transition-colors hover:text-[#999]",
									dmSansClassName(),
								)}
							>
								Cancel
							</button>
							<Button
								variant="insideOut"
								onClick={handleBulkDeleteConfirm}
								disabled={
									deleteProjectsMutation.isPending ||
									bulkDeleteDialog.confirmation !== "DELETE" ||
									bulkDeleteDialog.projects.length === 0
								}
								className="rounded-full bg-red-600 px-4 py-[10px] hover:bg-red-700 border-red-700"
							>
								{deleteProjectsMutation.isPending ? (
									<>
										<Loader2 className="size-4 animate-spin mr-2" />
										Deleting...
									</>
								) : (
									"Delete permanently"
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
