"use client"

import { useState, useEffect } from "react"
import {
	useQueryState,
	parseAsString,
	parseAsStringLiteral,
	parseAsInteger,
} from "nuqs"
import { Button } from "@ui/components/button"
import { CircleCheckIcon, CopyIcon, Check } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { analytics } from "@/lib/analytics"
import { cn } from "@lib/utils"
import { dmMonoClassName, dmSansClassName } from "@/lib/fonts"
import { SyncLogoIcon } from "@ui/assets/icons"

const MCP_SERVER_URL = "https://mcp.supermemory.ai/mcp"
const MCP_API_URL = "https://api.supermemory.ai/mcp"
const CURSOR_DEEPLINK =
	"cursor://anysphere.cursor-deeplink/mcp/install?name=supermemory&config=eyJ1cmwiOiJodHRwczovL2FwaS5zdXBlcm1lbW9yeS5haS9tY3AifQ%3D%3D"

type ClientId =
	| "cursor"
	| "claude"
	| "vscode"
	| "cline"
	| "gemini-cli"
	| "claude-code"
	| "mcp-url"
	| "roo-cline"
	| "witsy"
	| "enconvo"

type CategoryId = "ides" | "desktop-mcp" | "cli-agents" | "manual"

type InstallMode = "one-click" | "command" | "manual"

const CATEGORIES: Record<
	CategoryId,
	{ label: string; description: string; clients: ClientId[] }
> = {
	ides: {
		label: "IDEs",
		description: "Cursor, VS Code, and other code editors",
		clients: ["cursor", "vscode"],
	},
	"desktop-mcp": {
		label: "Desktop MCP Apps",
		description: "Claude Desktop, Cline, and similar apps",
		clients: ["claude", "cline", "roo-cline", "witsy", "enconvo"],
	},
	"cli-agents": {
		label: "CLI Agents",
		description: "Claude Code, Gemini CLI, and terminal tools",
		clients: ["claude-code", "gemini-cli"],
	},
	manual: {
		label: "Manual / MCP URL",
		description: "Any MCP-compatible client or custom setup",
		clients: ["mcp-url"],
	},
}

const CLIENTS: Record<
	ClientId,
	{ name: string; iconKey: string; installMode: InstallMode }
> = {
	cursor: { name: "Cursor", iconKey: "cursor", installMode: "one-click" },
	vscode: { name: "VSCode", iconKey: "vscode", installMode: "command" },
	claude: { name: "Claude Desktop", iconKey: "claude", installMode: "command" },
	cline: { name: "Cline", iconKey: "cline", installMode: "command" },
	"roo-cline": {
		name: "Roo Cline",
		iconKey: "roo-cline",
		installMode: "command",
	},
	witsy: { name: "Witsy", iconKey: "witsy", installMode: "command" },
	enconvo: { name: "Enconvo", iconKey: "enconvo", installMode: "command" },
	"claude-code": {
		name: "Claude Code",
		iconKey: "claude",
		installMode: "command",
	},
	"gemini-cli": {
		name: "Gemini CLI",
		iconKey: "gemini-cli",
		installMode: "command",
	},
	"mcp-url": { name: "MCP URL", iconKey: "mcp-url", installMode: "manual" },
}

function getClientIconSrc(clientId: ClientId): string {
	if (clientId === "mcp-url") return "/mcp-icon.svg"
	return `/mcp-supported-tools/${clientId === "claude-code" ? "claude" : clientId}.png`
}

interface MCPStepsProps {
	variant?: "full" | "embedded"
}

const stepGradient = {
	background:
		"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
	backgroundClip: "text",
	WebkitBackgroundClip: "text",
	WebkitTextFillColor: "transparent",
} as const

function StepCircle({
	step,
	isActive,
	onClick,
	disabled,
}: {
	step: number
	isActive: boolean
	onClick?: () => void
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			aria-label={
				onClick && !disabled
					? `Go back to step ${step}`
					: `Step ${step}${isActive ? " (current)" : ""}`
			}
			className={cn(
				"rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0 z-20 text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1F24]",
				onClick && !disabled && "cursor-pointer hover:bg-[#1a2530]",
				(!onClick || disabled) && "cursor-default",
				isActive ? "border border-[#15233C] bg-[#08142D]" : "bg-[#161F2B]",
			)}
			onClick={onClick}
			onKeyDown={(e) => {
				if (onClick && !disabled && (e.key === "Enter" || e.key === " ")) {
					e.preventDefault()
					onClick()
				}
			}}
			disabled={disabled}
		>
			<span className="text-lg" style={isActive ? stepGradient : undefined}>
				{step}
			</span>
		</button>
	)
}

