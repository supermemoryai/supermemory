import { $fetch } from "@lib/api"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { generateId } from "@lib/generate-id"
import {
	ADD_MEMORY_SHORTCUT_URL,
	SEARCH_MEMORY_SHORTCUT_URL,
} from "@repo/lib/constants"
import { fetchConnectionsFeature } from "@repo/lib/queries"
import { Button } from "@repo/ui/components/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogPortal,
	DialogTitle,
} from "@repo/ui/components/dialog"
import { Skeleton } from "@repo/ui/components/skeleton"
import type { ConnectionResponseSchema } from "@repo/validation/api"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import { useCustomer } from "autumn-js/react"
import { Check, Copy, Smartphone, Trash2 } from "lucide-react"
import { motion } from "motion/react"
import Image from "next/image"
import { useEffect, useId, useState } from "react"
import { toast } from "sonner"
import type { z } from "zod"
import { analytics } from "@/lib/analytics"
import { useProject } from "@/stores"

type Connection = z.infer<typeof ConnectionResponseSchema>

const CONNECTORS = {
	"google-drive": {
		title: "Google Drive",
		description: "Connect your Google Docs, Sheets, and Slides",
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

type ConnectorProvider = keyof typeof CONNECTORS

const ChromeIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		preserveAspectRatio="xMidYMid"
		viewBox="0 0 190.5 190.5"
		className={className}
	>
		<title>Google Chrome Icon</title>
		<path
			fill="#fff"
			d="M95.252 142.873c26.304 0 47.627-21.324 47.627-47.628s-21.323-47.628-47.627-47.628-47.627 21.324-47.627 47.628 21.323 47.628 47.627 47.628z"
		/>
		<path
			fill="#229342"
			d="m54.005 119.07-41.24-71.43a95.227 95.227 0 0 0-.003 95.25 95.234 95.234 0 0 0 82.496 47.61l41.24-71.43v-.011a47.613 47.613 0 0 1-17.428 17.443 47.62 47.62 0 0 1-47.632.007 47.62 47.62 0 0 1-17.433-17.437z"
		/>
		<path
			fill="#fbc116"
			d="m136.495 119.067-41.239 71.43a95.229 95.229 0 0 0 82.489-47.622A95.24 95.24 0 0 0 190.5 95.248a95.237 95.237 0 0 0-12.772-47.623H95.249l-.01.007a47.62 47.62 0 0 1 23.819 6.372 47.618 47.618 0 0 1 17.439 17.431 47.62 47.62 0 0 1-.001 47.633z"
		/>
		<path
			fill="#1a73e8"
			d="M95.252 132.961c20.824 0 37.705-16.881 37.705-37.706S116.076 57.55 95.252 57.55 57.547 74.431 57.547 95.255s16.881 37.706 37.705 37.706z"
		/>
		<path
			fill="#e33b2e"
			d="M95.252 47.628h82.479A95.237 95.237 0 0 0 142.87 12.76 95.23 95.23 0 0 0 95.245 0a95.222 95.222 0 0 0-47.623 12.767 95.23 95.23 0 0 0-34.856 34.872l41.24 71.43.011.006a47.62 47.62 0 0 1-.015-47.633 47.61 47.61 0 0 1 41.252-23.815z"
		/>
	</svg>
)

export function IntegrationsView() {
	const { org } = useAuth()
	const queryClient = useQueryClient()
	const { selectedProject } = useProject()
	const autumn = useCustomer()
	const [showApiKeyModal, setShowApiKeyModal] = useState(false)
	const [apiKey, setApiKey] = useState<string>("")
	const [copied, setCopied] = useState(false)
	const [isProUser, setIsProUser] = useState(false)
	const [selectedShortcutType, setSelectedShortcutType] = useState<
		"add" | "search" | null
	>(null)
	const apiKeyId = useId()

	const handleUpgrade = async () => {
		try {
			await autumn.attach({
				productId: "consumer_pro",
				successUrl: "https://app.supermemory.ai/",
			})
			window.location.reload()
		} catch (error) {
			console.error(error)
		}
	}

	useEffect(() => {
		if (!autumn.isLoading) {
			setIsProUser(
				autumn.customer?.products.some(
					(product) => product.id === "consumer_pro",
				) ?? false,
			)
		}
	}, [autumn.isLoading, autumn.customer])

	const { data: connectionsCheck } = fetchConnectionsFeature(autumn)
	const connectionsUsed = connectionsCheck?.balance ?? 0
	const connectionsLimit = connectionsCheck?.included_usage ?? 0

	const canAddConnection = connectionsUsed < connectionsLimit

	const {
		data: connections = [],
		isLoading: connectionsLoading,
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
		refetchInterval: 60 * 1000,
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
		onSuccess: (data, provider) => {
			analytics.connectionAdded(provider)
			analytics.connectionAuthStarted()
			if (data?.authLink) {
				window.location.href = data.authLink
			}
		},
		onError: (error, provider) => {
			analytics.connectionAuthFailed()
			toast.error(`Failed to connect ${provider}`, {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const deleteConnectionMutation = useMutation({
		mutationFn: async (connectionId: string) => {
			await $fetch(`@delete/connections/${connectionId}`)
		},
		onSuccess: () => {
			analytics.connectionDeleted()
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

	const createApiKeyMutation = useMutation({
		mutationFn: async () => {
			const res = await authClient.apiKey.create({
				metadata: {
					organizationId: org?.id,
					type: "ios-shortcut",
				},
				name: `ios-${generateId().slice(0, 8)}`,
				prefix: `sm_${org?.id}_`,
			})
			return res.key
		},
		onSuccess: (apiKey) => {
			setApiKey(apiKey)
			setShowApiKeyModal(true)
			setCopied(false)
			handleCopyApiKey()
		},
		onError: (error) => {
			toast.error("Failed to create API key", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const handleShortcutClick = (shortcutType: "add" | "search") => {
		setSelectedShortcutType(shortcutType)
		createApiKeyMutation.mutate()
	}

	const handleCopyApiKey = async () => {
		try {
			await navigator.clipboard.writeText(apiKey)
			setCopied(true)
			toast.success("API key copied to clipboard!")
			setTimeout(() => setCopied(false), 2000)
		} catch {
			toast.error("Failed to copy API key")
		}
	}

	const handleOpenShortcut = () => {
		if (!selectedShortcutType) {
			toast.error("No shortcut type selected")
			return
		}

		if (selectedShortcutType === "add") {
			window.open(ADD_MEMORY_SHORTCUT_URL, "_blank")
		} else if (selectedShortcutType === "search") {
			window.open(SEARCH_MEMORY_SHORTCUT_URL, "_blank")
		}
	}

	const handleDialogClose = (open: boolean) => {
		setShowApiKeyModal(open)
		if (!open) {
			// Reset state when dialog closes
			setSelectedShortcutType(null)
			setApiKey("")
			setCopied(false)
		}
	}

	return (
		<div className="space-y-4 sm:space-y-4 custom-scrollbar">
			{/* iOS Shortcuts */}
			<div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
				<div className="p-4 sm:p-5">
					<div className="flex items-start gap-3 mb-3">
						<div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
							<Smartphone className="h-5 w-5 text-blue-400" />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="text-white font-semibold text-base mb-1">
								Apple shortcuts
							</h3>
							<p className="text-white/70 text-sm leading-relaxed">
								Add memories directly from iPhone, iPad or Mac.
							</p>
						</div>
					</div>
					<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
						<Button
							variant="ghost"
							className="flex-1 text-white hover:bg-blue-500/10 bg-[#171F59]/75 "
							onClick={() => handleShortcutClick("add")}
							disabled={createApiKeyMutation.isPending}
						>
							<Image
								src="/images/ios-shortcuts.png"
								alt="iOS Shortcuts"
								width={20}
								height={20}
							/>
							{createApiKeyMutation.isPending
								? "Creating..."
								: "Add Memory Shortcut"}
						</Button>
						<Button
							variant="ghost"
							className="flex-1 text-white  hover:bg-blue-500/10 bg-[#171F59]/75"
							onClick={() => handleShortcutClick("search")}
							disabled={createApiKeyMutation.isPending}
						>
							<Image
								src="/images/ios-shortcuts.png"
								alt="iOS Shortcuts"
								width={20}
								height={20}
							/>
							{createApiKeyMutation.isPending
								? "Creating..."
								: "Search Memory Shortcut"}
						</Button>
					</div>
				</div>
			</div>

			{/* Chrome Extension */}
			<div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden opacity-75">
				<div className="p-4 sm:p-5">
					<div className="flex items-start gap-3">
						<div className="p-2 bg-orange-500/20 rounded-lg flex-shrink-0">
							<ChromeIcon className="h-5 w-5 text-orange-400" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
								<h3 className="text-white font-semibold text-base">
									Chrome Extension
								</h3>
								<div className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full flex-shrink-0 w-fit">
									Coming Soon
								</div>
							</div>
							<p className="text-white/70 text-sm leading-relaxed">
								Save web content with one click
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Connections Section */}
			<div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
				<div className="p-4 sm:p-5">
					<div className="flex items-start gap-3 mb-3">
						<div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0">
							<svg
								className="h-5 w-5 text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Connection Link Icon</title>
								<path
									d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="text-white font-semibold text-base mb-1">
								Connections
							</h3>
							<p className="text-white/70 text-sm leading-relaxed mb-2">
								Connect your accounts to sync document.
							</p>
							{!isProUser && (
								<p className="text-xs text-white/50">
									Connections require a Pro subscription
								</p>
							)}
						</div>
					</div>

					{/* Show upgrade prompt for free users */}
					{!autumn.isLoading && !isProUser && (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-3"
							initial={{ opacity: 0, y: -10 }}
						>
							<p className="text-sm text-yellow-400 mb-2">
								🔌 Connections are a Pro feature
							</p>
							<p className="text-xs text-white/60 mb-3">
								Connect Google Drive, Notion, OneDrive and more to automatically
								sync your documents.
							</p>
							<Button
								className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30 w-full sm:w-auto"
								onClick={handleUpgrade}
								size="sm"
								variant="secondary"
							>
								Upgrade to Pro
							</Button>
						</motion.div>
					)}

					{/* All Connections with Status */}
					{connectionsLoading ? (
						<div className="space-y-2">
							{Object.keys(CONNECTORS).map((_, i) => (
								<motion.div
									animate={{ opacity: 1 }}
									className="p-3 bg-white/5 rounded-lg"
									initial={{ opacity: 0 }}
									key={`skeleton-${Date.now()}-${i}`}
									transition={{ delay: i * 0.1 }}
								>
									<Skeleton className="h-12 w-full bg-white/10" />
								</motion.div>
							))}
						</div>
					) : (
						<div className="space-y-2">
							{Object.entries(CONNECTORS).map(([provider, config], index) => {
								const Icon = config.icon
								const connection = connections.find(
									(conn) => conn.provider === provider,
								)
								const isConnected = !!connection

								return (
									<motion.div
										animate={{ opacity: 1, y: 0 }}
										className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
										initial={{ opacity: 0, y: 20 }}
										key={provider}
										transition={{ delay: index * 0.05 }}
									>
										<div className="flex items-center gap-3 flex-1">
											<motion.div
												animate={{ rotate: 0, opacity: 1 }}
												className="flex-shrink-0"
												initial={{ rotate: -180, opacity: 0 }}
												transition={{ delay: index * 0.05 + 0.2 }}
											>
												<Icon className="h-8 w-8" />
											</motion.div>
											<div className="flex-1 min-w-0">
												<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
													<p className="font-medium text-white text-sm">
														{config.title}
													</p>
													{isConnected ? (
														<div className="flex items-center gap-1">
															<div className="w-2 h-2 bg-green-400 rounded-full" />
															<span className="text-xs text-green-400 font-medium">
																Connected
															</span>
														</div>
													) : (
														<div className="hidden sm:flex items-center gap-1">
															<div className="w-2 h-2 bg-gray-400 rounded-full" />
															<span className="text-xs text-gray-400 font-medium">
																Disconnected
															</span>
														</div>
													)}
												</div>
												<p className="text-xs text-white/60 mt-0.5">
													{config.description}
												</p>
												{connection?.email && (
													<p className="text-xs text-white/50 mt-1">
														{connection.email}
													</p>
												)}
											</div>
										</div>

										<div className="flex items-center justify-end gap-2 sm:flex-shrink-0">
											{isConnected ? (
												<motion.div
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.95 }}
												>
													<Button
														className="text-white/70 hover:text-red-400 hover:bg-red-500/10 w-full sm:w-auto"
														disabled={deleteConnectionMutation.isPending}
														onClick={() =>
															deleteConnectionMutation.mutate(connection.id)
														}
														size="sm"
														variant="ghost"
													>
														<Trash2 className="h-4 w-4 sm:mr-2" />
														<span className="hidden sm:inline">Disconnect</span>
													</Button>
												</motion.div>
											) : (
												<div className="flex items-center justify-between gap-2 w-full sm:w-auto">
													<div className="sm:hidden flex items-center gap-1">
														<div className="w-2 h-2 bg-gray-400 rounded-full" />
														<span className="text-xs text-gray-400 font-medium">
															Disconnected
														</span>
													</div>
													<motion.div
														whileHover={{ scale: 1.02 }}
														whileTap={{ scale: 0.98 }}
														className="flex-shrink-0"
													>
														<Button
															className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-600/30 min-w-[80px] disabled:cursor-not-allowed"
															disabled={
																addConnectionMutation.isPending || !isProUser
															}
															onClick={() => {
																addConnectionMutation.mutate(
																	provider as ConnectorProvider,
																)
															}}
															size="sm"
															variant="outline"
														>
															{addConnectionMutation.isPending &&
															addConnectionMutation.variables === provider
																? "Connecting..."
																: "Connect"}
														</Button>
													</motion.div>
												</div>
											)}
										</div>
									</motion.div>
								)
							})}
						</div>
					)}
				</div>
			</div>

			<div className="p-3">
				<p className="text-white/70 text-sm leading-relaxed text-center">
					More integrations are coming soon! Have a suggestion? Share it with us
					on{" "}
					<a
						href="https://x.com/supermemoryai"
						target="_blank"
						rel="noopener noreferrer"
						className="text-orange-500 hover:text-orange-400 underline"
					>
						X
					</a>
					.
				</p>
			</div>

			{/* API Key Modal */}
			<Dialog open={showApiKeyModal} onOpenChange={handleDialogClose}>
				<DialogPortal>
					<DialogContent className="bg-[#0f1419] border-white/10 text-white md:max-w-md z-[100]">
						<DialogHeader>
							<DialogTitle className="text-white text-lg font-semibold">
								Setup{" "}
								{selectedShortcutType === "add"
									? "Add Memory"
									: selectedShortcutType === "search"
										? "Search Memory"
										: "iOS"}{" "}
								Shortcut
							</DialogTitle>
						</DialogHeader>

						<div className="space-y-4">
							{/* API Key Section */}
							<div className="space-y-2">
								<label
									htmlFor={apiKeyId}
									className="text-sm font-medium text-white/80"
								>
									Your API Key
								</label>
								<div className="flex items-center gap-2">
									<input
										id={apiKeyId}
										type="text"
										value={apiKey}
										readOnly
										className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white font-mono"
									/>
									<Button
										size="sm"
										variant="ghost"
										onClick={handleCopyApiKey}
										className="text-white/70 hover:text-white hover:bg-white/10"
									>
										{copied ? (
											<Check className="h-4 w-4 text-green-400" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>

							{/* Steps */}
							<div className="space-y-3">
								<h4 className="text-sm font-medium text-white/80">
									Follow these steps:
								</h4>
								<div className="space-y-2">
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
											1
										</div>
										<p className="text-sm text-white/70">
											Click "Add to Shortcuts" below to open the shortcut
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
											2
										</div>
										<p className="text-sm text-white/70">
											Paste your API key when prompted
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
											3
										</div>
										<p className="text-sm text-white/70">
											Start using your shortcut!
										</p>
									</div>
								</div>
							</div>

							<div className="flex gap-2 pt-2">
								<Button
									onClick={handleOpenShortcut}
									className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
									disabled={!selectedShortcutType}
								>
									<Image
										src="/images/ios-shortcuts.png"
										alt="iOS Shortcuts"
										width={16}
										height={16}
										className="mr-2"
									/>
									Add to Shortcuts
								</Button>
							</div>
						</div>
					</DialogContent>
				</DialogPortal>
			</Dialog>
		</div>
	)
}
