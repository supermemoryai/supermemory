"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { $fetch } from "@lib/api"
import { hasActivePlan } from "@lib/queries"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import { useCustomer } from "autumn-js/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
	Check,
	ChevronDown,
	History,
	Loader2,
	Play,
	Plus,
	Trash2,
	Zap,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useQueryState } from "nuqs"
import type { ConnectionResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { analytics } from "@/lib/analytics"
import { ConnectAIModal } from "@/components/connect-ai-modal"
import { AddDocumentModal } from "@/components/add-document"
import { RemoveConnectionDialog } from "@/components/remove-connection-dialog"
import { addDocumentParam } from "@/lib/search-params"
import { DEFAULT_PROJECT_ID } from "@lib/constants"
import type { Project } from "@lib/types"
import { SyncStatusBadge } from "@/components/settings/sync-status-badge"
import { SyncHistoryPanel } from "@/components/settings/sync-history-panel"
import { useTriggerSync } from "@/hooks/use-trigger-sync"
import { formatRelativeTime } from "@/components/settings/sync-utils"
import type { ImportProvider } from "@/components/settings/sync-utils"

type Connection = z.infer<typeof ConnectionResponseSchema>

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

const CONNECTORS = {
	"google-drive": {
		title: "Google Drive",
		description: "Connect your Google Docs, Sheets, and Slides",
		icon: GoogleDrive,
		documentLabel: "documents",
	},
	notion: {
		title: "Notion",
		description: "Import your Notion pages and databases",
		icon: Notion,
		documentLabel: "pages",
	},
	onedrive: {
		title: "OneDrive",
		description: "Access your Microsoft Office documents",
		icon: OneDrive,
		documentLabel: "documents",
	},
} as const

type ConnectorProvider = keyof typeof CONNECTORS

function SectionTitle({
	children,
	badge,
}: {
	children: React.ReactNode
	badge?: React.ReactNode
}) {
	return (
		<div className="flex items-center justify-between px-2">
			<p
				className={cn(
					dmSans125ClassName(),
					"font-semibold text-[20px] tracking-[-0.2px] text-[#FAFAFA]",
				)}
			>
				{children}
			</p>
			{badge}
		</div>
	)
}

function ProBadge() {
	return (
		<span className="bg-[#4BA0FA] text-[#00171A] text-[12px] font-bold tracking-[0.36px] px-1 py-0.5 rounded-[3px]">
			PRO
		</span>
	)
}

function ConnectionsCard({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return (
		<div
			className={cn(
				"relative bg-[#14161A] rounded-[14px] p-6 w-full overflow-hidden",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
				className,
			)}
		>
			{children}
		</div>
	)
}

function PillButton({
	children,
	onClick,
	disabled,
	className,
}: {
	children: React.ReactNode
	onClick?: () => void
	disabled?: boolean
	className?: string
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"relative flex items-center justify-center gap-2",
				"bg-[#0D121A]",
				"rounded-full h-11 px-4 w-full",
				"cursor-pointer transition-opacity hover:opacity-80",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				dmSans125ClassName(),
				className,
			)}
		>
			{children}
		</button>
	)
}