function ClientChip({
	clientId,
	isSelected,
	onSelect,
}: {
	clientId: ClientId
	isSelected: boolean
	onSelect: () => void
}) {
	const client = CLIENTS[clientId]
	return (
		<button
			type="button"
			id={`mcp-client-${clientId}`}
			className={cn(
				"mcp-client-button-group py-[6px] pl-2 pr-3 rounded-full border transition-colors cursor-pointer duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14161A]",
				isSelected
					? "border-blue-500 bg-blue-500/10"
					: "border-[#242A33] bg-[#080B0F] hover:border-[#3273FC4D] hover:bg-[#08142D]",
			)}
			onClick={onSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault()
					onSelect()
				}
			}}
		>
			<div className="flex items-center space-x-1">
				<div className="w-5 h-5 flex items-center justify-center">
					<Image
						alt={client.name}
						unoptimized
						className="rounded object-contain"
						height={20}
						onError={(e) => {
							const target = e.target as HTMLImageElement
							target.style.display = "none"
							const parent = target.parentElement
							if (parent && !parent.querySelector(".fallback-text")) {
								const fallback = document.createElement("span")
								fallback.className =
									"fallback-text text-xs font-bold text-white"
								fallback.textContent = client.name.substring(0, 2).toUpperCase()
								parent.appendChild(fallback)
							}
						}}
						src={getClientIconSrc(clientId)}
						width={20}
					/>
				</div>
				<span className="mcp-client-gradient-text text-sm font-medium text-white">
					{client.name}
				</span>
			</div>
		</button>
	)
}

