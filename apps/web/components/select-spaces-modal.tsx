"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { Dialog, DialogContent } from "@repo/ui/components/dialog"
import { cn } from "@lib/utils"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
	XIcon,
	Search,
	FolderIcon,
	LayoutGrid,
	Plus,
	Trash2,
	Clock,
	ArrowRight,
	BookOpen,
	Loader,
} from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { DEFAULT_PROJECT_ID } from "@lib/constants"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import type { ContainerTagListType } from "@lib/types"
import {
	compareSpacesUserFirst,
	spaceSelectorDisplayName,
} from "@/lib/ingest-auto-space"
import {
	detectPluginSpace,
	pluginInitial,
	type PluginSpaceInfo,
} from "@/lib/plugin-space"
import { usePluginSpaceMeta } from "@/hooks/use-plugin-space-meta"
import {
	PLUGIN_CATALOG,
	spacePluginIdToCatalogId,
	type PluginInfo,
} from "@/lib/plugin-catalog"
import { InstallSteps, PillButton } from "./integrations/install-steps"

interface SelectSpacesModalProps {
	isOpen: boolean
	onClose: () => void
	selectedProjects: string[]
	onApply: (selected: string[]) => void
	projects: ContainerTagListType[]
	recents?: string[]
	showNewSpace?: boolean
	onNewSpace?: () => void
	enableDelete?: boolean
	onDeleteRequest?: (project: {
		id: string
		name: string
		containerTag: string
	}) => void
}

type CategoryId =
	| "all"
	| "my"
	| `plugin:${PluginSpaceInfo["pluginId"]}`
	| `discover:${string}`

type Category = {
	id: CategoryId
	label: string
	iconSrc: string | null
	emoji: string | null
	count: number
}

