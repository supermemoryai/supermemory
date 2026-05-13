"use client"

import { $fetch } from "@lib/api"
import { hasActivePlan } from "@lib/queries"
import type { ConnectionResponseSchema } from "@repo/validation/api"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import { useCustomer } from "autumn-js/react"
import {
	Check,
	ChevronDown,
	FolderOpen,
	History,
	Loader,
	Loader2,
	Play,
	Trash2,
	Zap,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { z } from "zod"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { DEFAULT_PROJECT_ID } from "@lib/constants"
import type { Project } from "@lib/types"
import { Button } from "@ui/components/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import { RemoveConnectionDialog } from "@/components/remove-connection-dialog"
import { SyncStatusBadge } from "@/components/settings/sync-status-badge"
import { SyncHistoryPanel } from "@/components/settings/sync-history-panel"
import { useTriggerSync } from "@/hooks/use-trigger-sync"
import { formatRelativeTime } from "@/components/settings/sync-utils"
import type { ImportProvider } from "@/components/settings/sync-utils"

type GDriveSyncScope = "scoped" | "full"

const GDRIVE_SCOPE_LABELS: Record<GDriveSyncScope, string> = {
	scoped: "Files & Folders",
	full: "Whole Drive",
}

type Connection = z.infer<typeof ConnectionResponseSchema>

type ConnectorProvider = "google-drive" | "notion" | "onedrive"

const CONNECTORS: Record<
	ConnectorProvider,
	{
		title: string
		description: string
		documentLabel: string
		icon: React.ComponentType<{ className?: string }>
	}
> = {
	"google-drive": {
		title: "Google Drive",
		description: "Connect your Google docs, sheets and slides",
		documentLabel: "documents",
		icon: GoogleDrive,
	},
	notion: {
		title: "Notion",
		description: "Import your Notion pages and databases",
		documentLabel: "pages",
		icon: Notion,
	},
	onedrive: {
		title: "OneDrive",
		description: "Access your Microsoft Office documents",
		documentLabel: "documents",
		icon: OneDrive,
	},
} as const

/** Extract typed metadata from a connection, with runtime validation. */
function getConnectionMeta(connection: Connection) {
	const m = connection.metadata as Record<string, unknown> | undefined
	return {
		syncInProgress: m?.syncInProgress === true,
		lastSyncedAt:
			typeof m?.lastSyncedAt === "number" ? m.lastSyncedAt : undefined,
		documentCount: typeof m?.documentCount === "number" ? m.documentCount : 0,
	}
}

/** Check if a connection's auth token has expired. */
function isConnectionExpired(connection: Connection): boolean {
	return !!connection.expiresAt && new Date(connection.expiresAt) <= new Date()
}

function ConnectionRow({
	connection,
	onDelete,
	isDeleting,
	projects,
	onTriggerSync,
	isSyncing,
}: {
	connection: Connection
	onDelete: () => void
	isDeleting: boolean
	projects: Project[]
	onTriggerSync: () => void
	isSyncing: boolean
}) {
	const [historyOpen, setHistoryOpen] = useState(false)
	const config = CONNECTORS[connection.provider as ConnectorProvider]
	if (!config) return null

	const Icon = config.icon
	const meta = getConnectionMeta(connection)
	const expired = isConnectionExpired(connection)

	const getProjectName = (tag: string): string => {
		if (tag === DEFAULT_PROJECT_ID) return "Default"
		return (
			projects.find((p) => p.containerTag === tag)?.name ??
			tag.replace(/^sm_project_/, "").replace(/_/g, " ")
		)
	}

	const projectName = connection.containerTags?.[0]
		? getProjectName(connection.containerTags[0])
		: null

	return (
		<div
			className={cn(
				"bg-[#14161A] border border-[rgba(82,89,102,0.2)] rounded-[12px] px-4 py-3",
				"shadow-[0px_1px_2px_0px_rgba(0,43,87,0.1)]",
			)}
		>
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-4">
					<Icon className="size-6 shrink-0" />
					<div className="flex-1 flex flex-col gap-1">
						<div className="flex items-center gap-3">
							<span
								className={cn(
									dmSans125ClassName(),
									"font-medium text-[16px] text-[#FAFAFA]",
								)}
							>
								{config.title}
							</span>
							<SyncStatusBadge
								syncInProgress={meta.syncInProgress}
								lastSyncedAt={meta.lastSyncedAt}
								isExpired={expired}
							/>
						</div>
						<span
							className={cn(dmSans125ClassName(), "text-[14px] text-[#737373]")}
						>
							{connection.email || "Unknown"}
						</span>
					</div>
					<div className="flex items-center gap-0.5">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation()
								onTriggerSync()
							}}
							disabled={isSyncing || expired}
							className="text-[#737373] hover:text-[#4BA0FA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1.5 rounded-lg hover:bg-white/5"
							aria-label={
								expired
									? "Connection expired"
									: isSyncing
										? "Sync in progress"
										: "Sync now"
							}
							title={
								expired
									? "Reconnect to sync"
									: isSyncing
										? "Sync in progress"
										: "Sync now"
							}
						>
							{isSyncing ? (
								<Loader2 className="size-[18px] animate-spin" />
							) : (
								<Play className="size-[18px]" />
							)}
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation()
								setHistoryOpen((v) => !v)
							}}
							aria-label="Sync history"
							aria-expanded={historyOpen}
							title={historyOpen ? "Hide sync history" : "Sync history"}
							className={cn(
								"transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1.5 rounded-lg hover:bg-white/5 flex items-center gap-0.5",
								historyOpen
									? "text-[#FAFAFA] bg-white/5"
									: "text-[#737373] hover:text-[#FAFAFA]",
							)}
						>
							<History className="size-[18px]" />
							<ChevronDown
								className={cn(
									"size-3 transition-transform",
									historyOpen && "rotate-180",
								)}
							/>
						</button>
						<button
							type="button"
							onClick={onDelete}
							disabled={isDeleting}
							className="text-[#737373] hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1.5 rounded-lg hover:bg-white/5"
							aria-label="Delete connection"
							title="Remove connection"
						>
							<Trash2 className="size-[18px]" />
						</button>
					</div>
				</div>
				<div className="flex items-center gap-3 pt-2.5 border-t border-[rgba(82,89,102,0.12)]">
					<div className="flex items-center gap-2 flex-1 flex-wrap">
						{projectName && (
							<div className="flex items-center gap-1">
								<FolderOpen className="size-3 text-[#4B5563]" />
								<span
									className={cn(
										dmSans125ClassName(),
										"text-[12px] text-[#737373] capitalize",
									)}
								>
									{projectName}
								</span>
							</div>
						)}
						<span
							className={cn(dmSans125ClassName(), "text-[12px] text-[#737373]")}
						>
							Last synced: {formatRelativeTime(meta.lastSyncedAt)}
						</span>
					</div>
					<div className="flex items-baseline gap-1 shrink-0">
						<span
							className={cn(
								dmSans125ClassName(),
								"text-[14px] font-semibold text-[#FAFAFA]",
							)}
						>
							{meta.documentCount}
						</span>
						<span
							className={cn(dmSans125ClassName(), "text-[12px] text-[#737373]")}
						>
							{config.documentLabel}
						</span>
					</div>
				</div>

				{historyOpen && (
					<div className="border-t border-[rgba(82,89,102,0.12)] pt-3">
						<SyncHistoryPanel
							connectionId={connection.id}
							isOpen={historyOpen}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

interface ConnectContentProps {
	selectedProject: string
}

export function ConnectContent({ selectedProject }: ConnectContentProps) {
	const queryClient = useQueryClient()
	const autumn = useCustomer()
	const isProUser = hasActivePlan(autumn.data?.subscriptions, "api_pro")
	const [connectingProvider, setConnectingProvider] =
		useState<ConnectorProvider | null>(null)
	const [gdriveSyncScope, setGdriveSyncScope] =
		useState<GDriveSyncScope>("scoped")
	const [isUpgrading, setIsUpgrading] = useState(false)
	const [removeDialog, setRemoveDialog] = useState<{
		open: boolean
		connection: Connection | null
	}>({ open: false, connection: null })
	const triggerSync = useTriggerSync()

	const projects = (queryClient.getQueryData<Project[]>(["projects"]) ||
		[]) as Project[]

	const handleUpgrade = async () => {
		setIsUpgrading(true)
		try {
			const result = await autumn.attach({
				planId: "api_pro",
				successUrl: window.location.href,
			})
			if (result?.paymentUrl) {
				window.open(result.paymentUrl, "_self")
				return
			}
			autumn.refetch?.()
		} catch (error) {
			console.error("Upgrade error:", error)
			toast.error("Failed to start upgrade process")
		} finally {
			setIsUpgrading(false)
		}
	}

	const connectionsBalance = autumn.data?.balances?.connections
	const connectionsUsed = connectionsBalance?.usage ?? 0
	const connectionsLimit = connectionsBalance?.granted ?? 10
	const canAddConnection = connectionsUsed < connectionsLimit

	// Fetch connections
	const { data: connections = [], error: connectionsError } = useQuery({
		queryKey: ["connections"],
		queryFn: async () => {
			const response = await $fetch("@post/connections/list", {
				body: {
					containerTags: [],
				},
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to load connections")
			}

			return response.data as Connection[]
		},
		staleTime: 30 * 1000,
		refetchInterval: (query) => {
			const conns = query.state.data as Connection[] | undefined
			if (conns?.some((c) => getConnectionMeta(c).syncInProgress)) {
				return 5000
			}
			return 60 * 1000
		},
		refetchIntervalInBackground: true,
	})

	// Handle connection errors
	useEffect(() => {
		if (connectionsError) {
			toast.error("Failed to load connections", {
				description:
					connectionsError instanceof Error
						? connectionsError.message
						: "Unknown error",
			})
		}
	}, [connectionsError])

	// Connect mutation
	const addConnectionMutation = useMutation({
		mutationFn: async ({
			provider,
			syncScope,
		}: {
			provider: ConnectorProvider
			syncScope?: GDriveSyncScope
		}) => {
			if (!canAddConnection && !isProUser) {
				throw new Error(
					"Free plan doesn't include connections. Upgrade to Pro for unlimited connections.",
				)
			}

			const response = await $fetch("@post/connections/:provider", {
				params: { provider },
				body: {
					redirectUrl: window.location.href,
					containerTags: [selectedProject],
					metadata:
						provider === "google-drive" && syncScope === "full"
							? { syncScope: "full" }
							: undefined,
				},
			})

			// biome-ignore lint/style/noNonNullAssertion: its fine
			if ("data" in response && !("error" in response.data!)) {
				return response.data
			}

			throw new Error(response.error?.message || "Failed to connect")
		},
		onSuccess: (data) => {
			if (data?.authLink) {
				window.location.href = data.authLink
			}
		},
		onError: (error) => {
			setConnectingProvider(null)
			toast.error("Failed to connect", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const deleteConnectionMutation = useMutation({
		mutationFn: async ({
			connectionId,
			deleteDocuments,
		}: {
			connectionId: string
			deleteDocuments: boolean
		}) => {
			await $fetch(`@delete/connections/${connectionId}`, {
				query: { deleteDocuments },
			})
			return { deleteDocuments }
		},
		onSuccess: (_data, variables) => {
			toast.success(
				variables.deleteDocuments
					? "Connection removal has started. Documents will be permanently deleted in the next few minutes."
					: "Connection removed. Your memories have been kept.",
			)
			setRemoveDialog({ open: false, connection: null })
			queryClient.invalidateQueries({ queryKey: ["connections"] })
		},
		onError: (error) => {
			toast.error("Failed to remove connection", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const handleConnect = (provider: ConnectorProvider) => {
		setConnectingProvider(provider)
		addConnectionMutation.mutate({
			provider,
			syncScope: provider === "google-drive" ? gdriveSyncScope : undefined,
		})
	}

	const hasConnections = connections.length > 0

	const isAnyConnecting =
		connectingProvider !== null || addConnectionMutation.isPending

	return (
		<div className="h-full flex flex-col pt-4 space-y-4">
			{/* Top header — only when empty; once connected, the Add CTA moves into the list header below */}
			{!hasConnections && (
				<div className="flex items-center justify-between px-2">
					<p className="text-[16px] font-semibold">Add a connection</p>
					<span className="bg-[#4BA0FA] text-black text-[12px] font-bold px-1 py-[3px] rounded-[3px]">
						PRO
					</span>
				</div>
			)}

			{/* Provider rows — only on empty state. Each is a labelled, descriptive CTA. */}
			{!hasConnections && (
				<div className="space-y-3">
					{Object.entries(CONNECTORS).map(([provider, config]) => {
						const Icon = config.icon
						const isConnecting =
							connectingProvider === provider ||
							(addConnectionMutation.isPending &&
								addConnectionMutation.variables?.provider === provider)

						return (
							<div
								key={provider}
								className="bg-[#14161A] rounded-[12px] px-4 py-3 flex items-center justify-between gap-3"
							>
								<div className="flex items-center gap-3 flex-1">
									<Icon className="size-6 text-[#737373]" />
									<div className="space-y-[6px] flex-1">
										<p className="text-[16px] font-medium">{config.title}</p>
										<p className="text-[16px] text-[#737373]">
											{config.description}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									{provider === "google-drive" ? (
										<div className="flex items-center rounded-md overflow-hidden">
											<button
												type="button"
												onClick={() => handleConnect("google-drive")}
												disabled={
													!isProUser ||
													isConnecting ||
													addConnectionMutation.isPending
												}
												className="bg-[#4BA0FA] text-black hover:bg-[#4BA0FA]/90 text-[14px] font-medium px-3 h-8 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											>
												{isConnecting ? (
													<Loader className="size-4 animate-spin" />
												) : (
													"Connect"
												)}
											</button>
											<div className="w-px h-5 bg-black/20" />
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<button
														type="button"
														className="bg-[#4BA0FA] text-black hover:bg-[#4BA0FA]/90 px-1.5 h-8 flex items-center transition-colors"
													>
														<ChevronDown className="size-3" />
													</button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-40">
													{(
														Object.entries(GDRIVE_SCOPE_LABELS) as [
															GDriveSyncScope,
															string,
														][]
													).map(([scope, label]) => (
														<DropdownMenuItem
															key={scope}
															onClick={(e) => {
																e.stopPropagation()
																setGdriveSyncScope(scope)
															}}
															className="flex items-center justify-between"
														>
															{label}
															{gdriveSyncScope === scope && (
																<Check className="size-3 text-[#4BA0FA]" />
															)}
														</DropdownMenuItem>
													))}
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									) : (
										<Button
											onClick={() =>
												handleConnect(provider as ConnectorProvider)
											}
											disabled={
												!isProUser ||
												isConnecting ||
												addConnectionMutation.isPending
											}
											className="bg-[#4BA0FA] text-black hover:bg-[#4BA0FA]/90 text-[14px] font-medium px-3 py-1.5 h-8"
										>
											{isConnecting ? (
												<Loader className="size-4 animate-spin" />
											) : (
												"Connect"
											)}
										</Button>
									)}
								</div>
							</div>
						)
					})}
				</div>
			)}

			{/* Connected list - rich rows with status / project / last sync / doc count */}
			{hasConnections && (
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-3 px-1">
						<div className="flex flex-col gap-0.5">
							<div className="flex items-center gap-2">
								<p className="text-[16px] font-semibold">
									Connected to Supermemory
								</p>
								<span className="bg-[#4BA0FA] text-black text-[10px] font-bold px-1 py-[2px] rounded-[3px]">
									PRO
								</span>
							</div>
							{connectionsLimit > 0 && (
								<p className="text-[12px] text-[#737373]">
									{connections.length}/{connectionsLimit} connections used
								</p>
							)}
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									disabled={!isProUser || isAnyConnecting}
									className="flex items-center gap-1.5 bg-[#4BA0FA] text-black hover:bg-[#4BA0FA]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[13px] font-medium rounded-full h-8 px-3 transition-colors shrink-0"
								>
									{isAnyConnecting ? (
										<Loader className="size-3.5 animate-spin" />
									) : (
										<>
											<span>+ Add a connection</span>
											<ChevronDown className="size-3" />
										</>
									)}
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className={cn(
									"min-w-[260px] p-1.5 rounded-xl border border-[#2E3033] shadow-[0px_1.5px_20px_0px_rgba(0,0,0,0.65)]",
									dmSansClassName(),
								)}
								style={{
									background:
										"linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
								}}
							>
								<div className="flex flex-col gap-2">
									<div className="px-3 py-1">
										<span className="text-[10px] uppercase tracking-wider text-[#737373] font-medium">
											Choose a service
										</span>
									</div>
									<div className="flex flex-col">
										<DropdownMenuItem
											onClick={() => {
												setConnectingProvider("google-drive")
												addConnectionMutation.mutate({
													provider: "google-drive",
													syncScope: "scoped",
												})
											}}
											className="flex items-start gap-2.5 px-3 py-2.5 rounded-md cursor-pointer text-white opacity-60 hover:opacity-100 hover:bg-[#293952]/40 focus:bg-[#293952]/40 focus:opacity-100"
										>
											<GoogleDrive className="size-5 mt-0.5 shrink-0" />
											<div className="flex flex-col gap-0.5 min-w-0">
												<span className="text-[14px] font-medium text-[#FAFAFA] leading-tight">
													Google Drive
												</span>
												<span className="text-[11px] text-[#737373] leading-tight">
													Pick specific files & folders
												</span>
											</div>
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => {
												setConnectingProvider("google-drive")
												addConnectionMutation.mutate({
													provider: "google-drive",
													syncScope: "full",
												})
											}}
											className="flex items-start gap-2.5 px-3 py-2.5 rounded-md cursor-pointer text-white opacity-60 hover:opacity-100 hover:bg-[#293952]/40 focus:bg-[#293952]/40 focus:opacity-100"
										>
											<GoogleDrive className="size-5 mt-0.5 shrink-0" />
											<div className="flex flex-col gap-0.5 min-w-0">
												<span className="text-[14px] font-medium text-[#FAFAFA] leading-tight">
													Google Drive
												</span>
												<span className="text-[11px] text-[#737373] leading-tight">
													Sync entire drive
												</span>
											</div>
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => {
												setConnectingProvider("notion")
												addConnectionMutation.mutate({ provider: "notion" })
											}}
											className="flex items-start gap-2.5 px-3 py-2.5 rounded-md cursor-pointer text-white opacity-60 hover:opacity-100 hover:bg-[#293952]/40 focus:bg-[#293952]/40 focus:opacity-100"
										>
											<Notion className="size-5 mt-0.5 shrink-0" />
											<div className="flex flex-col gap-0.5 min-w-0">
												<span className="text-[14px] font-medium text-[#FAFAFA] leading-tight">
													Notion
												</span>
												<span className="text-[11px] text-[#737373] leading-tight">
													Pages and databases
												</span>
											</div>
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => {
												setConnectingProvider("onedrive")
												addConnectionMutation.mutate({ provider: "onedrive" })
											}}
											className="flex items-start gap-2.5 px-3 py-2.5 rounded-md cursor-pointer text-white opacity-60 hover:opacity-100 hover:bg-[#293952]/40 focus:bg-[#293952]/40 focus:opacity-100"
										>
											<OneDrive className="size-5 mt-0.5 shrink-0" />
											<div className="flex flex-col gap-0.5 min-w-0">
												<span className="text-[14px] font-medium text-[#FAFAFA] leading-tight">
													OneDrive
												</span>
												<span className="text-[11px] text-[#737373] leading-tight">
													Office documents
												</span>
											</div>
										</DropdownMenuItem>
									</div>
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div className="flex flex-col gap-3">
						{connections.map((connection) => (
							<ConnectionRow
								key={connection.id}
								connection={connection}
								projects={projects}
								onDelete={() => setRemoveDialog({ open: true, connection })}
								isDeleting={deleteConnectionMutation.isPending}
								onTriggerSync={() =>
									triggerSync.mutate({
										connectionId: connection.id,
										provider: connection.provider as ImportProvider,
										containerTags: connection.containerTags,
									})
								}
								isSyncing={
									(triggerSync.isPending &&
										triggerSync.variables?.connectionId === connection.id) ||
									getConnectionMeta(connection).syncInProgress
								}
							/>
						))}
					</div>
				</div>
			)}

			{/* Empty state panel - only when !hasConnections */}
			{!hasConnections && (
				<div
					id="no-active-connections"
					className="bg-[#14161A] shadow-inside-out rounded-[12px] px-4 py-6 h-full mb-4 flex flex-col justify-center items-center"
				>
					<Zap className="size-6 text-[#737373] mb-3" />
					{!isProUser ? (
						<>
							<p className="text-[14px] text-[#737373] mb-4 text-center">
								{isUpgrading || autumn.isLoading ? (
									<span className="inline-flex items-center gap-2">
										<Loader className="size-4 animate-spin" />
										Upgrading…
									</span>
								) : (
									<>
										<button
											type="button"
											onClick={handleUpgrade}
											className="underline text-[#737373] hover:text-white transition-colors cursor-pointer"
										>
											Upgrade to Pro
										</button>{" "}
										to get
										<br />
										Supermemory Connections
									</>
								)}
							</p>
							<div className="space-y-2 text-[14px]">
								<div className="flex items-center gap-2">
									<Check className="size-4 text-[#4BA0FA]" />
									<span>Unlimited memories</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="size-4 text-[#4BA0FA]" />
									<span>10 connections</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="size-4 text-[#4BA0FA]" />
									<span>Advanced search</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="size-4 text-[#4BA0FA]" />
									<span>Priority support</span>
								</div>
							</div>
						</>
					) : (
						<div
							className={cn(
								"text-[#737373] text-center max-w-[174px] font-medium",
								dmSansClassName(),
							)}
						>
							<p>No connections yet</p>
							<p className="text-[12px]">
								Choose a service above to import your knowledge
							</p>
						</div>
					)}
				</div>
			)}

			<RemoveConnectionDialog
				open={removeDialog.open}
				onOpenChange={(open) => {
					if (!open) setRemoveDialog({ open: false, connection: null })
				}}
				provider={removeDialog.connection?.provider}
				documentCount={
					(removeDialog.connection?.metadata?.documentCount as number) ?? 0
				}
				onConfirm={(deleteDocuments) => {
					if (removeDialog.connection) {
						deleteConnectionMutation.mutate({
							connectionId: removeDialog.connection.id,
							deleteDocuments,
						})
					}
				}}
				isDeleting={deleteConnectionMutation.isPending}
			/>
		</div>
	)
}
