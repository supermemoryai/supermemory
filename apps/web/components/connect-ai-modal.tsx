"use client"

import { $fetch } from "@lib/api"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { generateId } from "@lib/generate-id"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@ui/components/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@ui/components/dialog"
import { Input } from "@ui/components/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import { CopyableCell } from "@ui/copyable-cell"
import { CheckIcon, CopyIcon, ExternalLink, Loader2 } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { z } from "zod/v4"
import { analytics } from "@/lib/analytics"
import { cn } from "@lib/utils"
import { motion, AnimatePresence } from "framer-motion"

const clients = {
	cursor: "Cursor",
	claude: "Claude Desktop",
	vscode: "VSCode",
	cline: "Cline",
	"gemini-cli": "Gemini CLI",
	"claude-code": "Claude Code",
	"mcp-url": "MCP URL",
	"roo-cline": "Roo Cline",
	witsy: "Witsy",
	enconvo: "Enconvo",
} as const

const mcpMigrationSchema = z.object({
	url: z
		.string()
		.min(1, "MCP Link is required")
		.regex(
			/^https:\/\/mcp\.supermemory\.ai\/[^/]+\/sse$/,
			"Link must be in format: https://mcp.supermemory.ai/userId/sse",
		),
})

interface Project {
	id: string
	name: string
	containerTag: string
	createdAt: string
	updatedAt: string
	isExperimental?: boolean
}

interface ConnectAIModalProps {
	children: React.ReactNode
	open?: boolean
	onOpenChange?: (open: boolean) => void
	openInitialClient?: "mcp-url" | null
	openInitialTab?: "oneClick" | "manual" | null
}

interface ManualMCPHelpLinkProps {
	onClick: () => void
}

function ManualMCPHelpLink({ onClick }: ManualMCPHelpLinkProps) {
	const [isHovered, setIsHovered] = useState(false)

	return (
		<button
			className="text-xs text-muted-foreground hover:text-foreground hover:underline opacity-70 hover:opacity-100 transition-all relative overflow-hidden"
			onClick={onClick}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			type="button"
		>
			<AnimatePresence mode="wait">
				{!isHovered ? (
					<motion.span
						key="default"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
						className="inline-block"
					>
						Having trouble to connect?
					</motion.span>
				) : (
					<motion.span
						key="hover"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
						className="inline-block underline cursor-pointer"
					>
						Try Manual MCP config
					</motion.span>
				)}
			</AnimatePresence>
		</button>
	)
}