export function SelectSpacesModal({
	isOpen,
	onClose,
	selectedProjects,
	onApply,
	projects,
	recents,
	showNewSpace = false,
	onNewSpace,
	enableDelete = false,
	onDeleteRequest,
}: SelectSpacesModalProps) {
	const [searchQuery, setSearchQuery] = useState("")
	const currentSelection = selectedProjects[0] ?? ""

	const pluginTags = useMemo(
		() =>
			projects
				.filter((p) => !!detectPluginSpace(p.containerTag))
				.map((p) => p.containerTag),
		[projects],
	)

	const pluginMetaMap = usePluginSpaceMeta(pluginTags)

	const allSpaces = useMemo(() => {
		const defaultSpace = {
			id: "default",
			name: "My Space",
			emoji: "📁",
			containerTag: DEFAULT_PROJECT_ID,
			isExperimental: false,
			isNova: false,
			createdAt: "",
			updatedAt: "",
		} as ContainerTagListType
		const rest = projects
			.filter((p) => p.containerTag !== DEFAULT_PROJECT_ID)
			.sort(compareSpacesUserFirst)
		return [defaultSpace, ...rest]
	}, [projects])

	const { categories, connectedCatalogIds } = useMemo<{
		categories: Category[]
		connectedCatalogIds: Set<string>
	}>(() => {
		const pluginCounts = new Map<
			PluginSpaceInfo["pluginId"],
			{ label: string; iconSrc: string | null; count: number }
		>()
		let myCount = 0
		for (const p of allSpaces) {
			const plugin = detectPluginSpace(p.containerTag)
			if (plugin) {
				const prev = pluginCounts.get(plugin.pluginId)
				pluginCounts.set(plugin.pluginId, {
					label: plugin.label,
					iconSrc: plugin.iconSrc,
					count: (prev?.count ?? 0) + 1,
				})
			} else {
				myCount += 1
			}
		}
		const pluginCats: Category[] = Array.from(pluginCounts.entries())
			.map(([id, info]) => ({
				id: `plugin:${id}` as CategoryId,
				label: info.label,
				iconSrc: info.iconSrc,
				emoji: null,
				count: info.count,
			}))
			.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
		const connectedIds = new Set<string>()
		for (const pluginId of pluginCounts.keys()) {
			const catalogId = spacePluginIdToCatalogId(pluginId)
			if (catalogId) connectedIds.add(catalogId)
		}
		return {
			categories: [
				{
					id: "all",
					label: "All Spaces",
					iconSrc: null,
					emoji: null,
					count: allSpaces.length,
				},
				{
					id: "my",
					label: "My Spaces",
					iconSrc: null,
					emoji: "📁",
					count: myCount,
				},
				...pluginCats,
			],
			connectedCatalogIds: connectedIds,
		}
	}, [allSpaces])

	const defaultCategory = useMemo<CategoryId>(() => {
		if (!currentSelection) return "all"
		const plugin = detectPluginSpace(currentSelection)
		if (plugin) return `plugin:${plugin.pluginId}`
		return "my"
	}, [currentSelection])

	const [activeCategory, setActiveCategory] =
		useState<CategoryId>(defaultCategory)

	useEffect(() => {
		if (isOpen) setActiveCategory(defaultCategory)
	}, [isOpen, defaultCategory])

	const { org } = useAuth()
	const queryClient = useQueryClient()
	const [connectingPluginId, setConnectingPluginId] = useState<string | null>(
		null,
	)
	const [newKey, setNewKey] = useState<{
		pluginId: string
		key: string
	} | null>(null)

	const { data: availablePluginsData } = useQuery({
		queryKey: ["plugins"],
		queryFn: async () => {
			const API_URL =
				process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
			const res = await fetch(`${API_URL}/v3/auth/plugins`, {
				credentials: "include",
			})
			if (!res.ok) throw new Error("Failed to fetch plugins")
			return (await res.json()) as { plugins: string[] }
		},
		staleTime: 5 * 60 * 1000,
		enabled: isOpen,
	})

	const { data: apiKeys = [] } = useQuery({
		queryKey: ["api-keys", org?.id],
		enabled: isOpen && !!org?.id,
		queryFn: async () => {
			if (!org?.id) return []
			const data = await authClient.apiKey.list({
				fetchOptions: { query: { metadata: { organizationId: org.id } } },
			})
			return data.filter((key) => key.metadata?.organizationId === org.id)
		},
	})

	const apiKeyConnectedIds = useMemo(() => {
		const ids = new Set<string>()
		for (const key of apiKeys) {
			if (!key.metadata) continue
			try {
				const metadata =
					typeof key.metadata === "string"
						? (JSON.parse(key.metadata) as {
								sm_type?: string
								sm_client?: string
							})
						: (key.metadata as { sm_type?: string; sm_client?: string })
				if (metadata.sm_type === "plugin_auth" && metadata.sm_client) {
					ids.add(metadata.sm_client)
				}
			} catch {}
		}
		return ids
	}, [apiKeys])

	const discoverCategories = useMemo<Category[]>(() => {
		const availableIds =
			availablePluginsData?.plugins ?? Object.keys(PLUGIN_CATALOG)
		return availableIds
			.filter((id) => !!PLUGIN_CATALOG[id])
			.filter(
				(id) => !apiKeyConnectedIds.has(id) && !connectedCatalogIds.has(id),
			)
			.map((id) => {
				const info = PLUGIN_CATALOG[id] as PluginInfo
				return {
					id: `discover:${id}` as CategoryId,
					label: info.name,
					iconSrc: info.icon,
					emoji: null,
					count: 0,
				}
			})
	}, [availablePluginsData, apiKeyConnectedIds, connectedCatalogIds])

	const connectMutation = useMutation({
		mutationFn: async (pluginId: string) => {
			const API_URL =
				process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
			const params = new URLSearchParams({ client: pluginId })
			const res = await fetch(`${API_URL}/v3/auth/key?${params}`, {
				credentials: "include",
			})
			if (!res.ok) {
				if (res.status === 403) {
					throw new Error(
						"This plugin requires a Pro plan. Hermes is available on the Free plan.",
					)
				}
				const errorData = (await res.json().catch(() => ({}))) as {
					message?: string
				}
				throw new Error(errorData.message || "Failed to create plugin key")
			}
			return (await res.json()) as { key: string }
		},
		onMutate: (pluginId) => setConnectingPluginId(pluginId),
		onError: (err) => {
			toast.error("Failed to connect plugin", {
				description: err instanceof Error ? err.message : "Unknown error",
			})
		},
		onSettled: () => {
			setConnectingPluginId(null)
			queryClient.invalidateQueries({ queryKey: ["api-keys", org?.id] })
		},
		onSuccess: (data, pluginId) => {
			setNewKey({ pluginId, key: data.key })
			toast.success("Plugin connected!")
		},
	})

	useEffect(() => {
		if (!isOpen) {
			setNewKey(null)
		}
	}, [isOpen])

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			onClose()
			setSearchQuery("")
		}
	}

	const handleSelect = (containerTag: string) => {
		onApply([containerTag])
		setSearchQuery("")
	}

	const filteredProjects = useMemo(() => {
		const byCategory = allSpaces.filter((p) => {
			if (activeCategory === "all") return true
			const plugin = detectPluginSpace(p.containerTag)
			if (activeCategory === "my") return !plugin
			return plugin && `plugin:${plugin.pluginId}` === activeCategory
		})
		if (!searchQuery.trim()) return byCategory
		const query = searchQuery.trim().toLowerCase()
		return byCategory.filter((p) => {
			const plugin = detectPluginSpace(p.containerTag)
			const projectName = pluginMetaMap.get(p.containerTag)?.projectName
			return (
				p.containerTag.toLowerCase().includes(query) ||
				(p.name ?? "").toLowerCase().includes(query) ||
				(plugin?.label.toLowerCase().includes(query) ?? false) ||
				(plugin?.projectId?.toLowerCase().includes(query) ?? false) ||
				(projectName?.toLowerCase().includes(query) ?? false)
			)
		})
	}, [allSpaces, activeCategory, searchQuery, pluginMetaMap])

	const recentProjects = useMemo<ContainerTagListType[]>(() => {
		if (!recents?.length) return []
		if (searchQuery.trim()) return []
		if (activeCategory !== "all") return []
		const byTag = new Map(allSpaces.map((p) => [p.containerTag, p]))
		const out: ContainerTagListType[] = []
		for (const tag of recents) {
			const p = byTag.get(tag)
			if (p) out.push(p)
			if (out.length >= 5) break
		}
		return out
	}, [recents, searchQuery, activeCategory, allSpaces])

	const recentSet = useMemo(
		() => new Set(recentProjects.map((p) => p.containerTag)),
		[recentProjects],
	)

	const mainList = useMemo(
		() =>
			recentSet.size > 0
				? filteredProjects.filter((p) => !recentSet.has(p.containerTag))
				: filteredProjects,
		[filteredProjects, recentSet],
	)

	const renderRow = (project: ContainerTagListType) => {
		const isSelected = currentSelection === project.containerTag
		const plugin = detectPluginSpace(project.containerTag)
		const pluginProjectName = pluginMetaMap.get(
			project.containerTag,
		)?.projectName
		const pluginIdLabel = pluginProjectName || plugin?.projectId
		const isDefault = project.containerTag === DEFAULT_PROJECT_ID
		return (
			<div
				key={project.containerTag}
				className={cn(
					"group flex min-w-0 max-w-full items-center gap-3 w-full px-3 py-2.5 rounded-[12px] transition-colors",
					isSelected
						? "bg-[#14161A] shadow-inside-out"
						: "hover:bg-[#14161A]/50",
				)}
			>
				<button
					type="button"
					onClick={() => handleSelect(project.containerTag)}
					className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer focus:outline-none focus:ring-0"
				>
					<div
						className={cn(
							"w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
							isSelected ? "border-[#4BA0FA]" : "border-[#737373]",
						)}
					>
						{isSelected && (
							<div className="w-2 h-2 rounded-full bg-[#4BA0FA]" />
						)}
					</div>
					{plugin ? (
						plugin.iconSrc ? (
							<Image
								src={plugin.iconSrc}
								alt=""
								width={20}
								height={20}
								className="shrink-0 rounded-[4px]"
								aria-hidden
							/>
						) : (
							<span
								className="shrink-0 flex items-center justify-center w-5 h-5 rounded-[4px] bg-[#1E232B] text-[#FAFAFA] text-[11px] font-semibold uppercase"
								aria-hidden
							>
								{pluginInitial(plugin.label)}
							</span>
						)
					) : (
						<span className="shrink-0 text-lg">{project.emoji || "📁"}</span>
					)}
					<span
						className="min-w-0 flex-1 truncate text-[#fafafa] text-sm font-medium"
						title={project.containerTag}
					>
						{plugin ? (
							<>
								{plugin.label}
								{pluginIdLabel && (
									<span className="ml-1.5 text-[12px] text-[#737373]">
										· {pluginIdLabel}
									</span>
								)}
							</>
						) : (
							spaceSelectorDisplayName(project, project.containerTag)
						)}
					</span>
				</button>
				{enableDelete && !isDefault && onDeleteRequest && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onDeleteRequest({
								id: project.id,
								name: project.name,
								containerTag: project.containerTag,
							})
						}}
						aria-label="Delete space"
						className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-red-500/15 cursor-pointer focus:outline-none"
					>
						<Trash2 className="size-3.5 text-red-400" />
					</button>
				)}
			</div>
		)
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent
				className={cn(
					"w-[calc(100vw-1rem)]! max-w-[720px]! max-h-[calc(100dvh-1rem)] border-none bg-[#1B1F24] flex flex-col p-0 gap-0 rounded-[22px] overflow-hidden sm:w-[92vw]!",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<div className="flex items-start justify-between gap-4 px-4 pt-4">
					<div className="pl-1 space-y-1 flex-1">
						<p
							className={cn(
								"font-semibold text-[#fafafa]",
								dmSans125ClassName(),
							)}
						>
							Select Space
						</p>
						<p className="text-[#737373] font-medium text-[14px] leading-[1.35]">
							Filter your memories by space
						</p>
					</div>
					<DialogPrimitive.Close
						className="bg-[#0D121A] w-7 h-7 flex items-center justify-center focus:ring-ring rounded-full transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border border-[rgba(115,115,115,0.2)] shrink-0"
						style={{
							boxShadow: "inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
						}}
					>
						<XIcon stroke="#737373" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				</div>

				<div className="mt-4 flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-4 pb-4 sm:min-h-[420px] sm:flex-row sm:gap-3">
					<div className="w-full shrink-0 overflow-y-auto scrollbar-thin sm:w-[200px] sm:pr-1">
						<div className="grid grid-cols-2 gap-1 sm:flex sm:flex-col">
							{categories.map((category) => {
								const isActive = activeCategory === category.id
								return (
									<button
										key={category.id}
										type="button"
										onClick={() => setActiveCategory(category.id)}
										className={cn(
											"flex min-w-0 items-center gap-2.5 px-3 py-2 rounded-[12px] text-left transition-colors cursor-pointer focus:outline-none focus:ring-0 sm:w-full",
											isActive
												? "bg-[#14161A] shadow-inside-out text-[#fafafa]"
												: "text-[#A1A1AA] hover:bg-[#14161A]/50 hover:text-[#fafafa]",
											dmSansClassName(),
										)}
									>
										<span className="shrink-0 w-5 h-5 flex items-center justify-center">
											{category.id === "all" ? (
												<LayoutGrid
													className={cn(
														"size-4",
														isActive ? "text-[#fafafa]" : "text-[#737373]",
													)}
												/>
											) : category.iconSrc ? (
												<Image
													src={category.iconSrc}
													alt=""
													width={18}
													height={18}
													className="rounded-[3px]"
													aria-hidden
												/>
											) : category.emoji ? (
												<span className="text-base">{category.emoji}</span>
											) : category.id.startsWith("plugin:") ? (
												<span
													className="w-[18px] h-[18px] flex items-center justify-center rounded-[3px] bg-[#1E232B] text-[#FAFAFA] text-[10px] font-semibold uppercase"
													aria-hidden
												>
													{pluginInitial(category.label)}
												</span>
											) : (
												<FolderIcon
													className={cn(
														"size-4",
														isActive ? "text-[#fafafa]" : "text-[#737373]",
													)}
												/>
											)}
										</span>
										<span className="flex-1 min-w-0 truncate text-[14px] font-medium">
											{category.label}
										</span>
										<span className="shrink-0 text-[11px] text-[#737373] tabular-nums">
											{category.count}
										</span>
									</button>
								)
							})}

							{discoverCategories.length > 0 && (
								<>
									<div className="col-span-2 mt-3 px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.08em] text-[#737373] sm:mt-2 sm:px-3 sm:pt-2 sm:pb-1">
										Discover
									</div>
									{discoverCategories.map((category) => {
										const isActive = activeCategory === category.id
										return (
											<button
												key={category.id}
												type="button"
												onClick={() => setActiveCategory(category.id)}
												className={cn(
													"flex min-w-0 items-center gap-2.5 px-3 py-2 rounded-[12px] text-left transition-colors cursor-pointer focus:outline-none focus:ring-0 sm:w-full",
													isActive
														? "bg-[#14161A] shadow-inside-out text-[#fafafa] opacity-100"
														: "opacity-55 hover:opacity-100 hover:bg-[#14161A]/50 text-[#A1A1AA] hover:text-[#fafafa]",
													dmSansClassName(),
												)}
											>
												<span className="shrink-0 w-5 h-5 flex items-center justify-center">
													{category.iconSrc ? (
														<Image
															src={category.iconSrc}
															alt=""
															width={18}
															height={18}
															className="rounded-[3px]"
															aria-hidden
														/>
													) : (
														<span
															className="w-[18px] h-[18px] flex items-center justify-center rounded-[3px] bg-[#1E232B] text-[#FAFAFA] text-[10px] font-semibold uppercase"
															aria-hidden
														>
															{pluginInitial(category.label)}
														</span>
													)}
												</span>
												<span className="flex-1 min-w-0 truncate text-[14px] font-medium">
													{category.label}
												</span>
												<ArrowRight className="size-3.5 shrink-0 text-[#737373]" />
											</button>
										)
									})}
								</>
							)}
						</div>
					</div>

					<div className="flex min-h-0 flex-1 flex-col gap-3">
						{activeCategory.startsWith("discover:") ? (
							<DiscoverPanel
								catalogId={activeCategory.slice("discover:".length)}
								isConnecting={
									connectingPluginId ===
									activeCategory.slice("discover:".length)
								}
								newKey={
									newKey?.pluginId === activeCategory.slice("discover:".length)
										? newKey.key
										: null
								}
								onConnect={() =>
									connectMutation.mutate(
										activeCategory.slice("discover:".length),
									)
								}
								onDismissKey={() => setNewKey(null)}
							/>
						) : (
							<>
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#737373]" />
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search spaces..."
										className={cn(
											"w-full bg-[#14161A] shadow-inside-out pl-10 pr-4 py-2.5 rounded-[12px] text-[#fafafa] text-[14px] placeholder:text-[#737373] focus:outline-none",
											dmSansClassName(),
										)}
										autoFocus
									/>
								</div>

								<div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin pr-1 sm:max-h-[360px]">
									{filteredProjects.length === 0 ? (
										<p className="text-center text-[#737373] text-sm py-8">
											No spaces found
										</p>
									) : (
										<div className="flex flex-col gap-1">
											{recentProjects.length > 0 && (
												<>
													<div className="flex items-center gap-1.5 px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-[0.08em] text-[#737373]">
														<Clock className="size-3" />
														Recently used
													</div>
													{recentProjects.map(renderRow)}
													<div className="my-1.5 h-px bg-[rgba(82,89,102,0.18)]" />
													<div className="px-3 pt-0.5 pb-0.5 text-[10px] uppercase tracking-[0.08em] text-[#737373]">
														All spaces
													</div>
												</>
											)}
											{mainList.map(renderRow)}
										</div>
									)}
								</div>
							</>
						)}
					</div>
				</div>

				{showNewSpace &&
					onNewSpace &&
					!activeCategory.startsWith("discover:") && (
						<div className="flex items-center justify-end border-t border-[rgba(82,89,102,0.18)] px-4 py-3">
							<button
								type="button"
								onClick={onNewSpace}
								className={cn(
									"flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium text-[#fafafa] bg-[#14161A] shadow-inside-out hover:bg-[#121820] transition-colors cursor-pointer focus:outline-none focus:ring-0",
									dmSansClassName(),
								)}
							>
								<Plus className="size-4" />
								New space
							</button>
						</div>
					)}
			</DialogContent>
		</Dialog>
	)
}