export function MCPSteps({ variant = "full" }: MCPStepsProps) {
	const [selectedCategory, setSelectedCategory] = useQueryState(
		"mcpCategory",
		parseAsString,
	)
	const [selectedClient, setSelectedClient] = useQueryState(
		"mcpClient",
		parseAsString,
	)
	const [selectedProject] = useState<string>("sm_project_default")
	const [cursorInstallTab, setCursorInstallTab] = useQueryState(
		"cursorTab",
		parseAsStringLiteral(["oneClick", "manual"] as const).withDefault(
			"oneClick",
		),
	)
	const [mcpUrlTab, setMcpUrlTab] = useQueryState(
		"mcpTab",
		parseAsStringLiteral(["oneClick", "manual"] as const).withDefault(
			"oneClick",
		),
	)
	const [isCopied, setIsCopied] = useState(false)
	const [activeStep, setActiveStep] = useQueryState(
		"mcpStep",
		parseAsInteger.withDefault(1),
	)

	useEffect(() => {
		analytics.mcpViewOpened()
	}, [])

	const resolvedCategory = selectedCategory as CategoryId | null
	const resolvedClient = selectedClient as ClientId | null
	const categoryClients = resolvedCategory
		? (CATEGORIES[resolvedCategory]?.clients ?? [])
		: []

	const generateInstallCommand = () => {
		if (!resolvedClient) return ""
		let command = `npx -y install-mcp@latest ${MCP_SERVER_URL} --client ${resolvedClient} --oauth=yes`
		const projectIdForCommand = selectedProject.replace(/^sm_project_/, "")
		command += ` --project ${projectIdForCommand}`
		return command
	}

	const copyToClipboard = () => {
		const command = generateInstallCommand()
		navigator.clipboard.writeText(command)
		analytics.mcpInstallCmdCopied()
		setIsCopied(true)
		setActiveStep(4)
		setTimeout(() => setIsCopied(false), 2000)
	}

	const handleCategorySelect = (cat: CategoryId) => {
		setSelectedCategory(cat)
		const firstClient = CATEGORIES[cat].clients[0]
		setSelectedClient(firstClient ?? null)
		setActiveStep(2)
	}

	const handleClientSelect = (client: ClientId) => {
		setSelectedClient(client)
		setActiveStep(3)
	}

	const handleBackToCategory = () => {
		setSelectedCategory(null)
		setSelectedClient(null)
		setActiveStep(1)
	}

	const handleBackToClient = () => {
		setSelectedClient(null)
		setActiveStep(2)
	}

	const handleCopyAndAdvance = (value: string) => {
		navigator.clipboard.writeText(value)
		analytics.mcpInstallCmdCopied()
		toast.success("Copied to clipboard!")
		setIsCopied(true)
		setActiveStep(4)
		setTimeout(() => setIsCopied(false), 2000)
	}

	const isEmbedded = variant === "embedded"
	const showStep3 = resolvedClient && activeStep >= 3
	const showStep4 = activeStep >= 4

	const step3Title =
		resolvedClient === "cursor" && cursorInstallTab === "oneClick"
			? "Install supermemory in Cursor"
			: resolvedClient === "mcp-url"
				? mcpUrlTab === "oneClick"
					? "Add MCP URL to your client"
					: "Paste config into your MCP settings"
				: "Copy and run the installation command"

	return (
		<div
			className={cn(
				"w-full relative",
				isEmbedded ? "h-full overflow-y-auto" : "max-w-2xl",
			)}
		>
			<div
				className="absolute left-4 top-0 w-px bg-[#1E293B] z-10"
				style={{
					height: showStep4
						? isEmbedded
							? "100%"
							: "calc(100% - 4rem)"
						: "100%",
				}}
			/>

			{/* Step 1: Choose setup type */}
			<div className="flex items-start space-x-4 z-20">
				<StepCircle
					step={1}
					isActive={activeStep === 1}
					onClick={resolvedCategory ? handleBackToCategory : undefined}
					disabled={!resolvedCategory}
				/>
				<div className="flex-1 mb-4">
					<button
						type="button"
						className={cn(
							"text-white text-lg font-medium text-left",
							resolvedCategory && "cursor-pointer hover:opacity-80",
							!resolvedCategory && "cursor-default",
						)}
						onClick={() => resolvedCategory && handleBackToCategory()}
						onKeyDown={(e) => {
							if (resolvedCategory && (e.key === "Enter" || e.key === " ")) {
								e.preventDefault()
								handleBackToCategory()
							}
						}}
						disabled={!resolvedCategory}
						style={activeStep === 1 ? stepGradient : undefined}
					>
						Choose setup type
					</button>
					<div
						className={cn(
							"flex flex-wrap gap-2 mt-4",
							resolvedCategory && "hidden",
						)}
					>
						{(
							Object.entries(CATEGORIES) as [
								CategoryId,
								(typeof CATEGORIES)[CategoryId],
							][]
						).map(([catId, cat]) => (
							<button
								key={catId}
								type="button"
								id={`mcp-category-${catId}`}
								className={cn(
									"py-3 px-4 rounded-xl border transition-colors cursor-pointer duration-200 text-left focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14161A]",
									resolvedCategory === catId
										? "border-blue-500 bg-blue-500/10"
										: "border-[#242A33] bg-[#080B0F] hover:border-[#3273FC4D] hover:bg-[#08142D] min-w-[140px]",
								)}
								onClick={() => handleCategorySelect(catId)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault()
										handleCategorySelect(catId)
									}
								}}
							>
								<span className="text-sm font-medium text-white block">
									{cat.label}
								</span>
								<span className="text-xs text-[#8B8B8B] mt-0.5 block">
									{cat.description}
								</span>
							</button>
						))}
						<button
							type="button"
							id="mcp-category-manual-fallback"
							className={cn(
								"py-3 px-4 rounded-xl border border-dashed border-[#242A33] transition-colors cursor-pointer duration-200 text-left focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14161A]",
								"hover:border-[#3273FC4D] hover:bg-[#08142D] min-w-[140px]",
							)}
							onClick={() => handleCategorySelect("manual")}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault()
									handleCategorySelect("manual")
								}
							}}
						>
							<span className="text-sm font-medium text-[#8B8B8B] block">
								Can&apos;t find your app?
							</span>
							<span className="text-xs text-[#6B6B6B] mt-0.5 block">
								Use MCP URL
							</span>
						</button>
					</div>
				</div>
			</div>

			{/* Step 2: Choose your app */}
			<div className="flex items-start space-x-4 z-20">
				<StepCircle
					step={2}
					isActive={activeStep === 2}
					onClick={resolvedClient ? handleBackToClient : undefined}
					disabled={!resolvedClient}
				/>
				<div className="flex-1 mb-4">
					<button
						type="button"
						className={cn(
							"text-white text-lg font-medium text-left",
							resolvedClient && "cursor-pointer hover:opacity-80",
							!resolvedClient && "cursor-default",
						)}
						onClick={() => resolvedClient && handleBackToClient()}
						onKeyDown={(e) => {
							if (resolvedClient && (e.key === "Enter" || e.key === " ")) {
								e.preventDefault()
								handleBackToClient()
							}
						}}
						disabled={!resolvedClient}
						style={activeStep === 2 ? stepGradient : undefined}
					>
						Choose your app
					</button>
					{resolvedCategory && (
						<div className="flex flex-wrap gap-2 mt-4">
							{categoryClients.map((clientId) => (
								<ClientChip
									key={clientId}
									clientId={clientId}
									isSelected={resolvedClient === clientId}
									onSelect={() => handleClientSelect(clientId)}
								/>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Step 3: Install or add supermemory */}
			<div className="flex items-start space-x-4 z-20">
				<div
					className={cn(
						"rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0 z-20 text-white",
						activeStep === 3
							? "border border-[#15233C] bg-[#08142D]"
							: "bg-[#161F2B]",
					)}
				>
					<span
						className="text-lg"
						style={activeStep === 3 ? stepGradient : undefined}
					>
						3
					</span>
				</div>
				<div className="flex-1 mb-4">
					<h3
						className="text-white text-lg font-medium mb-4"
						style={activeStep === 3 ? stepGradient : undefined}
					>
						{step3Title}
					</h3>
					{showStep3 && resolvedClient && (
						<div className="space-y-3">
							{resolvedClient === "mcp-url" ? (
								<div className="space-y-4">
									<div className="flex justify-end">
										<div className="flex bg-[#0D121A] rounded-full p-1 border border-gray-600">
											<button
												className={cn(
													"px-3 py-1.5 text-xs font-medium rounded-full transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
													mcpUrlTab === "oneClick"
														? "bg-[#080B0F] text-white border border-gray-600"
														: "text-gray-400 hover:text-white",
												)}
												onClick={() => setMcpUrlTab("oneClick")}
												type="button"
											>
												Quick Setup
											</button>
											<button
												className={cn(
													"px-3 py-1.5 text-xs font-medium rounded-full transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
													mcpUrlTab === "manual"
														? "bg-[#080B0F] text-white border border-gray-600"
														: "text-gray-400 hover:text-white",
												)}
												onClick={() => setMcpUrlTab("manual")}
												type="button"
											>
												Manual Config
											</button>
										</div>
									</div>
									{mcpUrlTab === "oneClick" ? (
										<div className="space-y-2">
											<p className="text-sm text-gray-400">
												Paste this URL into your MCP client to add supermemory
											</p>
											<div className="relative">
												<input
													id="mcp-url-input"
													className="font-mono text-xs w-full pr-10 p-2 bg-black border border-gray-600 rounded text-green-400"
													readOnly
													value={MCP_API_URL}
													aria-label="MCP server URL"
												/>
												<button
													type="button"
													aria-label="Copy MCP URL"
													className="absolute top-1 right-1 cursor-pointer p-1 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
													onClick={() => handleCopyAndAdvance(MCP_API_URL)}
												>
													<CopyIcon className="size-4 text-gray-400 hover:text-white" />
												</button>
											</div>
										</div>
									) : (
										<div className="space-y-3">
											<p className="text-sm text-gray-400">
												Add this configuration to your MCP settings file with
												authentication
											</p>
											<div className="relative">
												<pre className="bg-black border border-gray-600 rounded-lg p-4 pr-12 text-xs overflow-x-auto max-w-full">
													<code className="font-mono block whitespace-pre-wrap break-all text-green-400">
														{`{
  "supermemory-mcp": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "${MCP_API_URL}"],
    "env": {},
    "headers": {
      "Authorization": "Bearer your-api-key-here"
    }
  }
}`}
													</code>
												</pre>
												<button
													type="button"
													aria-label="Copy MCP config"
													className="absolute top-2 right-2 cursor-pointer h-8 w-8 p-0 bg-[#0D121A] hover:bg-[#1a1a1a] rounded focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
													onClick={() => {
														const config = `{
  "supermemory-mcp": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "${MCP_API_URL}"],
    "env": {},
    "headers": {
      "Authorization": "Bearer your-api-key-here"
    }
  }
}`
														handleCopyAndAdvance(config)
													}}
												>
													{isCopied ? (
														<span className="text-green-600">✓</span>
													) : (
														<CopyIcon className="size-3.5" />
													)}
												</button>
											</div>
											<p className="text-xs text-gray-400">
												Include your API key as a Bearer token in the
												Authorization header
											</p>
										</div>
									)}
								</div>
							) : resolvedClient === "cursor" ? (
								<div className="space-y-4">
									<div className="flex justify-end">
										<div className="flex bg-[#0D121A] rounded-full p-1 border border-gray-600">
											<button
												className={cn(
													"px-3 py-1.5 text-xs font-medium rounded-full transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
													cursorInstallTab === "oneClick"
														? "bg-[#080B0F] text-white border border-gray-600"
														: "text-gray-400 hover:text-white",
												)}
												onClick={() => setCursorInstallTab("oneClick")}
												type="button"
											>
												One-Click Install
											</button>
											<button
												className={cn(
													"px-3 py-1.5 text-xs font-medium rounded-full transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
													cursorInstallTab === "manual"
														? "bg-[#080B0F] text-white border border-gray-600"
														: "text-gray-400 hover:text-white",
												)}
												onClick={() => setCursorInstallTab("manual")}
												type="button"
											>
												Manual
											</button>
										</div>
									</div>
									{cursorInstallTab === "oneClick" ? (
										<div className="flex flex-col items-center gap-4 p-6 border border-green-500/20 rounded-lg bg-green-500/5">
											<p className="text-sm text-foreground/80 text-center">
												Click the button below to install and configure
												supermemory in Cursor
											</p>
											<a
												href={CURSOR_DEEPLINK}
												onClick={() => {
													analytics.mcpInstallCmdCopied()
													toast.success("Opening Cursor installer…")
													setActiveStep(4)
												}}
												className="focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
											>
												<img
													alt="Add supermemory MCP server to Cursor"
													className="hover:opacity-80 transition-opacity cursor-pointer"
													height={40}
													src="https://cursor.com/deeplink/mcp-install-dark.svg"
												/>
											</a>
										</div>
									) : (
										<div className="space-y-3">
											<p className="text-sm text-gray-400">
												Copy the command and run it in your terminal
											</p>
											<div className="relative">
												<input
													id="mcp-install-command-cursor"
													className={cn(
														"text-xs w-full pr-24 py-4 bg-[#0D121A] rounded-xl text-white pl-3",
														dmMonoClassName(),
													)}
													style={{
														border: "1px solid rgba(61, 67, 77, 0.10)",
														textOverflow: "ellipsis",
														overflow: "hidden",
														whiteSpace: "nowrap",
													}}
													readOnly
													value={generateInstallCommand()}
													aria-label="Installation command"
												/>
												<button
													type="button"
													aria-label="Copy installation command"
													className={cn(
														"absolute top-[5px] right-1 cursor-pointer p-1 flex items-center rounded-[10px] px-3 py-2 gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
														dmSansClassName(),
													)}
													style={{
														background:
															"linear-gradient(180deg, #267BF1 40.23%, #15468B 100%), linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
														border: "1px solid #000",
													}}
													onClick={copyToClipboard}
												>
													{isCopied ? (
														<>
															<Check className="size-4 text-white" />
															<span className="text-white">Copied</span>
														</>
													) : (
														<>
															<CopyIcon className="size-[20px] text-white stroke-[2px]" />
															<span className="text-white">Copy</span>
														</>
													)}
												</button>
											</div>
										</div>
									)}
								</div>
							) : (
								<div className="space-y-3">
									<p className="text-sm text-gray-400">
										Copy the command and run it in your terminal
									</p>
									<div className="relative">
										<input
											id="mcp-install-command"
											className={cn(
												"text-xs w-full pr-24 py-4 bg-[#0D121A] rounded-xl text-white pl-3",
												dmMonoClassName(),
											)}
											style={{
												border: "1px solid rgba(61, 67, 77, 0.10)",
												textOverflow: "ellipsis",
												overflow: "hidden",
												whiteSpace: "nowrap",
											}}
											readOnly
											value={generateInstallCommand()}
											aria-label="Installation command"
										/>
										<button
											type="button"
											aria-label="Copy installation command"
											className={cn(
												"absolute top-[5px] right-1 cursor-pointer p-1 flex items-center rounded-[10px] px-3 py-2 gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
												dmSansClassName(),
											)}
											style={{
												background:
													"linear-gradient(180deg, #267BF1 40.23%, #15468B 100%), linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
												border: "1px solid #000",
											}}
											onClick={copyToClipboard}
										>
											{isCopied ? (
												<>
													<Check className="size-4 text-white" />
													<span className="text-white">Copied</span>
												</>
											) : (
												<>
													<CopyIcon className="size-[20px] text-white stroke-[2px]" />
													<span className="text-white">Copy</span>
												</>
											)}
										</button>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Step 4: Restart and test */}
			<div className="flex items-start space-x-4 z-20">
				<div
					className={cn(
						"rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0 z-20 text-white",
						activeStep === 4
							? "border border-[#15233C] bg-[#08142D]"
							: "bg-[#161F2B]",
					)}
				>
					<span
						className="text-lg"
						style={activeStep === 4 ? stepGradient : undefined}
					>
						4
					</span>
				</div>
				<div className="flex-1 space-y-4">
					<h3
						className="text-white text-lg font-medium"
						style={activeStep === 4 ? stepGradient : undefined}
					>
						Restart and test
					</h3>
					{showStep4 && (
						<div className="space-y-3">
							<p className="text-sm text-gray-400">
								Restart your AI client, then ask: &quot;What do you remember
								about this project?&quot; or type{" "}
								<code className="font-mono text-xs bg-[#0D121A] px-1.5 py-0.5 rounded">
									/context
								</code>{" "}
								to verify supermemory is connected.
							</p>
							<div
								className={cn(
									"font-mono text-xs w-full p-4 bg-[#0D121A] rounded-xl text-white flex items-center gap-2",
									dmMonoClassName(),
								)}
								style={{ border: "1px solid rgba(61, 67, 77, 0.10)" }}
							>
								<SyncLogoIcon className="size-4 shrink-0" aria-hidden />
								<span>Waiting for connection</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

interface MCPDetailViewProps {
	onBack: () => void
}

export function MCPDetailView({ onBack }: MCPDetailViewProps) {
	return (
		<div className="flex flex-col h-full p-8">
			<div className="mb-6">
				<Button
					variant="link"
					className="text-white hover:text-gray-300 p-0 hover:no-underline cursor-pointer"
					onClick={onBack}
				>
					← Back
				</Button>
			</div>

			<div className="flex-1 flex flex-col items-start justify-start">
				<h1 className="text-white text-xl font-medium mb-4 text-start">
					Connect your AI to supermemory MCP
				</h1>

				<div className="mb-12 space-x-4 flex max-w-2xl">
					<div
						className={cn(
							"flex items-start space-x-3 w-[200px]",
							dmSansClassName(),
						)}
					>
						<CircleCheckIcon className="size-4 text-green-500 shrink-0 mt-0.5" />
						<p className="text-[#8B8B8B] text-sm">
							MCP connects your AI apps to create and use memories directly
						</p>
					</div>
					<div
						className={cn(
							"flex items-start space-x-3 w-[200px]",
							dmSansClassName(),
						)}
					>
						<CircleCheckIcon className="size-4 text-green-500 shrink-0 mt-0.5" />
						<p className="text-[#8B8B8B] text-sm">
							Auto-fetch the right context from anything you've saved
						</p>
					</div>
					<div
						className={cn(
							"flex items-start space-x-3 w-[200px]",
							dmSansClassName(),
						)}
					>
						<CircleCheckIcon className="size-4 text-green-500 shrink-0 mt-0.5" />
						<p className="text-[#8B8B8B] text-sm">
							One-time setup, <br /> seamless integration across your workflow
						</p>
					</div>
				</div>

				<MCPSteps variant="full" />
			</div>
		</div>
	)
}