function ConnectionRow({
	connection,
	onDelete,
	isDeleting,
	disabled,
	projects,
	onTriggerSync,
	isSyncing,
}: {
	connection: Connection
	onDelete: () => void
	isDeleting: boolean
	disabled?: boolean
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

	const getProjectDisplayName = (containerTag: string): string => {
		if (containerTag === DEFAULT_PROJECT_ID) return "Default Project"
		const found = projects.find((p) => p.containerTag === containerTag)
		if (found) return found.name
		return containerTag.replace(/^sm_project_/, "") // if cached project is not found, remove the prefix
	}

	const projectName =
		connection.containerTags &&
		connection.containerTags.length > 0 &&
		connection.containerTags[0]
			? getProjectDisplayName(connection.containerTags[0])
			: null

	return (
		<div
			className={cn(
				"bg-[#14161A] border border-[rgba(82,89,102,0.2)] rounded-[12px] px-4 py-3",
				"shadow-[0px_1px_2px_0px_rgba(0,43,87,0.1)]",
			)}
		>
			<div className="flex flex-col gap-4">
				{/* Main row */}
				<div className="flex items-center gap-4">
					<Icon className="size-6 shrink-0" />
					<div className="flex-1 flex flex-col gap-1.5">
						<div className="flex items-center gap-4">
							<span
								className={cn(
									dmSans125ClassName(),
									"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
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
							className={cn(
								dmSans125ClassName(),
								"font-medium text-[16px] tracking-[-0.16px] text-[#737373]",
							)}
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
							disabled={isSyncing || disabled || expired}
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
							disabled={disabled}
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
							disabled={isDeleting || disabled}
							className="text-[#737373] hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1.5 rounded-lg hover:bg-white/5"
							aria-label="Delete connection"
							title="Remove connection"
						>
							<Trash2 className="size-[18px]" />
						</button>
					</div>
				</div>

				{/* Meta row */}
				<div className="flex items-center gap-2 flex-wrap">
					{projectName && (
						<>
							<span
								className={cn(
									dmSans125ClassName(),
									"font-medium text-[14px] tracking-[-0.14px] text-[#737373]",
								)}
							>
								Project: {projectName}
							</span>
							<div className="size-[3px] rounded-full bg-[#737373]" />
						</>
					)}
					<span
						className={cn(
							dmSans125ClassName(),
							"font-medium text-[14px] tracking-[-0.14px] text-[#737373]",
						)}
					>
						Last synced: {formatRelativeTime(meta.lastSyncedAt)}
					</span>
					<div className="size-[3px] rounded-full bg-[#737373]" />
					<span
						className={cn(
							dmSans125ClassName(),
							"font-medium text-[14px] tracking-[-0.14px] text-[#737373]",
						)}
					>
						{meta.documentCount} {config.documentLabel} connected
					</span>
				</div>

				{historyOpen && (
					<div className="border-t border-[rgba(82,89,102,0.15)] pt-4">
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

function UpgradeOverlay({ onUpgrade }: { onUpgrade: () => void }) {
	return (
		<div className="absolute inset-0 flex items-center justify-center z-10">
			<div className="flex flex-col items-center gap-4">
				<div className="flex flex-col items-center gap-2">
					<Zap className="size-6 text-[#737373]" />
					<p
						className={cn(
							dmSans125ClassName(),
							"font-medium text-[14px] tracking-[-0.14px] text-[#737373] text-center max-w-[184px]",
						)}
					>
						<button
							type="button"
							onClick={onUpgrade}
							className="underline hover:text-white transition-colors cursor-pointer"
						>
							Upgrade to Pro
						</button>{" "}
						to get Supermemory Connections
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<FeatureItem text="Unlimited memories" />
					<FeatureItem text="10 connections" />
					<FeatureItem text="Advanced search" />
					<FeatureItem text="Priority support" />
				</div>
			</div>
		</div>
	)
}

function FeatureItem({ text }: { text: string }) {
	return (
		<div className="flex items-center gap-2">
			<Check className="size-4 shrink-0 text-[#4BA0FA]" />
			<span
				className={cn(
					dmSans125ClassName(),
					"text-[14px] tracking-[-0.14px] text-white",
				)}
			>
				{text}
			</span>
		</div>
	)
}

export default function ConnectionsMCP() {
	const queryClient = useQueryClient()
	const autumn = useCustomer()
	const [addDoc, setAddDoc] = useQueryState("add", addDocumentParam)
	const [mcpModalOpen, setMcpModalOpen] = useState(false)
	const [removeDialog, setRemoveDialog] = useState<{
		open: boolean
		connection: Connection | null
	}>({ open: false, connection: null })
	const triggerSync = useTriggerSync()

	const projects = (queryClient.getQueryData<Project[]>(["projects"]) ||
		[]) as Project[]

	const hasProProduct = hasActivePlan(autumn.data?.subscriptions, "api_pro")

	const connectionsBalance = autumn.data?.balances?.connections
	const connectionsUsed = connectionsBalance?.usage ?? 0
	const connectionsLimit = connectionsBalance?.granted ?? 10

	const canAddConnection = connectionsUsed < connectionsLimit

	// Fetch connections
	const {
		data: connections = [],
		isLoading: isLoadingConnections,
		error: connectionsError,
	} = useQuery({
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
		enabled: hasProProduct,
	})

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
			analytics.connectionDeleted()
			toast.success(
				variables.deleteDocuments
					? "Connection removal has started. Supermemory will permanently delete the documents in the next few minutes."
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

	// Upgrade handler
	const handleUpgrade = async () => {
		try {
			const result = await autumn.attach({
				planId: "api_pro",
				successUrl: `${window.location.origin}/settings#connections`,
			})
			if (result?.paymentUrl) {
				window.open(result.paymentUrl, "_self")
				return
			}
			autumn.refetch?.()
		} catch (error) {
			console.error(error)
			toast.error("Failed to start checkout. Please try again.")
		}
	}

	const isLoading = autumn.isLoading

	return (
		<div className="flex flex-col gap-8 pt-4 w-full">
			{/* Supermemory Connections Section */}
			<div className="flex flex-col gap-4">
				<SectionTitle badge={<ProBadge />}>
					Supermemory Connections
				</SectionTitle>

				<ConnectionsCard className="relative">
					{/* Blur overlay for free users */}
					{!hasProProduct && !isLoading && (
						<>
							<div className="absolute inset-0 bg-[#14161A]/80 backdrop-blur-sm z-5" />
							<UpgradeOverlay onUpgrade={handleUpgrade} />
						</>
					)}

					<div
						className={cn(
							"flex flex-col gap-4",
							!hasProProduct && !isLoading && "opacity-30 pointer-events-none",
						)}
					>
						<div className="flex items-center justify-between">
							<span
								className={cn(
									dmSans125ClassName(),
									"font-semibold text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
								)}
							>
								Connected to Supermemory
							</span>
							<span
								className={cn(
									dmSans125ClassName(),
									"font-semibold text-[16px] tracking-[-0.16px] text-[#737373]",
								)}
							>
								{connections.length}/{connectionsLimit} connections used
							</span>
						</div>

						<div className="flex flex-col gap-4">
							{isLoadingConnections ? (
								<div className="flex items-center justify-center py-8">
									<div className="size-6 border-2 border-[#737373] border-t-transparent rounded-full animate-spin" />
								</div>
							) : connections.length > 0 ? (
								connections.map((connection) => (
									<ConnectionRow
										key={connection.id}
										connection={connection}
										onDelete={() => setRemoveDialog({ open: true, connection })}
										isDeleting={deleteConnectionMutation.isPending}
										disabled={!hasProProduct}
										projects={projects}
										onTriggerSync={() =>
											triggerSync.mutate({
												connectionId: connection.id,
												provider: connection.provider as ImportProvider,
												containerTags: connection.containerTags,
											})
										}
										isSyncing={
											(triggerSync.isPending &&
												triggerSync.variables?.connectionId ===
													connection.id) ||
											getConnectionMeta(connection).syncInProgress
										}
									/>
								))
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<Zap className="size-6 text-[#737373] mb-2" />
									<p
										className={cn(
											dmSans125ClassName(),
											"font-medium text-[14px] text-[#737373]",
										)}
									>
										No connections yet
									</p>
									<p
										className={cn(
											dmSans125ClassName(),
											"font-medium text-[12px] text-[#737373]",
										)}
									>
										Connect a service below to import your knowledge
									</p>
								</div>
							)}
						</div>

						<PillButton
							onClick={() => setAddDoc("connect")}
							disabled={!hasProProduct || !canAddConnection}
						>
							<Plus className="size-[10px] text-[#FAFAFA]" />
							<span className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] font-medium">
								Connect knowledge bases
							</span>
						</PillButton>
					</div>
				</ConnectionsCard>
			</div>

			{/* Supermemory MCP Section */}
			<div className="flex flex-col gap-4">
				<SectionTitle>Supermemory MCP</SectionTitle>

				<ConnectionsCard>
					<div className="flex flex-col gap-4">
						<p
							className={cn(
								dmSans125ClassName(),
								"font-medium text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
							)}
						>
							Connect your AI to create and use your memories via MCP.{" "}
							<a
								href="https://docs.supermemory.ai/supermemory-mcp/introduction"
								target="_blank"
								rel="noopener noreferrer"
								className="underline hover:text-[#4BA0FA] transition-colors"
							>
								Learn more
							</a>
						</p>

						<ConnectAIModal open={mcpModalOpen} onOpenChange={setMcpModalOpen}>
							<PillButton onClick={() => setMcpModalOpen(true)}>
								<Plus className="size-[10px] text-[#FAFAFA]" />
								<span className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] font-medium">
									Connect your AI to Supermemory
								</span>
							</PillButton>
						</ConnectAIModal>
					</div>
				</ConnectionsCard>
			</div>

			{/* Add Document Modal */}
			<AddDocumentModal
				isOpen={addDoc !== null}
				onClose={() => setAddDoc(null)}
			/>

			<RemoveConnectionDialog
				open={removeDialog.open}
				onOpenChange={(open) => {
					if (!open) setRemoveDialog({ open: false, connection: null })
				}}
				provider={removeDialog.connection?.provider}
				documentCount={
					removeDialog.connection
						? getConnectionMeta(removeDialog.connection).documentCount
						: 0
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