function DiscoverPanel({
	catalogId,
	isConnecting,
	newKey,
	onConnect,
	onDismissKey,
}: {
	catalogId: string
	isConnecting: boolean
	newKey: string | null
	onConnect: () => void
	onDismissKey: () => void
}) {
	const info = PLUGIN_CATALOG[catalogId]
	if (!info) {
		return (
			<p className="text-[#737373] text-sm py-8 text-center">
				Plugin info unavailable.
			</p>
		)
	}

	const pluginSteps = info.installSteps ?? []
	const stepsEmbedKey = pluginSteps.some((s) => s.code?.includes("sm_..."))
	const setupSteps = stepsEmbedKey
		? pluginSteps
		: [
				{
					title: "Copy your API key",
					description:
						"You won't be able to see it again — store it somewhere safe.",
					code: newKey ?? "sm_...",
					copyLabel: "API key",
					secret: true,
				},
				...pluginSteps,
			]
	const isConnected = !!newKey

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-thin pr-1">
			<div className="flex items-start gap-3">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-[#1E293B] bg-[#080B0F]">
					<Image
						alt={info.name}
						className="size-7"
						height={28}
						src={info.icon}
						width={28}
					/>
				</div>
				<div className="flex-1 min-w-0">
					<p
						className={cn(
							dmSans125ClassName(),
							"font-semibold text-[16px] text-[#FAFAFA]",
						)}
					>
						{info.name}
					</p>
					<p className="text-[13px] text-[#737373] leading-[1.4] mt-1">
						{info.tagline}
					</p>
				</div>
			</div>

			{isConnected && (
				<div className="flex items-center justify-between gap-2">
					<p className="text-[13px] font-medium text-[#FAFAFA]">
						Plugin connected — finish setup
					</p>
					<button
						type="button"
						onClick={onDismissKey}
						className="text-[#737373] hover:text-[#FAFAFA] cursor-pointer"
						aria-label="Dismiss"
					>
						<XIcon className="size-4" />
					</button>
				</div>
			)}

			{isConnected && (
				<p className="text-[12px] text-[#737373]">
					Your API key is shown once. Hover or focus the blurred command to
					reveal it.
				</p>
			)}

			<div className="relative">
				<div
					className={cn(
						"transition-[filter] duration-200",
						!isConnected && "blur-[6px] pointer-events-none select-none",
					)}
					aria-hidden={!isConnected}
				>
					<InstallSteps steps={setupSteps} apiKey={newKey ?? undefined} />
				</div>

				{!isConnected && (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
						<PillButton onClick={onConnect} disabled={isConnecting}>
							{isConnecting ? (
								<>
									<Loader className="size-3.5 animate-spin" /> Connecting…
								</>
							) : (
								`Connect ${info.name}`
							)}
						</PillButton>
						{info.docsUrl && (
							<a
								href={info.docsUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(
									dmSans125ClassName(),
									"flex h-8 min-w-[94px] items-center justify-center gap-1.5 rounded-full px-3 sm:h-9 sm:min-w-[116px] sm:px-5",
									"text-[12px] font-medium text-[#A1A1AA] sm:text-[14px]",
									"transition-colors hover:text-[#FAFAFA]",
								)}
							>
								<BookOpen className="size-3.5" /> Docs
							</a>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
