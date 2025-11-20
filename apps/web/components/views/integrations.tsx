import { $fetch } from "@lib/api"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { generateId } from "@lib/generate-id"
import {
	ADD_MEMORY_SHORTCUT_URL,
	RAYCAST_EXTENSION_URL,
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { Input } from "@repo/ui/components/input"
import { Skeleton } from "@repo/ui/components/skeleton"
import type { ConnectionResponseSchema } from "@repo/validation/api"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import { useCustomer } from "autumn-js/react"
import {
	Check,
	ChevronDown,
	Copy,
	DownloadIcon,
	FolderIcon,
	KeyIcon,
	Loader,
	Plus,
	Smartphone,
	Trash2,
} from "lucide-react"
import { motion } from "motion/react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { startTransition, useEffect, useId, useMemo, useState } from "react"
import { toast } from "sonner"
import type { z } from "zod"
import { analytics } from "@/lib/analytics"
import { useProject } from "@/stores"

type Connection = z.infer<typeof ConnectionResponseSchema>

interface Project {
	id: string
	name: string
	containerTag: string
	createdAt: string
	updatedAt: string
	isExperimental?: boolean
}

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
	"more-coming": {
		title: "More Coming Soon",
		description: "Additional integrations are in development",
		icon: () => (
			<svg
				className="h-6 w-6"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<title>More Coming Soon Icon</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M12 6v6m0 0v6m0-6h6m-6 0H6"
				/>
			</svg>
		),
	},
} as const

type ConnectorProvider = keyof typeof CONNECTORS

const COMING_SOON_CONNECTOR = "more-coming" as const

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

const getRelativeTime = (timestamp: number): string => {
	const now = Date.now()
	const diff = now - timestamp
	const minutes = Math.floor(diff / (1000 * 60))
	const hours = Math.floor(diff / (1000 * 60 * 60))
	const days = Math.floor(diff / (1000 * 60 * 60 * 24))

	if (minutes < 1) return "Just now"
	if (minutes < 60) return `${minutes}m ago`
	if (hours < 24) return `${hours}h ago`
	if (days < 7) return `${days}d ago`
	return new Date(timestamp).toLocaleDateString()
}

