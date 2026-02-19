"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { $fetch } from "@lib/api"
import { fetchSubscriptionStatus } from "@lib/queries"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import { useCustomer } from "autumn-js/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Plus, Trash2, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { ConnectionResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { analytics } from "@/lib/analytics"
import { AddDocumentModal } from "@/components/add-document"
import { DEFAULT_PROJECT_ID } from "@repo/lib/constants"
import type { Project } from "@repo/lib/types"

type Connection = z.infer<typeof ConnectionResponseSchema>

const CONNECTORS = {
	"google-drive": {
		title: "Google Drive",
		icon: GoogleDrive,
		documentLabel: "documents",
	},
	notion: { title: "Notion", icon: Notion, documentLabel: "pages" },
	onedrive: { title: "OneDrive", icon: OneDrive, documentLabel: "documents" },
} as const

type ConnectorProvider = keyof typeof CONNECTORS

function ConnectionRow({
	connection,
	onDelete,
	isDeleting,
	disabled,
	projects,
}: {
	connection: Connection
	onDelete: () => void
	isDeleting: boolean
	disabled?: boolean
	projects: Project[]
}) {
	const config = CONNECTORS[connection.provider as ConnectorProvider]
	if (!config) return null

	const Icon = config.icon
	const isConnected =
		!connection.expiresAt || new Date(connection.expiresAt) > new Date()

	const formatRelativeTime = (date: string | null | undefined) => {
		if (!date) return "Never"
		const d = new Date(date)
		const diffMs = Date.now() - d.getTime()
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
		const diffDays = Math.floor(diffHours / 24)
		if (diffHours < 1) return "Just now"
		if (diffHours < 24) return `${diffHours}h ago`
		if (diffDays === 1) return "Yesterday"
		if (diffDays < 7) return `${diffDays} days ago`
		return d.toLocaleDateString()
	}

	const getProjectName = (tag: string): string => {
		if (tag === DEFAULT_PROJECT_ID) return "Default Project"
		return (
			projects.find((p) => p.containerTag === tag)?.name ??
			tag.replace(/^sm_project_/, "")
		)
	}

	const documentCount = (connection.metadata?.documentCount as number) ?? 0
	const containerTags = (
		connection as Connection & { containerTags?: string[] }
	).containerTags
	const projectName = containerTags?.[0]
		? getProjectName(containerTags[0])
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
							<div className="flex items-center gap-2">
								<div
									className={cn(
										"size-[7px] rounded-full",
										isConnected ? "bg-[#00AC3F]" : "bg-[#737373]",
									)}
								/>
								<span
									className={cn(
										dmSans125ClassName(),
										"text-[14px]",
										isConnected ? "text-[#00AC3F]" : "text-[#737373]",
									)}
								>
									{isConnected ? "Connected" : "Disconnected"}
								</span>
							</div>
						</div>
						<span
							className={cn(dmSans125ClassName(), "text-[14px] text-[#737373]")}
						>
							{connection.email || "Unknown"}
						</span>
					</div>
					<button
						type="button"
						onClick={onDelete}
						disabled={isDeleting || disabled}
						className="text-[#737373] hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Trash2 className="size-[22px]" />
					</button>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					{projectName && (
						<>
							<span
								className={cn(
									dmSans125ClassName(),
									"text-[14px] text-[#737373]",
								)}
							>
								Project: {projectName}
							</span>
							<div className="size-[3px] rounded-full bg-[#737373]" />
						</>
					)}
					<span
						className={cn(dmSans125ClassName(), "text-[14px] text-[#737373]")}
					>
						Added: {formatRelativeTime(connection.createdAt)}
					</span>
					<div className="size-[3px] rounded-full bg-[#737373]" />
					<span
						className={cn(dmSans125ClassName(), "text-[14px] text-[#737373]")}
					>
						{documentCount} {config.documentLabel} connected
					</span>
				</div>
			</div>
		</div>
	)
}

