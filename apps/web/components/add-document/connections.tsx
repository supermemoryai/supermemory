"use client"

import { $fetch } from "@lib/api"
import { fetchConnectionsFeature } from "@repo/lib/queries"
import type { ConnectionResponseSchema } from "@repo/validation/api"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import { useCustomer } from "autumn-js/react"
import { Check, Loader, Trash2, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { z } from "zod"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"

type Connection = z.infer<typeof ConnectionResponseSchema>

type ConnectorProvider = "google-drive" | "notion" | "onedrive"

const CONNECTORS: Record<
	ConnectorProvider,
	{
		title: string
		description: string
		icon: React.ComponentType<{ className?: string }>
	}
> = {
	"google-drive": {
		title: "Google Drive",
		description: "Connect your Google docs, sheets and slides",
		icon: GoogleDrive,
	},
	notion: {
		title: "Notion",
		description: "Import your Notion pages and databases",
		icon: Notion,
	},
	onedrive: {
		title: "OneDrive",
		description: "Access your Microsoft Office documents",
		icon: OneDrive,
	},
} as const

interface ConnectContentProps {
	selectedProject: string
}

export function ConnectContent({ selectedProject }: ConnectContentProps) {
	const queryClient = useQueryClient()
	const autumn = useCustomer()
	const [isProUser, setIsProUser] = useState(false)
	const [connectingProvider, setConnectingProvider] =
		useState<ConnectorProvider | null>(null)
	const [isUpgrading, setIsUpgrading] = useState(false)

	// Check Pro status
	useEffect(() => {
		if (!autumn.isLoading) {
			setIsProUser(
				autumn.customer?.products?.some(
					(product) => product.id === "api_pro",
				) ?? false,
			)
		}
	}, [autumn.isLoading, autumn.customer])

	const handleUpgrade = async () => {
		setIsUpgrading(true)
		try {
			await autumn.attach({
				productId: "api_pro",
				successUrl: window.location.href,
			})
		} catch (error) {
			console.error("Upgrade error:", error)
			toast.error("Failed to start upgrade process")
			setIsUpgrading(false)
		}
	}

	// Check connections feature limits
	const { data: connectionsCheck } = fetchConnectionsFeature(
		autumn,
		!autumn.isLoading,
	)
	const connectionsUsed = connectionsCheck?.balance ?? 0
	const connectionsLimit = connectionsCheck?.included_usage ?? 0
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
		refetchInterval: 60 * 1000,
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
		mutationFn: async (provider: ConnectorProvider) => {
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

	// Disconnect mutation
	const deleteConnectionMutation = useMutation({
		mutationFn: async (connectionId: string) => {
			await $fetch(`@delete/connections/${connectionId}`)
		},
		onSuccess: () => {
			toast.success(
				"Connection removal has started. supermemory will permanently delete all documents related to the connection in the next few minutes.",
			)
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
		addConnectionMutation.mutate(provider)
	}

	const handleDisconnect = (connectionId: string) => {
		deleteConnectionMutation.mutate(connectionId)
	}

	const hasConnections = connections.length > 0

	// Helper function to format connection subtext safely
	const getConnectionSubtext = (connection: Connection): string => {
		if (connection.email) {
			return connection.email
		}

		return "Connected"
	}

	return (
		<div className="h-full flex flex-col pt-4 space-y-4">
			<div className="flex items-center justify-between px-2">
				<p className="text-[16px] font-semibold">Supermemory Connections</p>
				<span className="bg-[#4BA0FA] text-black text-[12px] font-bold px-1 py-[3px] rounded-[3px]">
					PRO
				</span>
			</div>

			{/* Connector section - conditional layout based on hasConnections */}
			{hasConnections ? (
				<div className="grid grid-cols-3 gap-3">
					{Object.entries(CONNECTORS).map(([provider, config]) => {
						const Icon = config.icon
						const isConnecting =
							connectingProvider === provider ||
							(addConnectionMutation.isPending &&
								addConnectionMutation.variables === provider)

						return (
							<button
								key={provider}
								type="button"
								onClick={() => handleConnect(provider as ConnectorProvider)}
								disabled={
									!isProUser || isConnecting || addConnectionMutation.isPending
								}
								className="bg-[#14161A] border border-[rgba(82,89,102,0.2)] rounded-[12px] px-4 py-3 flex items-center justify-center gap-2 hover:bg-[#1B1F24] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Icon className="w-6 h-6 text-[#737373]" />
								<p className="text-[14px] font-medium text-center">
									{config.title}
								</p>
								{isConnecting && (
									<Loader className="h-4 w-4 animate-spin text-[#4BA0FA]" />
								)}
							</button>
						)
					})}
				</div>
			) : (
				<div className="space-y-3">
					{Object.entries(CONNECTORS).map(([provider, config]) => {
						const Icon = config.icon
						const connection = connections.find(
							(conn) => conn.provider === provider,
						)
						const isConnected = !!connection
						const isConnecting =
							connectingProvider === provider ||
							(addConnectionMutation.isPending &&
								addConnectionMutation.variables === provider)

						return (
							<div
								key={provider}
								className="bg-[#14161A] rounded-[12px] px-4 py-3 flex items-center justify-between gap-3"
							>
								<div className="flex items-center gap-3 flex-1">
									<Icon className="w-6 h-6 text-[#737373]" />
									<div className="space-y-[6px] flex-1">
										<div className="flex items-center gap-2">
											<p className="text-[16px] font-medium">{config.title}</p>
											{isConnected && (
												<span className="text-[12px] text-[#4BA0FA] font-medium">
													{connection.metadata?.syncInProgress
														? "Syncing..."
														: "Connected"}
												</span>
											)}
										</div>
										<p className="text-[16px] text-[#737373]">
											{config.description}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									{isConnected ? (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleDisconnect(connection.id)}
											disabled={deleteConnectionMutation.isPending}
											className="text-[#737373] hover:text-white hover:bg-[#1B1F24] h-8 w-8 p-0"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
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
												<Loader className="h-4 w-4 animate-spin" />
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

			{/* Connected list panel - only when hasConnections */}
			{hasConnections && (
				<div className="bg-[#14161A] border border-[rgba(82,89,102,0.2)] rounded-[12px] shadow-inside-out px-4 py-4 space-y-4">
					<div className="flex items-center justify-between">
						<p className="text-[16px] font-semibold">
							Connected to Supermemory
						</p>
						{connectionsLimit > 0 && (
							<p className="text-[12px] text-[#737373]">
								{connections.length}/{connectionsLimit} connections used
							</p>
						)}
					</div>
					<div className="space-y-3">
						{connections.map((connection) => {
							const config =
								CONNECTORS[connection.provider as ConnectorProvider]
							if (!config) return null

							const Icon = config.icon
							const subtext = getConnectionSubtext(connection)

							return (
								<div
									key={connection.id}
									className="flex items-center justify-between gap-3"
								>
									<div className="flex items-center gap-3 flex-1">
										<Icon className="w-6 h-6 text-[#737373]" />
										<div className="flex-1 min-w-0">
											<p className="text-[16px] font-medium truncate">
												{config.title}
											</p>
											<p className="text-[14px] text-[#737373] truncate">
												{subtext}
											</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleDisconnect(connection.id)}
										disabled={deleteConnectionMutation.isPending}
										className="text-[#737373] hover:text-white hover:bg-[#1B1F24] h-8 w-8 p-0 shrink-0"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							)
						})}
					</div>
				</div>
			)}

			{/* Empty state panel - only when !hasConnections */}
			{!hasConnections && (
				<div
					id="no-active-connections"
					className="bg-[#14161A] shadow-inside-out rounded-[12px] px-4 py-6 h-full mb-4 flex flex-col justify-center items-center"
				>
					<Zap className="w-6 h-6 text-[#737373] mb-3" />
					{!isProUser ? (
						<>
							<p className="text-[14px] text-[#737373] mb-4 text-center">
								{isUpgrading || autumn.isLoading ? (
									<span className="inline-flex items-center gap-2">
										<Loader className="h-4 w-4 animate-spin" />
										Upgrading...
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
									<Check className="w-4 h-4 text-[#4BA0FA]" />
									<span>Unlimited memories</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="w-4 h-4 text-[#4BA0FA]" />
									<span>10 connections</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="w-4 h-4 text-[#4BA0FA]" />
									<span>Advanced search</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="w-4 h-4 text-[#4BA0FA]" />
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
		</div>
	)
}