export function IntegrationsView() {
	const { org } = useAuth()
	const queryClient = useQueryClient()
	const { selectedProject } = useProject()
	const autumn = useCustomer()
	const searchParams = useSearchParams()
	const [showApiKeyModal, setShowApiKeyModal] = useState(false)
	const [apiKey, setApiKey] = useState<string>("")
	const [copied, setCopied] = useState(false)
	const [isProUser, setIsProUser] = useState(false)
	const [selectedShortcutType, setSelectedShortcutType] = useState<
		"add" | "search" | null
	>(null)
	const [showRaycastApiKeyModal, setShowRaycastApiKeyModal] = useState(false)
	const [raycastApiKey, setRaycastApiKey] = useState<string>("")
	const [raycastCopied, setRaycastCopied] = useState(false)
	const [hasTriggeredRaycast, setHasTriggeredRaycast] = useState(false)
	const [selectedProjectForConnection, setSelectedProjectForConnection] =
		useState<Record<string, string>>({})
	const [showCreateProjectForm, setShowCreateProjectForm] = useState(false)
	const [newProjectName, setNewProjectName] = useState("")
	const [creatingProjectForConnector, setCreatingProjectForConnector] =
		useState<string | null>(null)
	const [connectingProvider, setConnectingProvider] = useState<string | null>(
		null,
	)
	const apiKeyId = useId()
	const raycastApiKeyId = useId()

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

	const { data: connectionsCheck } = fetchConnectionsFeature(
		autumn,
		!autumn.isLoading,
	)
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
		refetchIntervalInBackground: true,
	})

	const { data: projects = [] } = useQuery({
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

	useEffect(() => {
		if (selectedProject) {
			setSelectedProjectForConnection((prev) => {
				const updatedProjects = { ...prev }
				let hasChanges = false

				Object.keys(CONNECTORS).forEach((provider) => {
					if (!updatedProjects[provider]) {
						updatedProjects[provider] = selectedProject
						hasChanges = true
					}
				})

				return hasChanges ? updatedProjects : prev
			})
		}
	}, [selectedProject])

	const addConnectionMutation = useMutation({
		mutationFn: async (provider: ConnectorProvider) => {
			if (provider === COMING_SOON_CONNECTOR) {
				throw new Error("This integration is coming soon!")
			}

			if (provider === "google-drive") {
				throw new Error(
					"Google Drive connections are temporarily disabled. This will be resolved soon.",
				)
			}

			if (!canAddConnection && !isProUser) {
				throw new Error(
					"Free plan doesn't include connections. Upgrade to Pro for unlimited connections.",
				)
			}

			const projectToUse =
				selectedProjectForConnection[provider] || selectedProject

			const response = await $fetch("@post/connections/:provider", {
				params: { provider },
				body: {
					redirectUrl: window.location.href,
					containerTags: [projectToUse],
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
				setConnectingProvider(provider)
				window.location.href = data.authLink
			} else {
				setConnectingProvider(null)
			}
		},
		onError: (error, provider) => {
			analytics.connectionAuthFailed()
			setConnectingProvider(null)
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

	const createProjectMutation = useMutation({
		mutationFn: async (name: string) => {
			const response = await $fetch("@post/projects", {
				body: { name },
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to create project")
			}

			return response.data
		},
		onSuccess: (newProject) => {
			toast.success("Project created successfully!")
			startTransition(() => {
				setNewProjectName("")
				setShowCreateProjectForm(false)
				if (newProject?.containerTag && creatingProjectForConnector) {
					setSelectedProjectForConnection((prev) => ({
						...prev,
						[creatingProjectForConnector]: newProject.containerTag,
					}))
				}
				setCreatingProjectForConnector(null)
			})
			queryClient.invalidateQueries({ queryKey: ["projects"] })
		},
		onError: (error) => {
			toast.error("Failed to create project", {
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
			handleCopyApiKey(apiKey)
		},
		onError: (error) => {
			toast.error("Failed to create API key", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const createRaycastApiKeyMutation = useMutation({
		mutationFn: async () => {
			if (!org?.id) {
				throw new Error("Organization ID is required")
			}

			const res = await authClient.apiKey.create({
				metadata: {
					organizationId: org?.id,
					type: "raycast-extension",
				},
				name: `raycast-${generateId().slice(0, 8)}`,
				prefix: `sm_${org?.id}_`,
			})
			return res.key
		},
		onSuccess: (apiKey) => {
			setRaycastApiKey(apiKey)
			setShowRaycastApiKeyModal(true)
			setRaycastCopied(false)
			handleCopyApiKey(apiKey)
		},
		onError: (error) => {
			toast.error("Failed to create Raycast API key", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	useEffect(() => {
		const qParam = searchParams.get("q")
		if (
			qParam === "raycast" &&
			!hasTriggeredRaycast &&
			!createRaycastApiKeyMutation.isPending &&
			org?.id
		) {
			setHasTriggeredRaycast(true)
			createRaycastApiKeyMutation.mutate()
		}
	}, [searchParams, hasTriggeredRaycast, createRaycastApiKeyMutation, org])

	const handleShortcutClick = (shortcutType: "add" | "search") => {
		setSelectedShortcutType(shortcutType)
		createApiKeyMutation.mutate()
	}

	const handleCopyApiKey = async (apiKey: string) => {
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

	const handleRaycastDialogClose = (open: boolean) => {
		setShowRaycastApiKeyModal(open)
		if (!open) {
			setRaycastApiKey("")
			setRaycastCopied(false)
		}
	}

	const handleRaycastClick = () => {
		createRaycastApiKeyMutation.mutate()
	}

	const validateProjectName = (name: string): string | null => {
		const trimmed = name.trim()
		if (!trimmed) {
			return "Project name is required"
		}
		if (trimmed.length < 2) {
			return "Project name must be at least 2 characters"
		}
		if (trimmed.length > 50) {
			return "Project name must be less than 50 characters"
		}
		// Allow alphanumeric, spaces, hyphens, and underscores
		if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
			return "Project name can only contain letters, numbers, spaces, hyphens, and underscores"
		}
		return null
	}

	const handleCreateProject = () => {
		const validationError = validateProjectName(newProjectName)
		if (validationError) {
			toast.error(validationError)
			return
		}
		createProjectMutation.mutate(newProjectName.trim())
	}

	const handleCreateProjectCancel = () => {
		setShowCreateProjectForm(false)
		setNewProjectName("")
		setCreatingProjectForConnector(null)
	}

	const getProjectName = (containerTag: string) => {
		if (containerTag === selectedProject) {
			return "Default Project"
		}
		const project = projects.find(
			(p: Project) => p.containerTag === containerTag,
		)
		return project?.name || "Unknown Project"
	}

	const updateProjectForConnector = (provider: string, projectTag: string) => {
		setSelectedProjectForConnection((prev) => ({
			...prev,
			[provider]: projectTag,
		}))
	}

	const filteredProjects = useMemo(
		() =>
			projects.filter(
				(project: Project) =>
					project.containerTag !== selectedProject &&
					project.name !== "Default Project",
			),
		[projects, selectedProject],
	)

	return (
		<div className="space-y-4 sm:space-y-4 custom-scrollbar">
			{/* iOS Shortcuts */}
			<div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
				<div className="p-4 sm:p-5">
					<div className="flex items-start gap-3 mb-3">
						<div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
							<Smartphone className="h-5 w-5 text-primary" />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="text-card-foreground font-semibold text-base mb-1">
								Apple shortcuts
							</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								Add memories directly from iPhone, iPad or Mac.
							</p>
						</div>
					</div>
					<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
						<Button
							variant="secondary"
							className="flex-1"
							onClick={() => handleShortcutClick("add")}
							disabled={createApiKeyMutation.isPending}
						>
							<Image
								src="/images/ios-shortcuts.png"
								alt="iOS Shortcuts"
								width={20}
								height={20}
							/>
							<motion.div
								key={createApiKeyMutation.isPending ? "loading" : "add"}
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								transition={{ duration: 0.2, ease: "easeInOut" }}
								className="flex items-center gap-2"
							>
								{createApiKeyMutation.isPending ? (
									<>
										<Loader className="h-4 w-4 animate-spin" />
										Creating...
									</>
								) : (
									"Add Memory Shortcut"
								)}
							</motion.div>
						</Button>
						<Button
							variant="secondary"
							className="flex-1"
							onClick={() => handleShortcutClick("search")}
							disabled={createApiKeyMutation.isPending}
						>
							<Image
								src="/images/ios-shortcuts.png"
								alt="iOS Shortcuts"
								width={20}
								height={20}
							/>
							<motion.div
								key={createApiKeyMutation.isPending ? "loading" : "search"}
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								transition={{ duration: 0.2, ease: "easeInOut" }}
								className="flex items-center gap-2"
							>
								{createApiKeyMutation.isPending ? (
									<>
										<Loader className="h-4 w-4 animate-spin" />
										Creating...
									</>
								) : (
									"Search Memory Shortcut"
								)}
							</motion.div>
						</Button>
					</div>
				</div>
			</div>

			{/* Raycast Extension */}
			<div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
				<div className="p-4 sm:p-5">
					<div className="flex items-start gap-3 mb-3">
						<div className="p-2 bg-purple-500/10 rounded-lg flex-shrink-0">
							<svg
								width="24"
								height="24"
								viewBox="0 0 28 28"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<title>Raycast Icon</title>
								<path
									fill-rule="evenodd"
									clip-rule="evenodd"
									d="M7 18.079V21L0 14L1.46 12.54L7 18.081V18.079ZM9.921 21H7L14 28L15.46 26.54L9.921 21ZM26.535 15.462L27.996 14L13.996 0L12.538 1.466L18.077 7.004H14.73L10.864 3.146L9.404 4.606L11.809 7.01H10.129V17.876H20.994V16.196L23.399 18.6L24.859 17.14L20.994 13.274V9.927L26.535 15.462ZM7.73 6.276L6.265 7.738L7.833 9.304L9.294 7.844L7.73 6.276ZM20.162 18.708L18.702 20.17L20.268 21.738L21.73 20.276L20.162 18.708ZM4.596 9.41L3.134 10.872L7 14.738V11.815L4.596 9.41ZM16.192 21.006H13.268L17.134 24.872L18.596 23.41L16.192 21.006Z"
									fill="#FF6363"
								/>
							</svg>
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="text-card-foreground font-semibold text-base mb-1">
								Raycast Extension
							</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								Add and search memories directly from Raycast on Mac and
								Windows.
							</p>
						</div>
					</div>
					<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
						<Button
							variant="secondary"
							className="flex-1"
							onClick={handleRaycastClick}
							disabled={createRaycastApiKeyMutation.isPending}
						>
							<KeyIcon className="h-4 w-4" />
							<motion.div
								key={
									createRaycastApiKeyMutation.isPending ? "loading" : "raycast"
								}
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								transition={{ duration: 0.2, ease: "easeInOut" }}
								className="flex items-center gap-2"
							>
								{createRaycastApiKeyMutation.isPending ? (
									<>
										<Loader className="h-4 w-4 animate-spin" />
										Generating...
									</>
								) : (
									"Get API Key"
								)}
							</motion.div>
						</Button>
						<Button
							variant="secondary"
							className="flex-1"
							onClick={() => {
								window.open(RAYCAST_EXTENSION_URL, "_blank")
								analytics.extensionInstallClicked()
							}}
						>
							<DownloadIcon className="h-4 w-4" />
							Install Extension
						</Button>
					</div>
				</div>
			</div>

			{/* Chrome Extension */}
			<div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
				<div className="p-4 sm:p-5">
					<div className="flex items-start gap-3">
						<div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
							<ChromeIcon className="h-5 w-5 text-primary" />
						</div>
						<div className="flex-1 min-w-0 mb-3">
							<div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-1">
								<h3 className="text-card-foreground font-semibold text-base">
									Chrome Extension
								</h3>
								<Button
									className="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-fit"
									onClick={() => {
										window.open(
											"https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc",
											"_blank",
											"noopener,noreferrer",
										)
										analytics.extensionInstallClicked()
									}}
									size="sm"
									variant="ghost"
								>
									<ChromeIcon className="h-3 w-3 mr-1" />
									Add to Chrome
								</Button>
							</div>
						</div>
					</div>
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
							<p className="text-muted-foreground text-sm">
								Save any webpage to supermemory
							</p>
						</div>
						<div className="flex items-center gap-3">
							<div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
							<p className="text-muted-foreground text-sm">
								Import All your Twitter Bookmarks
							</p>
						</div>
						<div className="flex items-center gap-3">
							<div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
							<p className="text-muted-foreground text-sm">
								Bring all your chatGPT memories to Supermemory
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Connections Section */}
			<div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
				<div className="p-4 sm:p-5">
					<div className="flex items-start gap-3 mb-3">
						<div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
							<svg
								className="h-5 w-5 text-primary"
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
							<h3 className="text-card-foreground font-semibold text-base mb-1">
								Connections
							</h3>
							<p className="text-muted-foreground text-sm leading-relaxed mb-2">
								Connect your accounts to sync document.
							</p>
							{!isProUser && (
								<p className="text-xs text-muted-foreground/70">
									Connections require a Pro subscription
								</p>
							)}
						</div>
					</div>

					{/* Show upgrade prompt for free users */}
					{!autumn.isLoading && !isProUser && (
						<div className="p-4 bg-accent border border-border rounded-lg mb-3">
							<p className="text-sm text-accent-foreground mb-2 font-medium">
								🔌 Connections are a Pro feature
							</p>
							<p className="text-xs text-muted-foreground mb-3">
								Connect Google Drive, Notion, OneDrive and more to automatically
								sync your documents.
							</p>
							<Button
								className="w-full sm:w-auto"
								onClick={handleUpgrade}
								size="sm"
								variant="default"
							>
								Upgrade to Pro
							</Button>
						</div>
					)}

					{/* All Connections with Status */}
					{connectionsLoading ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{Object.keys(CONNECTORS).map((_, _i) => (
								<div
									className="p-4 bg-accent rounded-lg border border-border/50"
									key={`skeleton-${Date.now()}-${_i}`}
								>
									<Skeleton className="h-32 w-full bg-muted rounded-lg" />
								</div>
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{Object.entries(CONNECTORS).map(([provider, config]) => {
								const Icon = config.icon
								const connection = connections.find(
									(conn) => conn.provider === provider,
								)
								console.log(connection)
								const isConnected = !!connection
								const isMoreComing = provider === COMING_SOON_CONNECTOR

								return (
									<div
										className={`p-4 flex flex-col justify-between rounded-lg border border-border/50 transition-all duration-200 ${
											isMoreComing
												? "bg-muted/30 hover:bg-muted/50"
												: "bg-card hover:border-border hover:shadow-sm"
										}`}
										key={provider}
									>
										<div className="flex items-start justify-between mb-3">
											<div className="flex items-center gap-3">
												<div
													className={`p-2 rounded-lg ${
														isMoreComing ? "bg-muted" : "bg-accent"
													}`}
												>
													<Icon className="h-6 w-6" />
												</div>
												<div>
													<h3 className="font-semibold text-card-foreground text-sm">
														{config.title}
													</h3>
													{isMoreComing ? (
														<div className="flex items-center gap-1 mt-1">
															<div className="w-2 h-2 bg-muted-foreground rounded-full" />
															<span className="text-xs text-muted-foreground font-medium">
																Coming Soon
															</span>
														</div>
													) : isConnected ? (
														<div className="flex items-center gap-1 mt-1">
															{connection.metadata?.syncInProgress ? (
																<>
																	<Loader className="h-3 w-3 animate-spin text-primary" />
																	<span className="text-xs text-primary font-medium">
																		Syncing...
																	</span>
																</>
															) : (
																<div className="flex items-center gap-1">
																	<div className="w-2 h-2 bg-chart-2 rounded-full" />
																	<span className="text-xs text-chart-2 font-medium">
																		Connected
																	</span>
																</div>
															)}
														</div>
													) : provider === "google-drive" ? (
														<div className="flex items-center gap-1 mt-1">
															<div className="w-2 h-2 bg-muted-foreground rounded-full" />
															<span className="text-xs text-muted-foreground font-medium">
																Temporarily Disabled
															</span>
														</div>
													) : (
														<div className="flex items-center gap-1 mt-1">
															<div className="w-2 h-2 bg-muted-foreground rounded-full" />
															<span className="text-xs text-muted-foreground font-medium">
																Disconnected
															</span>
														</div>
													)}
												</div>
											</div>
											{isConnected && !isMoreComing && (
												<Button
													className="text-destructive hover:bg-destructive/10"
													disabled={deleteConnectionMutation.isPending}
													onClick={() =>
														deleteConnectionMutation.mutate(connection.id)
													}
													size="sm"
													variant="ghost"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>

										<p className="text-xs text-muted-foreground mb-3 leading-relaxed">
											{config.description}
										</p>

										{!isConnected &&
											!isMoreComing &&
											provider === "google-drive" && (
												<p className="text-xs text-muted-foreground/80 mb-3 leading-relaxed">
													Google Drive connections are temporarily disabled.
													This will be resolved soon.
												</p>
											)}

										{isConnected && !isMoreComing && (
											<div className="space-y-1">
												{connection?.email && (
													<p className="text-xs text-muted-foreground/70">
														Email: {connection.email}
													</p>
												)}
												{connection?.metadata?.lastSyncedAt && (
													<p
														className="text-xs text-muted-foreground/70 cursor-help"
														title={`Last synced at ${new Date(connection.metadata.lastSyncedAt).toLocaleString()}`}
													>
														Last synced:{" "}
														{getRelativeTime(connection.metadata.lastSyncedAt)}
													</p>
												)}
											</div>
										)}

										{!isConnected && !isMoreComing && (
											<div className="flex items-center gap-2">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="outline"
															size="sm"
															className="flex-1 flex items-center gap-2 justify-between min-w-0"
														>
															<div className="flex items-center gap-2 min-w-0">
																<FolderIcon className="h-4 w-4 flex-shrink-0" />
																<span className="truncate">
																	{getProjectName(
																		selectedProjectForConnection[provider] ||
																			selectedProject,
																	)}
																</span>
															</div>
															<ChevronDown className="h-3 w-3 flex-shrink-0" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end" className="w-56">
														<DropdownMenuItem
															onClick={() =>
																updateProjectForConnector(
																	provider,
																	selectedProject,
																)
															}
															className="flex items-center gap-2"
														>
															<FolderIcon className="h-4 w-4 text-primary" />
															<span>Default Project</span>
															{(selectedProjectForConnection[provider] ||
																selectedProject) === selectedProject && (
																<Check className="h-4 w-4 ml-auto" />
															)}
														</DropdownMenuItem>

														{filteredProjects.length > 0 ? (
															filteredProjects.map((project: Project) => (
																<DropdownMenuItem
																	key={project.id}
																	onClick={() =>
																		updateProjectForConnector(
																			provider,
																			project.containerTag,
																		)
																	}
																	className="flex items-center gap-2"
																>
																	<FolderIcon className="h-4 w-4 text-muted-foreground" />
																	<span className="truncate">
																		{project.name}
																	</span>
																	{(selectedProjectForConnection[provider] ||
																		selectedProject) ===
																		project.containerTag && (
																		<Check className="h-4 w-4 ml-auto" />
																	)}
																</DropdownMenuItem>
															))
														) : (
															<DropdownMenuItem
																disabled
																className="text-muted-foreground"
															>
																No additional projects available
															</DropdownMenuItem>
														)}

														<DropdownMenuItem
															onClick={() => {
																setCreatingProjectForConnector(provider)
																setShowCreateProjectForm(true)
															}}
															className="flex items-center gap-2 text-muted-foreground"
														>
															<Plus className="h-4 w-4" />
															<span>Create New Project</span>
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>

												<Button
													className="flex-shrink-0 disabled:cursor-not-allowed w-20 justify-center"
													disabled={
														provider === "google-drive" ||
														addConnectionMutation.isPending ||
														connectingProvider === provider ||
														!isProUser
													}
													onClick={() => {
														addConnectionMutation.mutate(
															provider as ConnectorProvider,
														)
													}}
													size="sm"
													variant="default"
												>
													<motion.div
														key={
															(addConnectionMutation.isPending &&
																addConnectionMutation.variables === provider) ||
															connectingProvider === provider
																? "loading"
																: "connect"
														}
														initial={{ opacity: 0, scale: 0.8 }}
														animate={{ opacity: 1, scale: 1 }}
														exit={{ opacity: 0, scale: 0.8 }}
														transition={{ duration: 0.2, ease: "easeInOut" }}
														className="flex items-center justify-center"
													>
														{(addConnectionMutation.isPending &&
															addConnectionMutation.variables === provider) ||
														connectingProvider === provider ? (
															<Loader className="h-4 w-4 animate-spin" />
														) : (
															"Connect"
														)}
													</motion.div>
												</Button>
											</div>
										)}

										{isMoreComing && (
											<div className="flex items-center justify-center">
												<Button
													variant="outline"
													size="sm"
													disabled
													className="text-muted-foreground"
												>
													Coming Soon
												</Button>
											</div>
										)}
									</div>
								)
							})}
						</div>
					)}
				</div>
			</div>

			<div className="p-3">
				<p className="text-muted-foreground text-sm leading-relaxed text-center">
					More integrations are coming soon! Have a suggestion? Share it with us
					on{" "}
					<a
						href="https://x.com/supermemoryai"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:text-primary/80 underline"
					>
						X
					</a>
					.
				</p>
			</div>

			{/* API Key Modal */}
			<Dialog open={showApiKeyModal} onOpenChange={handleDialogClose}>
				<DialogPortal>
					<DialogContent className="bg-card border-border text-card-foreground md:max-w-md z-[100]">
						<DialogHeader>
							<DialogTitle className="text-card-foreground text-lg font-semibold">
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
									className="text-sm font-medium text-muted-foreground"
								>
									Your API Key
								</label>
								<div className="flex items-center gap-2">
									<input
										id={apiKeyId}
										type="text"
										value={apiKey}
										readOnly
										className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
									/>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => handleCopyApiKey(apiKey)}
										className="text-white/70 hover:text-white hover:bg-white/10"
									>
										{copied ? (
											<Check className="h-4 w-4 text-chart-2" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>

							{/* Steps */}
							<div className="space-y-3">
								<h4 className="text-sm font-medium text-muted-foreground">
									Follow these steps:
								</h4>
								<div className="space-y-2">
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">
											1
										</div>
										<p className="text-sm text-muted-foreground">
											Click "Add to Shortcuts" below to open the shortcut
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">
											2
										</div>
										<p className="text-sm text-muted-foreground">
											Paste your API key when prompted
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">
											3
										</div>
										<p className="text-sm text-muted-foreground">
											Start using your shortcut!
										</p>
									</div>
								</div>
							</div>

							<div className="flex gap-2 pt-2">
								<Button
									onClick={handleOpenShortcut}
									className="flex-1"
									disabled={!selectedShortcutType}
									variant="default"
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

			<Dialog
				open={showRaycastApiKeyModal}
				onOpenChange={handleRaycastDialogClose}
			>
				<DialogPortal>
					<DialogContent className="bg-card border-border text-card-foreground md:max-w-md z-[100]">
						<DialogHeader>
							<DialogTitle className="text-card-foreground text-lg font-semibold">
								Setup Raycast Extension
							</DialogTitle>
						</DialogHeader>

						<div className="space-y-4">
							{/* API Key Section */}
							<div className="space-y-2">
								<label
									htmlFor={raycastApiKeyId}
									className="text-sm font-medium text-muted-foreground"
								>
									Your Raycast API Key
								</label>
								<div className="flex items-center gap-2">
									<input
										id={raycastApiKeyId}
										type="text"
										value={raycastApiKey}
										readOnly
										className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
									/>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => handleCopyApiKey(raycastApiKey)}
										className="text-muted-foreground hover:text-foreground hover:bg-accent"
									>
										{raycastCopied ? (
											<Check className="h-4 w-4 text-chart-2" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>

							{/* Steps */}
							<div className="space-y-3">
								<h4 className="text-sm font-medium text-muted-foreground">
									Follow these steps:
								</h4>
								<div className="space-y-2">
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-purple-500/20 text-purple-500 rounded-full flex items-center justify-center text-xs font-medium">
											1
										</div>
										<p className="text-sm text-muted-foreground">
											Install the Raycast extension from the Raycast Store
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-purple-500/20 text-purple-500 rounded-full flex items-center justify-center text-xs font-medium">
											2
										</div>
										<p className="text-sm text-muted-foreground">
											Open Raycast preferences and paste your API key
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-purple-500/20 text-purple-500 rounded-full flex items-center justify-center text-xs font-medium">
											3
										</div>
										<p className="text-sm text-muted-foreground">
											Use "Add Memory" or "Search Memories" commands!
										</p>
									</div>
								</div>
							</div>

							<div className="flex gap-2 pt-2">
								<Button
									onClick={() => {
										window.open(RAYCAST_EXTENSION_URL, "_blank")
										analytics.extensionInstallClicked()
									}}
									className="flex-1"
									variant="default"
								>
									<svg
										width="24"
										height="24"
										viewBox="0 0 28 28"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<title>Raycast Icon</title>
										<path
											fill-rule="evenodd"
											clip-rule="evenodd"
											d="M7 18.079V21L0 14L1.46 12.54L7 18.081V18.079ZM9.921 21H7L14 28L15.46 26.54L9.921 21ZM26.535 15.462L27.996 14L13.996 0L12.538 1.466L18.077 7.004H14.73L10.864 3.146L9.404 4.606L11.809 7.01H10.129V17.876H20.994V16.196L23.399 18.6L24.859 17.14L20.994 13.274V9.927L26.535 15.462ZM7.73 6.276L6.265 7.738L7.833 9.304L9.294 7.844L7.73 6.276ZM20.162 18.708L18.702 20.17L20.268 21.738L21.73 20.276L20.162 18.708ZM4.596 9.41L3.134 10.872L7 14.738V11.815L4.596 9.41ZM16.192 21.006H13.268L17.134 24.872L18.596 23.41L16.192 21.006Z"
											fill="#FF6363"
										/>
									</svg>
									Install Extension
								</Button>
							</div>
						</div>
					</DialogContent>
				</DialogPortal>
			</Dialog>

			<Dialog
				key="create-project-dialog"
				open={showCreateProjectForm}
				onOpenChange={(open) => {
					if (!open) {
						handleCreateProjectCancel()
					}
					setShowCreateProjectForm(open)
				}}
			>
				<DialogPortal>
					<DialogContent className="bg-card border-border text-card-foreground md:max-w-md z-[100]">
						<DialogHeader>
							<DialogTitle className="text-card-foreground text-lg font-semibold">
								Create New Project
							</DialogTitle>
						</DialogHeader>

						<div className="space-y-4">
							<div className="space-y-2">
								<label
									htmlFor="newProjectName"
									className="text-sm font-medium text-muted-foreground"
								>
									Project Name
								</label>
								<Input
									id="newProjectName"
									placeholder="Enter project name..."
									value={newProjectName}
									onChange={(e) => setNewProjectName(e.target.value)}
									onKeyDown={(e) => {
										if (
											e.key === "Enter" &&
											newProjectName.trim() &&
											!validateProjectName(newProjectName) &&
											!createProjectMutation.isPending
										) {
											handleCreateProject()
										}
									}}
									className="w-full"
									autoFocus
									disabled={createProjectMutation.isPending}
								/>
							</div>

							<div className="flex gap-2">
								<Button
									onClick={handleCreateProjectCancel}
									variant="outline"
									className="flex-1"
								>
									Cancel
								</Button>
								<Button
									onClick={handleCreateProject}
									disabled={
										!newProjectName.trim() ||
										createProjectMutation.isPending ||
										!!validateProjectName(newProjectName)
									}
									className="flex-1"
								>
									<motion.div
										key={createProjectMutation.isPending ? "loading" : "create"}
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={{ duration: 0.2, ease: "easeInOut" }}
										className="flex items-center gap-2"
									>
										{createProjectMutation.isPending ? (
											<>
												<Loader className="h-4 w-4 animate-spin" />
												Creating...
											</>
										) : (
											"Create"
										)}
									</motion.div>
								</Button>
							</div>
						</div>
					</DialogContent>
				</DialogPortal>
			</Dialog>
		</div>
	)
}