export function ConnectionsDetail() {
	const queryClient = useQueryClient()
	const autumn = useCustomer()
	const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false)

	const projects = (queryClient.getQueryData<Project[]>(["projects"]) ||
		[]) as Project[]

	const {
		data: status = { api_pro: { allowed: false, status: null } },
		isLoading: isCheckingStatus,
	} = fetchSubscriptionStatus(autumn, !autumn.isLoading)

	const hasProProduct = status.api_pro?.status !== null

	const connectionsFeature = autumn.customer?.features?.connections
	const connectionsUsed = connectionsFeature?.usage ?? 0
	const connectionsLimit = connectionsFeature?.included_usage ?? 10
	const canAddConnection = connectionsUsed < connectionsLimit

	const {
		data: connections = [],
		isLoading: isLoadingConnections,
		error: connectionsError,
	} = useQuery({
		queryKey: ["connections"],
		queryFn: async () => {
			const response = await $fetch("@post/connections/list", {
				body: { containerTags: [] },
			})
			if (response.error)
				throw new Error(response.error?.message || "Failed to load connections")
			return response.data as Connection[]
		},
		staleTime: 30 * 1000,
		refetchInterval: 60 * 1000,
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
		mutationFn: async (connectionId: string) => {
			await $fetch(`@delete/connections/${connectionId}`)
		},
		onSuccess: () => {
			analytics.connectionDeleted()
			toast.success(
				"Connection removal has started. Documents will be permanently deleted in the next few minutes.",
			)
			queryClient.invalidateQueries({ queryKey: ["connections"] })
		},
		onError: (error) => {
			toast.error("Failed to remove connection", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const handleUpgrade = async () => {
		try {
			await autumn.attach({
				productId: "api_pro",
				successUrl: "https://app.supermemory.ai/?view=integrations",
			})
			window.location.reload()
		} catch (error) {
			console.error(error)
		}
	}

	const isLoading = autumn.isLoading || isCheckingStatus

	return (
		<>
			<div
				className={cn(
					"bg-[#14161A] rounded-[14px] p-6 relative overflow-hidden",
					"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
				)}
			>
				{!hasProProduct && !isLoading && (
					<>
						<div className="absolute inset-0 bg-[#14161A]/80 backdrop-blur-sm z-5" />
						<div className="absolute inset-0 flex items-center justify-center z-10">
							<div className="flex flex-col items-center gap-4">
								<Zap className="size-6 text-[#737373]" />
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[14px] text-[#737373] text-center max-w-[220px]",
									)}
								>
									Connect Google Drive, Notion, and OneDrive to import your
									knowledge
								</p>
								<div className="flex flex-col gap-2">
									{[
										"Unlimited memories",
										"10 connections",
										"Advanced search",
										"Priority support",
									].map((text) => (
										<div key={text} className="flex items-center gap-2">
											<Check className="size-4 shrink-0 text-[#4BA0FA]" />
											<span
												className={cn(
													dmSans125ClassName(),
													"text-[14px] text-white",
												)}
											>
												{text}
											</span>
										</div>
									))}
								</div>
								<button
									type="button"
									onClick={handleUpgrade}
									className={cn(
										"flex items-center justify-center gap-2",
										"bg-[#4BA0FA] hover:bg-[#4BA0FA]/90 text-white",
										"rounded-full h-10 px-6 font-medium text-sm transition-colors cursor-pointer",
										dmSans125ClassName(),
									)}
								>
									Upgrade to Pro
								</button>
							</div>
						</div>
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
								"font-semibold text-[16px] text-[#FAFAFA]",
							)}
						>
							Connected to Supermemory
						</span>
						<span
							className={cn(
								dmSans125ClassName(),
								"font-semibold text-[16px] text-[#737373]",
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
									onDelete={() =>
										deleteConnectionMutation.mutate(connection.id)
									}
									isDeleting={deleteConnectionMutation.isPending}
									disabled={!hasProProduct}
									projects={projects}
								/>
							))
						) : (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Zap className="size-6 text-[#737373] mb-2" />
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[14px] text-[#737373]",
									)}
								>
									No connections yet
								</p>
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[12px] text-[#737373]",
									)}
								>
									Connect a service below to import your knowledge
								</p>
							</div>
						)}
					</div>

					<button
						type="button"
						onClick={() => setIsAddDocumentOpen(true)}
						disabled={!hasProProduct || !canAddConnection}
						className={cn(
							"relative flex items-center justify-center gap-2",
							"bg-[#0D121A] rounded-full h-11 px-4 w-full",
							"cursor-pointer transition-opacity hover:opacity-80",
							"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
							"disabled:opacity-50 disabled:cursor-not-allowed",
							dmSans125ClassName(),
						)}
					>
						<Plus className="size-[10px] text-[#FAFAFA]" />
						<span className="text-[14px] text-[#FAFAFA] font-medium">
							Connect knowledge bases
						</span>
					</button>
				</div>
			</div>

			<AddDocumentModal
				isOpen={isAddDocumentOpen}
				onClose={() => setIsAddDocumentOpen(false)}
				defaultTab="connect"
			/>
		</>
	)
}