export function ConnectAIModal({
	children,
	open,
	onOpenChange,
	openInitialClient,
	openInitialTab,
}: ConnectAIModalProps) {
	const { org } = useAuth()
	const [selectedClient, setSelectedClient] = useState<
		keyof typeof clients | null
	>(openInitialClient || null)
	const [internalIsOpen, setInternalIsOpen] = useState(false)
	const isOpen = open !== undefined ? open : internalIsOpen
	const setIsOpen = onOpenChange || setInternalIsOpen
	const [isMigrateDialogOpen, setIsMigrateDialogOpen] = useState(false)
	const [selectedProject, setSelectedProject] = useState<string | null>("none")
	const [cursorInstallTab, setCursorInstallTab] = useState<
		"oneClick" | "manual"
	>("oneClick")
	const [mcpUrlTab, setMcpUrlTab] = useState<"oneClick" | "manual">(
		openInitialTab || "oneClick",
	)
	const [manualApiKey, setManualApiKey] = useState<string | null>(null)
	const [isCopied, setIsCopied] = useState(false)

	const [projectId, setProjectId] = useState("default")

	useEffect(() => {
		if (typeof window !== "undefined") {
			const storedProjectId =
				localStorage.getItem("selectedProject") ?? "default"
			setProjectId(storedProjectId)
		}
	}, [])

	useEffect(() => {
		analytics.mcpViewOpened()
	}, [])

	const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
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

	const mcpMigrationForm = useForm({
		defaultValues: { url: "" },
		onSubmit: async ({ value, formApi }) => {
			const userId = extractUserIdFromMCPUrl(value.url)
			if (userId) {
				migrateMCPMutation.mutate({ userId, projectId })
				formApi.reset()
			}
		},
		validators: {
			onChange: mcpMigrationSchema,
		},
	})

	const extractUserIdFromMCPUrl = (url: string): string | null => {
		const regex = /^https:\/\/mcp\.supermemory\.ai\/([^/]+)\/sse$/
		const match = url.trim().match(regex)
		return match?.[1] || null
	}

	const migrateMCPMutation = useMutation({
		mutationFn: async ({
			userId,
			projectId,
		}: {
			userId: string
			projectId: string
		}) => {
			const response = await $fetch("@post/documents/migrate-mcp", {
				body: { userId, projectId },
			})

			if (response.error) {
				throw new Error(
					response.error?.message || "Failed to migrate documents",
				)
			}

			return response.data
		},
		onSuccess: (data) => {
			toast.success("Migration completed!", {
				description: `Successfully migrated ${data?.migratedCount} documents`,
			})
			setIsMigrateDialogOpen(false)
		},
		onError: (error) => {
			toast.error("Migration failed", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const createMcpApiKeyMutation = useMutation({
		mutationFn: async () => {
			if (!org?.id) {
				throw new Error("Organization ID is required")
			}

			const res = await authClient.apiKey.create({
				metadata: {
					organizationId: org?.id,
					type: "mcp-manual",
				},
				name: `mcp-manual-${generateId().slice(0, 8)}`,
				prefix: `sm_${org?.id}_`,
			})
			return res.key
		},
		onSuccess: (apiKey) => {
			setManualApiKey(apiKey)
			toast.success("API key created successfully!")
		},
		onError: (error) => {
			toast.error("Failed to create API key", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	// biome-ignore lint/correctness/useExhaustiveDependencies(createMcpApiKeyMutation.mutate): we need to mutate the mutation
	useEffect(() => {
		if (openInitialClient) {
			setSelectedClient(openInitialClient as keyof typeof clients)
			if (openInitialTab) {
				setMcpUrlTab(openInitialTab)
				if (org?.id) {
					createMcpApiKeyMutation.mutate()
				}
			}
		}
	}, [openInitialClient, openInitialTab, org?.id])

	function generateInstallCommand() {
		if (!selectedClient) return ""

		let command = `npx -y install-mcp@latest https://api.supermemory.ai/mcp --client ${selectedClient} --oauth=yes`

		if (selectedProject && selectedProject !== "none") {
			// Remove the "sm_project_" prefix from the containerTag
			const projectIdForCommand = selectedProject.replace(/^sm_project_/, "")
			command += ` --project ${projectIdForCommand}`
		}

		return command
	}

	function getCursorDeeplink() {
		return "https://cursor.com/en/install-mcp?name=supermemory-mcp&config=eyJjb21tYW5kIjoibnB4IC15IG1jcC1yZW1vdGUgaHR0cHM6Ly9hcGkuc3VwZXJtZW1vcnkuYWkvbWNwIn0%3D"
	}

	const copyToClipboard = () => {
		const command = generateInstallCommand()
		navigator.clipboard.writeText(command)
		analytics.mcpInstallCmdCopied()
		toast.success("Copied to clipboard!")
	}

	return (
		<Dialog onOpenChange={setIsOpen} open={isOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-4xl">
				<DialogHeader>
					<DialogTitle>Connect supermemory to Your AI</DialogTitle>
					<DialogDescription>
						Enable your AI assistant to create, search, and access your memories
						directly using the Model Context Protocol (MCP).
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Step 1: Client Selection */}
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-accent text-accent-foreground">
								1
							</div>
							<h3 className="text-sm font-medium">Select Your AI Client</h3>
						</div>

						<div className="space-x-2 space-y-2">
							{Object.entries(clients)
								.slice(0, 7)
								.map(([key, clientName]) => (
									<button
										className={`pr-3 pl-1 rounded-full border cursor-pointer transition-all ${
											selectedClient === key
												? "border-primary bg-primary/10"
												: "border-border hover:border-border/60 hover:bg-muted/50"
										}`}
										key={key}
										onClick={() =>
											setSelectedClient(key as keyof typeof clients)
										}
										type="button"
									>
										<div className="flex items-center gap-1">
											<div className="w-8 h-8 flex items-center justify-center">
												<Image
													alt={clientName}
													className="rounded object-contain"
													height={20}
													onError={(e) => {
														const target = e.target as HTMLImageElement
														target.style.display = "none"
														const parent = target.parentElement
														if (
															parent &&
															!parent.querySelector(".fallback-text")
														) {
															const fallback = document.createElement("span")
															fallback.className =
																"fallback-text text-sm font-bold text-muted-foreground"
															fallback.textContent = clientName
																.substring(0, 2)
																.toUpperCase()
															parent.appendChild(fallback)
														}
													}}
													src={
														key === "mcp-url"
															? "/mcp-icon.svg"
															: `/mcp-supported-tools/${key === "claude-code" ? "claude" : key}.png`
													}
													width={20}
												/>
											</div>
											<span className="text-sm font-medium text-foreground/80">
												{clientName}
											</span>
										</div>
									</button>
								))}
						</div>
					</div>

					{/* Step 2: One-click Install for Cursor, Project Selection for others, or MCP URL */}
					{selectedClient && (
						<div className="space-y-4">
							<div className="flex justify-between">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold">
										2
									</div>
									<h3 className="text-sm font-medium">
										{selectedClient === "cursor"
											? "Install Supermemory MCP"
											: selectedClient === "mcp-url"
												? "MCP Server Configuration"
												: "Select Target Project (Optional)"}
									</h3>
								</div>

								<div className="flex items-center gap-3">
									{selectedClient && selectedClient !== "mcp-url" && (
										<ManualMCPHelpLink
											onClick={() => {
												setSelectedClient("mcp-url")
												setMcpUrlTab("manual")
												if (
													!manualApiKey &&
													!createMcpApiKeyMutation.isPending
												) {
													createMcpApiKeyMutation.mutate()
												}
											}}
										/>
									)}

									<div
										className={cn(
											"flex-col gap-2 hidden",
											(selectedClient === "cursor" ||
												selectedClient === "mcp-url") &&
												"flex",
										)}
									>
										{/* Tabs */}
										<div className="flex justify-end">
											<div className="flex bg-muted/50 rounded-full p-1 border border-border">
												<button
													className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
														(
															selectedClient === "cursor"
																? cursorInstallTab
																: mcpUrlTab
														) === "oneClick"
															? "bg-background text-foreground border border-border shadow-sm"
															: "text-muted-foreground hover:text-foreground"
													}`}
													onClick={() =>
														selectedClient === "cursor"
															? setCursorInstallTab("oneClick")
															: setMcpUrlTab("oneClick")
													}
													type="button"
												>
													{selectedClient === "mcp-url"
														? "Quick Setup"
														: "One Click Install"}
												</button>
												<button
													className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
														(
															selectedClient === "cursor"
																? cursorInstallTab
																: mcpUrlTab
														) === "manual"
															? "bg-background text-foreground border border-border shadow-sm"
															: "text-muted-foreground hover:text-foreground"
													}`}
													onClick={() => {
														if (selectedClient === "cursor") {
															setCursorInstallTab("manual")
														} else {
															setMcpUrlTab("manual")
															if (
																!manualApiKey &&
																!createMcpApiKeyMutation.isPending
															) {
																createMcpApiKeyMutation.mutate()
															}
														}
													}}
													type="button"
												>
													Manual Config
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>

							{selectedClient === "cursor" ? (
								<div className="space-y-4">
									{/* Tab Content */}
									{cursorInstallTab === "oneClick" ? (
										<div className="space-y-4">
											<div className="flex flex-col items-center gap-4 p-6 border border-green-500/20 rounded-lg bg-green-500/5">
												<div className="text-center">
													<p className="text-sm text-foreground/80 mb-2">
														Click the button below to automatically install and
														configure Supermemory in Cursor
													</p>
												</div>
												<a
													href={getCursorDeeplink()}
													onClick={() => {
														analytics.mcpInstallCmdCopied()
														toast.success("Opening Cursor installer...")
													}}
												>
													<img
														alt="Add Supermemory MCP server to Cursor"
														className="hover:opacity-80 transition-opacity cursor-pointer"
														height="40"
														src="https://cursor.com/deeplink/mcp-install-dark.svg"
													/>
												</a>
											</div>
										</div>
									) : (
										<div className="space-y-4">
											<p className="text-sm text-muted-foreground">
												Choose a project and follow the installation steps below
											</p>
											<div className="max-w-md">
												<Select
													disabled={isLoadingProjects}
													onValueChange={setSelectedProject}
													value={selectedProject || "none"}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select project" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="none">
															Auto-select project
														</SelectItem>
														<SelectItem value="sm_project_default">
															Default Project
														</SelectItem>
														{projects
															.filter(
																(p: Project) =>
																	p.containerTag !== "sm_project_default",
															)
															.map((project: Project) => (
																<SelectItem
																	key={project.id}
																	value={project.containerTag}
																>
																	{project.name}
																</SelectItem>
															))}
													</SelectContent>
												</Select>
											</div>
										</div>
									)}
								</div>
							) : selectedClient === "mcp-url" ? (
								<div className="space-y-4">
									{mcpUrlTab === "oneClick" ? (
										<div className="space-y-2">
											<p className="text-sm text-muted-foreground">
												Use this URL to quickly configure supermemory in your AI
												assistant
											</p>
											<div className="relative">
												<Input
													className="font-mono text-xs w-full pr-10"
													readOnly
													value="https://api.supermemory.ai/mcp"
												/>
												<Button
													className="absolute top-[-1px] right-0 cursor-pointer"
													onClick={() => {
														navigator.clipboard.writeText(
															"https://api.supermemory.ai/mcp",
														)
														analytics.mcpInstallCmdCopied()
														toast.success("Copied to clipboard!")
													}}
													variant="ghost"
												>
													<CopyIcon className="size-4" />
												</Button>
											</div>
										</div>
									) : (
										<div className="space-y-3">
											<p className="text-sm text-muted-foreground">
												Add this configuration to your MCP settings file with
												authentication
											</p>
											{createMcpApiKeyMutation.isPending ? (
												<div className="flex items-center justify-center p-8">
													<Loader2 className="h-6 w-6 animate-spin text-primary" />
												</div>
											) : (
												<>
													<div className="relative">
														<pre className="bg-muted border border-border rounded-lg p-4 pr-12 text-xs overflow-x-auto max-w-full">
															<code className="font-mono block whitespace-pre-wrap break-all">
																{`{
  "supermemory-mcp": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://api.supermemory.ai/mcp"],
    "env": {},
    "headers": {
      "Authorization": "Bearer ${manualApiKey || "your-api-key-here"}"
    }
  }
}`}
															</code>
														</pre>
														<Button
															className="absolute top-2 right-2 cursor-pointer h-8 w-8 p-0 bg-muted/80 hover:bg-muted"
															onClick={() => {
																const config = `{
  "supermemory-mcp": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://api.supermemory.ai/mcp"],
    "env": {},
    "headers": {
      "Authorization": "Bearer ${manualApiKey || "your-api-key-here"}"
    }
  }
}`
																navigator.clipboard.writeText(config)
																analytics.mcpInstallCmdCopied()
																toast.success("Copied to clipboard!")
																setIsCopied(true)
																setTimeout(() => setIsCopied(false), 2000)
															}}
															variant="ghost"
															size="icon"
														>
															{isCopied ? (
																<CheckIcon className="size-3.5 text-green-600" />
															) : (
																<CopyIcon className="size-3.5" />
															)}
														</Button>
													</div>
													<p className="text-xs text-muted-foreground">
														The API key is included as a Bearer token in the
														Authorization header
													</p>
												</>
											)}
										</div>
									)}
								</div>
							) : (
								<div className="max-w-md">
									<Select
										disabled={isLoadingProjects}
										onValueChange={setSelectedProject}
										value={selectedProject || "none"}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select project" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Auto-select project</SelectItem>
											<SelectItem value="sm_project_default">
												Default Project
											</SelectItem>
											{projects
												.filter(
													(p: Project) =>
														p.containerTag !== "sm_project_default",
												)
												.map((project: Project) => (
													<SelectItem
														key={project.id}
														value={project.containerTag}
													>
														{project.name}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
								</div>
							)}
						</div>
					)}

					{/* Step 3: Command Line - Show for manual installation or non-cursor clients */}
					{selectedClient &&
						selectedClient !== "mcp-url" &&
						(selectedClient !== "cursor" || cursorInstallTab === "manual") && (
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold">
										3
									</div>
									<h3 className="text-sm font-medium">
										{selectedClient === "cursor" &&
										cursorInstallTab === "manual"
											? "Manual Installation Command"
											: "Installation Command"}
									</h3>
								</div>

								<div className="relative">
									<Input
										className="font-mono text-xs w-full pr-10"
										readOnly
										value={generateInstallCommand()}
									/>
									<Button
										className="absolute top-[-1px] right-0 cursor-pointer"
										onClick={copyToClipboard}
										variant="ghost"
									>
										<CopyIcon className="size-4" />
									</Button>
								</div>

								<p className="text-xs text-muted-foreground">
									{selectedClient === "cursor" && cursorInstallTab === "manual"
										? "Copy and run this command in your terminal for manual installation (or switch to the one-click option above)"
										: "Copy and run this command in your terminal to install the MCP server"}
								</p>
							</div>
						)}

					{/* Blurred Command Placeholder - Only show when no client selected */}
					{!selectedClient && (
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold">
									3
								</div>
								<h3 className="text-sm font-medium">Installation Command</h3>
							</div>

							<div className="relative">
								<div className="w-full h-10 bg-muted border border-border rounded-md flex items-center px-3">
									<div className="w-full h-4 bg-muted-foreground/20 rounded animate-pulse blur-sm" />
								</div>
							</div>

							<p className="text-xs text-muted-foreground/50">
								Select a client above to see the installation command
							</p>
						</div>
					)}

					<div className="gap-2 hidden">
						<div>
							<label
								className="text-sm font-medium text-foreground/80 block mb-2"
								htmlFor="mcp-server-url-desktop"
							>
								MCP Server URL
							</label>
							<p className="text-xs text-muted-foreground mt-2">
								Use this URL to configure supermemory in your AI assistant
							</p>
						</div>
						<div className="p-1 bg-muted rounded-lg border border-border items-center flex px-2">
							<CopyableCell
								className="font-mono text-xs text-primary"
								value="https://api.supermemory.ai/mcp"
							/>
						</div>
					</div>

					{/* TODO: Show when connection successful or not */}
					{/*<div>
						<h3 className="text-sm font-medium mb-3">What You Can Do</h3>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>• Ask your AI to save important information as memories</li>
							<li>• Search through your saved memories during conversations</li>
							<li>• Get contextual information from your knowledge base</li>
						</ul>
					</div>*/}

					<div className="flex justify-between items-center pt-4">
						<div className="flex items-center gap-4">
							<Button
								onClick={() =>
									window.open(
										"https://docs.supermemory.ai/supermemory-mcp/introduction",
										"_blank",
									)
								}
								variant="outline"
							>
								<ExternalLink className="w-2 h-2 mr-2" />
								Learn More
							</Button>

							<Button
								onClick={() => setIsMigrateDialogOpen(true)}
								variant="outline"
							>
								Migrate from v1
							</Button>
						</div>
						<Button onClick={() => setIsOpen(false)}>Done</Button>
					</div>
				</div>
			</DialogContent>

			{/* Migration Dialog */}
			{isMigrateDialogOpen && (
				<Dialog
					onOpenChange={setIsMigrateDialogOpen}
					open={isMigrateDialogOpen}
				>
					<DialogContent className="sm:max-w-2xl bg-popover border-border text-popover-foreground">
						<div>
							<DialogHeader>
								<DialogTitle>Migrate from MCP v1</DialogTitle>
								<DialogDescription className="text-muted-foreground">
									Migrate your MCP documents from the legacy system.
								</DialogDescription>
							</DialogHeader>
							<form
								onSubmit={(e) => {
									e.preventDefault()
									e.stopPropagation()
									mcpMigrationForm.handleSubmit()
								}}
							>
								<div className="grid gap-4">
									<div className="flex flex-col gap-2">
										<label className="text-sm font-medium" htmlFor="mcpUrl">
											MCP Link
										</label>
										<mcpMigrationForm.Field name="url">
											{({ state, handleChange, handleBlur }) => (
												<>
													<Input
														className="bg-input border-border text-foreground"
														id="mcpUrl"
														onBlur={handleBlur}
														onChange={(e) => handleChange(e.target.value)}
														placeholder="https://mcp.supermemory.ai/your-user-id/sse"
														value={state.value}
													/>
													{state.meta.errors.length > 0 && (
														<p className="text-sm text-destructive mt-1">
															{state.meta.errors.join(", ")}
														</p>
													)}
												</>
											)}
										</mcpMigrationForm.Field>
										<p className="text-xs text-muted-foreground">
											Enter your old MCP Link in the format: <br />
											<span className="font-mono">
												https://mcp.supermemory.ai/userId/sse
											</span>
										</p>
									</div>
								</div>
								<div className="flex justify-end gap-3 mt-4">
									<Button
										onClick={() => {
											setIsMigrateDialogOpen(false)
											mcpMigrationForm.reset()
										}}
										type="button"
										variant="outline"
									>
										Cancel
									</Button>
									<Button
										disabled={
											migrateMCPMutation.isPending ||
											!mcpMigrationForm.state.canSubmit
										}
										type="submit"
									>
										{migrateMCPMutation.isPending ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin mr-2" />
												Migrating...
											</>
										) : (
											"Migrate"
										)}
									</Button>
								</div>
							</form>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</Dialog>
	)
}
