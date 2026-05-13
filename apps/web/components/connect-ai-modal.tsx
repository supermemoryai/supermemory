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
import {
	defaultMcpSetupTab,
	getMcpClientSetup,
	mcpClientSetupShowsTabs,
	mcpClientShowsOneClick,
	resolveMcpSetupTabForClient,
} from "@/lib/mcp-client-setup"
import { ClaudeDesktopManualTimeline } from "@/components/mcp-modal/claude-desktop-manual-timeline"
import {
	buildMcpUrlRemoteJson,
	CHATGPT_REMOTE_MCP_URL,
	CLAUDE_DESKTOP_MCP_SNIPPET,
	getManualInstallEntry,
} from "@/lib/mcp-manual-instructions"
import { cn } from "@lib/utils"
import type { Project } from "@lib/types"
import { motion, AnimatePresence } from "motion/react"

const clients = {
	chatgpt: "ChatGPT",
	codex: "Codex",
	cursor: "Cursor",
	claude: "Claude Desktop",
	vscode: "VSCode",
	cline: "Cline",
	"gemini-cli": "Gemini CLI",
	"claude-code": "Claude Code",
	"mcp-url": "MCP URL",
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
	const [setupTab, setSetupTab] = useState<"oneClick" | "manual">(
		openInitialTab ?? "manual",
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
			return (response.data?.projects || []) as Project[]
		},
		staleTime: 30 * 1000,
	})

	const { data: connectionStatus, isLoading: isCheckingConnection } = useQuery({
		queryKey: ["mcp-connection"],
		queryFn: async () => {
			const response = await $fetch("@get/mcp/has-login")
			if (response.error) {
				throw new Error(response.error?.message || "Failed to check connection")
			}
			return response.data
		},
		refetchInterval: 5000,
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

	useEffect(() => {
		if (openInitialClient) {
			setSelectedClient(openInitialClient as keyof typeof clients)
			setSetupTab(
				resolveMcpSetupTabForClient(openInitialClient, openInitialTab),
			)
		}
	}, [openInitialClient, openInitialTab])

	useEffect(() => {
		if (!selectedClient) return
		const s = getMcpClientSetup(selectedClient)
		if (!s.oneClick && setupTab === "oneClick") setSetupTab("manual")
		if (!s.manual && setupTab === "manual") setSetupTab("oneClick")
	}, [selectedClient, setupTab])

	useEffect(() => {
		if (selectedClient !== "mcp-url" || setupTab !== "manual" || !org?.id)
			return
		if (manualApiKey || createMcpApiKeyMutation.isPending) return
		createMcpApiKeyMutation.mutate()
	}, [
		selectedClient,
		setupTab,
		org?.id,
		manualApiKey,
		createMcpApiKeyMutation.isPending,
		createMcpApiKeyMutation.mutate,
	])

	function generateInstallCommand() {
		if (!selectedClient || selectedClient === "chatgpt") return ""

		let command = `npx -y install-mcp@latest https://mcp.supermemory.ai/mcp --client ${selectedClient} --oauth=yes`

		if (selectedProject && selectedProject !== "none") {
			// Remove the "sm_project_" prefix from the containerTag
			const projectIdForCommand = selectedProject.replace(/^sm_project_/, "")
			command += ` --project ${projectIdForCommand}`
		}

		return command
	}

	function getCursorDeeplink() {
		return "cursor://anysphere.cursor-deeplink/mcp/install?name=supermemory&config=eyJ1cmwiOiJodHRwczovL2FwaS5zdXBlcm1lbW9yeS5haS9tY3AifQ%3D%3D"
	}

	const copyToClipboard = () => {
		const command = generateInstallCommand()
		navigator.clipboard.writeText(command)
		analytics.mcpInstallCmdCopied()
		toast.success("Copied to clipboard!")
	}

	const copyManualSnippet = (text: string) => {
		navigator.clipboard.writeText(text)
		analytics.mcpInstallCmdCopied()
		toast.success("Copied to clipboard!")
		setIsCopied(true)
		setTimeout(() => setIsCopied(false), 2000)
	}

	const clientSetup = selectedClient ? getMcpClientSetup(selectedClient) : null
	const effectiveSetupTab: "manual" | "oneClick" =
		clientSetup == null
			? "manual"
			: !clientSetup.manual
				? "oneClick"
				: !clientSetup.oneClick
					? "manual"
					: setupTab

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
							<div className="size-8 rounded-full flex items-center justify-center text-sm font-semibold bg-accent text-accent-foreground">
								1
							</div>
							<h3 className="text-sm font-medium">Select Your AI Client</h3>
						</div>

						<div className="space-x-2 space-y-2">
							{Object.entries(clients).map(([key, clientName]) => (
								<button
									className={`pr-3 pl-1 rounded-full border cursor-pointer transition-all ${
										selectedClient === key
											? "border-primary bg-primary/10"
											: "border-border hover:border-border/60 hover:bg-muted/50"
									}`}
									key={key}
									onClick={() => {
										setSelectedClient(key as keyof typeof clients)
										setSetupTab(defaultMcpSetupTab(getMcpClientSetup(key)))
									}}
									type="button"
								>
									<div className="flex items-center gap-1">
										<div className="size-8 flex items-center justify-center">
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

					{selectedClient && (
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<div className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
									2
								</div>
							</div>
							{((clientSetup && mcpClientSetupShowsTabs(clientSetup)) ||
								selectedClient !== "mcp-url") && (
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
									{clientSetup && mcpClientSetupShowsTabs(clientSetup) ? (
										<div
											className="flex w-full max-w-md flex-row gap-1 rounded-full border border-border bg-muted/50 p-1 sm:w-auto sm:min-w-[280px]"
											role="tablist"
											aria-label="Setup method"
										>
											<button
												className={cn(
													"min-h-9 flex-1 rounded-full px-3 py-2 text-center text-xs font-medium transition-all",
													effectiveSetupTab === "manual"
														? "border border-border bg-background text-foreground shadow-sm"
														: "text-muted-foreground hover:text-foreground",
												)}
												onClick={() => setSetupTab("manual")}
												role="tab"
												type="button"
												aria-selected={effectiveSetupTab === "manual"}
											>
												Manual instructions
											</button>
											<button
												className={cn(
													"min-h-9 flex-1 rounded-full px-3 py-2 text-center text-xs font-medium transition-all",
													effectiveSetupTab === "oneClick"
														? "border border-border bg-background text-foreground shadow-sm"
														: "text-muted-foreground hover:text-foreground",
												)}
												onClick={() => setSetupTab("oneClick")}
												role="tab"
												type="button"
												aria-selected={effectiveSetupTab === "oneClick"}
											>
												One click setup
											</button>
										</div>
									) : null}
									{selectedClient !== "mcp-url" && (
										<div
											className={cn(
												"flex justify-end",
												!(
													clientSetup && mcpClientSetupShowsTabs(clientSetup)
												) && "w-full sm:justify-start",
											)}
										>
											<ManualMCPHelpLink
												onClick={() => {
													setSelectedClient("mcp-url")
													setSetupTab("manual")
													if (
														!manualApiKey &&
														!createMcpApiKeyMutation.isPending
													) {
														createMcpApiKeyMutation.mutate()
													}
												}}
											/>
										</div>
									)}
								</div>
							)}
							<div className="min-w-0 space-y-4">
								{clientSetup &&
								mcpClientShowsOneClick(clientSetup, effectiveSetupTab) ? (
									<>
										{selectedClient === "cursor" && (
											<div className="space-y-4">
												<div className="flex flex-col items-center gap-4 rounded-lg border border-green-500/20 bg-green-500/5 p-6">
													<p className="text-center text-sm text-foreground/80">
														Open Cursor and add supermemory in one step, or
														switch to Manual instructions to edit{" "}
														<code className="text-xs">mcp.json</code> yourself.
													</p>
													<a
														href={getCursorDeeplink()}
														onClick={() => {
															analytics.mcpInstallCmdCopied()
															toast.success("Opening Cursor installer…")
														}}
													>
														<img
															alt="Add Supermemory MCP server to Cursor"
															className="cursor-pointer transition-opacity hover:opacity-80"
															height="40"
															src="https://cursor.com/deeplink/mcp-install-dark.svg"
														/>
													</a>
												</div>
												<p className="text-xs text-muted-foreground">
													Alternatively, pick another client and use the install
													command, or use Manual instructions for a JSON
													snippet.
												</p>
											</div>
										)}
										{selectedClient === "mcp-url" && (
											<div className="space-y-2">
												<p className="text-sm text-muted-foreground">
													Paste this URL into clients that support remote MCP
													over HTTPS (OAuth).
												</p>
												<div className="relative max-w-xl">
													<Input
														className="w-full pr-10 font-mono text-xs"
														readOnly
														value={CHATGPT_REMOTE_MCP_URL}
													/>
													<Button
														className="absolute -top-px right-0 cursor-pointer"
														onClick={() => {
															navigator.clipboard.writeText(
																CHATGPT_REMOTE_MCP_URL,
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
										)}
										{selectedClient !== "cursor" &&
											selectedClient !== "mcp-url" && (
												<div className="space-y-4">
													<p className="text-sm text-muted-foreground">
														Optional: scope installs to a project. Then copy and
														run the command in your terminal.
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
													<div className="relative max-w-full">
														<Input
															className="w-full pr-10 font-mono text-xs"
															readOnly
															value={generateInstallCommand()}
														/>
														<Button
															className="absolute -top-px right-0 cursor-pointer"
															onClick={copyToClipboard}
															variant="ghost"
														>
															<CopyIcon className="size-4" />
														</Button>
													</div>
													<p className="text-xs text-muted-foreground">
														Requires Node/npx. OAuth runs when the CLI prompts
														you.
													</p>
												</div>
											)}
									</>
								) : (
									(() => {
										const manual = getManualInstallEntry(selectedClient)
										if (manual.kind === "chatgpt") {
											return (
												<div className="space-y-3">
													<ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
														<li>Open ChatGPT in your browser.</li>
														<li>
															Settings → Apps → Advanced settings → enable
															Developer mode.
														</li>
														<li>
															Create an app and paste the MCP URL when asked.
														</li>
														<li>Complete OAuth in ChatGPT.</li>
													</ol>
													<div className="relative max-w-xl">
														<Input
															className="w-full pr-10 font-mono text-xs"
															readOnly
															value={CHATGPT_REMOTE_MCP_URL}
														/>
														<Button
															className="absolute -top-px right-0 cursor-pointer"
															onClick={() =>
																copyManualSnippet(CHATGPT_REMOTE_MCP_URL)
															}
															variant="ghost"
														>
															<CopyIcon className="size-4" />
														</Button>
													</div>
													<a
														className="text-xs text-primary underline"
														href="https://developers.openai.com/api/docs/guides/developer-mode/"
														rel="noopener noreferrer"
														target="_blank"
													>
														Developer mode docs (OpenAI)
													</a>
												</div>
											)
										}
										if (manual.kind === "claude-desktop-timeline") {
											return (
												<ClaudeDesktopManualTimeline
													onCopySnippet={() =>
														copyManualSnippet(CLAUDE_DESKTOP_MCP_SNIPPET)
													}
													snippetCopied={isCopied}
													variant="modal"
												/>
											)
										}
										if (manual.kind === "generic-remote") {
											const remoteSnippet = buildMcpUrlRemoteJson(
												manualApiKey || "your-api-key-here",
											)
											return (
												<div className="space-y-3">
													<p className="text-sm text-muted-foreground">
														Paste into your MCP config. We create an API key for
														you when you open this tab; copy the block after it
														appears.
													</p>
													{createMcpApiKeyMutation.isPending ? (
														<div className="flex items-center justify-center p-8">
															<Loader2 className="size-6 animate-spin text-primary" />
														</div>
													) : (
														<>
															<div className="relative max-w-full">
																<pre className="max-h-80 overflow-x-auto overflow-y-auto rounded-lg border border-border bg-muted p-4 pr-12 text-xs">
																	<code className="block font-mono whitespace-pre-wrap break-all">
																		{remoteSnippet}
																	</code>
																</pre>
																<Button
																	className="absolute top-2 right-2 size-8 cursor-pointer p-0 bg-muted/80 hover:bg-muted"
																	onClick={() =>
																		copyManualSnippet(remoteSnippet)
																	}
																	size="icon"
																	variant="ghost"
																>
																	{isCopied ? (
																		<CheckIcon className="size-3.5 text-green-600" />
																	) : (
																		<CopyIcon className="size-3.5" />
																	)}
																</Button>
															</div>
															<p className="text-xs text-muted-foreground">
																Bearer token uses your supermemory API key.
															</p>
														</>
													)}
												</div>
											)
										}
										return (
											<div className="space-y-3">
												<p className="text-sm text-muted-foreground">
													{manual.paths}
												</p>
												<p className="text-sm text-muted-foreground">
													Merge the snippet with your existing config. Restart
													the client and sign in with OAuth when prompted.
												</p>
												<div className="relative max-w-full">
													<pre className="max-h-80 overflow-x-auto overflow-y-auto rounded-lg border border-border bg-muted p-4 pr-12 text-xs">
														<code className="block font-mono whitespace-pre-wrap break-all">
															{manual.snippet}
														</code>
													</pre>
													<Button
														className="absolute top-2 right-2 size-8 cursor-pointer p-0 bg-muted/80 hover:bg-muted"
														onClick={() => copyManualSnippet(manual.snippet)}
														size="icon"
														variant="ghost"
													>
														{isCopied ? (
															<CheckIcon className="size-3.5 text-green-600" />
														) : (
															<CopyIcon className="size-3.5" />
														)}
													</Button>
												</div>
											</div>
										)
									})()
								)}
							</div>
						</div>
					)}

					{!selectedClient && (
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<div className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
									2
								</div>
							</div>

							<div className="relative">
								<div className="flex h-10 w-full items-center rounded-md border border-border bg-muted px-3">
									<div className="h-4 w-full animate-pulse rounded bg-muted-foreground/20 blur-sm" />
								</div>
							</div>

							<p className="text-xs text-muted-foreground/50">
								Select a client for setup instructions
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
								value={CHATGPT_REMOTE_MCP_URL}
							/>
						</div>
					</div>

					<div className="bg-muted/50 rounded-lg p-4 border border-border">
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-sm font-medium">Connection Status</h3>
							<div className="flex items-center gap-2 text-xs">
								{isCheckingConnection ? (
									<>
										<Loader2 className="size-3 animate-spin text-muted-foreground" />
										<span className="text-muted-foreground">Checking…</span>
									</>
								) : connectionStatus?.previousLogin ? (
									<>
										<div className="size-2 rounded-full bg-green-500" />
										<span className="text-green-600 font-medium">
											Connected
										</span>
									</>
								) : (
									<>
										<div className="size-2 rounded-full bg-yellow-500" />
										<span className="text-yellow-600 font-medium">
											Waiting for connection…
										</span>
									</>
								)}
							</div>
						</div>

						<h3 className="text-sm font-medium mb-3">What You Can Do</h3>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>• Ask your AI to save important information as memories</li>
							<li>• Search through your saved memories during conversations</li>
							<li>• Get contextual information from your knowledge base</li>
						</ul>
					</div>

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
								<ExternalLink className="size-2 mr-2" />
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
														onChange={(
															e: React.ChangeEvent<HTMLInputElement>,
														) => handleChange(e.target.value)}
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
												<Loader2 className="size-4 animate-spin mr-2" />
												Migrating…
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
