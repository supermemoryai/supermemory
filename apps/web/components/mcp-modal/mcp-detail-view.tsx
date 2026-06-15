"use client"

import { useState, useEffect } from "react"
import {
	useQueryState,
	parseAsString,
	parseAsStringLiteral,
	parseAsInteger,
} from "nuqs"
import { Button } from "@ui/components/button"
import { CopyIcon, Check, ChevronRight } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { analytics } from "@/lib/analytics"
import { cn } from "@lib/utils"
import { dmMonoClassName, dmSansClassName } from "@/lib/fonts"
import { SyncLogoIcon } from "@ui/assets/icons"
import {
	defaultMcpSetupTab,
	getMcpClientSetup,
	mcpClientSetupShowsTabs,
	mcpClientShowsManual,
	mcpClientShowsOneClick,
	setupInstructionsSubtitle,
} from "@/lib/mcp-client-setup"
import {
	buildMcpUrlRemoteJson,
	CHATGPT_REMOTE_MCP_URL,
	CLAUDE_DESKTOP_MCP_SNIPPET,
	getManualInstallEntry,
} from "@/lib/mcp-manual-instructions"
import { ClaudeDesktopManualTimeline } from "@/components/mcp-modal/claude-desktop-manual-timeline"
import { INSET } from "@/components/integrations/install-steps"

function McpCodeBlock({
	code,
	multiline,
	onCopy,
}: {
	code: string
	multiline?: boolean
	onCopy?: () => void
}) {
	const [copied, setCopied] = useState(false)
	const copy = () => {
		navigator.clipboard.writeText(code)
		setCopied(true)
		toast.success("Copied to clipboard!")
		setTimeout(() => setCopied(false), 2000)
		onCopy?.()
	}
	return (
		<div
			className={cn(
				"group flex min-w-0 gap-2 rounded-[10px] border border-white/[0.07] bg-[#0B0E13] px-3 py-2.5",
				multiline ? "items-start" : "items-center",
			)}
		>
			<div className="relative min-w-0 flex-1">
				<pre
					className={cn(
						"scrollbar-none min-w-0 overflow-x-auto font-mono text-[12px] leading-[1.6] text-[#E4E4E7]",
						multiline ? "whitespace-pre-wrap break-all" : "whitespace-pre pr-4",
						dmMonoClassName(),
					)}
				>
					{code}
				</pre>
				{!multiline && (
					<div
						aria-hidden
						className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0B0E13] to-transparent"
					/>
				)}
			</div>
			<button
				type="button"
				aria-label="Copy"
				onClick={copy}
				className={cn(
					"flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0D121A] transition-opacity hover:opacity-80",
					INSET,
				)}
			>
				{copied ? (
					<Check className="size-3.5 text-[#4BA0FA]" />
				) : (
					<CopyIcon className="size-3.5 text-[#737373]" />
				)}
			</button>
		</div>
	)
}

const clients = {
	antigravity: "Antigravity",
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

type ClientKey = keyof typeof clients

const MCP_CATEGORIES: {
	label: string
	items: { key: ClientKey; title: string; subtitle: string }[]
}[] = [
	{
		label: "OpenAI",
		items: [
			{
				key: "chatgpt",
				title: "ChatGPT",
				subtitle: "Developer mode · Apps",
			},
			{ key: "codex", title: "Codex", subtitle: "CLI" },
		],
	},
	{
		label: "Claude",
		items: [
			{ key: "claude", title: "Claude Desktop", subtitle: "Desktop app" },
			{ key: "claude-code", title: "Claude Code", subtitle: "CLI" },
		],
	},
	{
		label: "IDEs",
		items: [
			{ key: "antigravity", title: "Antigravity", subtitle: "AI IDE" },
			{ key: "cursor", title: "Cursor", subtitle: "AI IDE" },
			{ key: "vscode", title: "VS Code", subtitle: "IDE" },
			{ key: "cline", title: "Cline", subtitle: "VS Code extension" },
			{ key: "gemini-cli", title: "Gemini CLI", subtitle: "Terminal" },
		],
	},
	{
		label: "MCP",
		items: [{ key: "mcp-url", title: "MCP URL", subtitle: "Custom clients" }],
	},
]

function clientIconSrc(key: ClientKey) {
	if (key === "mcp-url") return "/mcp-icon.svg"
	if (key === "antigravity") return "/mcp-supported-tools/antigravity.svg"
	const file = key === "claude-code" ? "claude" : key
	return `/mcp-supported-tools/${file}.png`
}

function ClientToolIcon({
	clientKey,
	title,
}: {
	clientKey: ClientKey
	title: string
}) {
	const [failed, setFailed] = useState(false)
	const src = clientIconSrc(clientKey)

	return (
		<div
			className={cn(
				"size-10 shrink-0 rounded-[10px] bg-[#080B0F] flex items-center justify-center overflow-hidden",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]",
			)}
		>
			{failed ? (
				<span className="text-[11px] font-bold text-[#FAFAFA] tracking-tight">
					{title.slice(0, 2).toUpperCase()}
				</span>
			) : (
				<Image
					alt={title}
					unoptimized
					height={24}
					width={24}
					className="object-contain"
					src={src}
					onError={() => setFailed(true)}
				/>
			)}
		</div>
	)
}

interface MCPStepsProps {
	variant?: "full" | "embedded"
}

export function MCPSteps({ variant = "full" }: MCPStepsProps) {
	const [selectedClient, setSelectedClient] = useQueryState(
		"mcpClient",
		parseAsString,
	)
	const [selectedProject] = useState<string>("sm_project_default")
	const [setupTab, setSetupTab] = useQueryState(
		"mcpTab",
		parseAsStringLiteral(["oneClick", "manual"] as const).withDefault("manual"),
	)
	const [isManualCopied, setIsManualCopied] = useState(false)
	const [activeStep, setActiveStep] = useQueryState(
		"mcpStep",
		parseAsInteger.withDefault(1),
	)

	useEffect(() => {
		analytics.mcpViewOpened()
	}, [])

	useEffect(() => {
		if (!selectedClient) return
		const s = getMcpClientSetup(selectedClient)
		if (!s.oneClick && setupTab === "oneClick") setSetupTab("manual")
		if (!s.manual && setupTab === "manual") setSetupTab("oneClick")
	}, [selectedClient, setupTab, setSetupTab])

	function getCursorDeeplink() {
		return "cursor://anysphere.cursor-deeplink/mcp/install?name=supermemory&config=eyJ1cmwiOiJodHRwczovL2FwaS5zdXBlcm1lbW9yeS5haS9tY3AifQ%3D%3D"
	}

	function generateInstallCommand() {
		if (!selectedClient || selectedClient === "chatgpt") return ""

		let command = `npx -y install-mcp@latest https://mcp.supermemory.ai/mcp --client ${selectedClient} --oauth=yes`

		const projectIdForCommand = selectedProject.replace(/^sm_project_/, "")
		command += ` --project ${projectIdForCommand}`

		return command
	}

	const copyManualSnippet = (text: string) => {
		navigator.clipboard.writeText(text)
		analytics.mcpInstallCmdCopied()
		toast.success("Copied to clipboard!")
		setIsManualCopied(true)
		setActiveStep(3)
		setTimeout(() => setIsManualCopied(false), 2000)
	}

	const isEmbedded = variant === "embedded"
	const isValidClient = Boolean(selectedClient && selectedClient in clients)
	const selectedKey = isValidClient ? (selectedClient as ClientKey) : null

	const detailSetup =
		selectedKey != null ? getMcpClientSetup(selectedKey) : null
	const effectiveSetupTab: "manual" | "oneClick" =
		detailSetup == null
			? "manual"
			: !detailSetup.manual
				? "oneClick"
				: !detailSetup.oneClick
					? "manual"
					: setupTab

	return (
		<div
			className={cn(
				"w-full",
				isEmbedded ? "h-full overflow-y-auto" : "max-w-3xl",
			)}
		>
			{!isValidClient || selectedKey == null ? (
				<div className={cn("space-y-0", dmSansClassName())}>
					{MCP_CATEGORIES.map((category, rowIndex) => (
						<div
							key={category.label}
							className={cn(
								"flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:gap-8",
								rowIndex > 0 && "border-t border-white/[0.06]",
							)}
						>
							<div className="w-full shrink-0 sm:w-30">
								<p className="text-[13px] font-semibold tracking-[-0.01em] text-[#A1A1AA]">
									{category.label}
								</p>
							</div>
							<div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
								{category.items.map((item) => (
									<button
										key={item.key}
										type="button"
										onClick={() => {
											setSelectedClient(item.key)
											setSetupTab(
												defaultMcpSetupTab(getMcpClientSetup(item.key)),
											)
											setActiveStep(2)
										}}
										className={cn(
											"group flex w-full min-w-0 items-center gap-3 rounded-[12px] bg-[#0D121A] p-3.5 text-left transition-colors",
											"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.5)] hover:bg-[#10151D]",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4BA0FA]/40",
										)}
									>
										<ClientToolIcon clientKey={item.key} title={item.title} />
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium text-[#FAFAFA]">
												{item.title}
											</p>
											<p className="text-[12px] text-[#737373]">
												{item.subtitle}
											</p>
										</div>
										<ChevronRight
											className="size-4 shrink-0 text-[#525D6E] transition-transform group-hover:translate-x-0.5"
											aria-hidden
										/>
									</button>
								))}
							</div>
						</div>
					))}
					<p className="pt-1 text-[13px] text-[#A1A1AA]">
						You can connect several clients; setup is different for each one.
					</p>
				</div>
			) : (
				<div className={cn("space-y-4", dmSansClassName())}>
					{!isEmbedded && (
						<>
							<button
								type="button"
								onClick={() => {
									setSelectedClient(null)
									setActiveStep(1)
								}}
								className="text-sm font-medium text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
							>
								← All clients
							</button>

							<div className="flex flex-wrap items-center gap-3">
								<ClientToolIcon
									clientKey={selectedKey}
									title={clients[selectedKey]}
								/>
								<div>
									<p className="text-lg font-medium text-[#FAFAFA]">
										{clients[selectedKey]}
									</p>
									<p className="text-sm text-[#737373]">
										{detailSetup ? setupInstructionsSubtitle(detailSetup) : ""}
									</p>
								</div>
							</div>
						</>
					)}

					<div
						className={cn(
							"space-y-4",
							!isEmbedded && "border-t border-white/[0.06] pt-8",
						)}
					>
						{detailSetup && mcpClientSetupShowsTabs(detailSetup) ? (
							<div
								className={cn(
									"flex w-full flex-row gap-0.5 rounded-full bg-[#0D121A] p-0.5",
									"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.5)]",
								)}
								role="tablist"
								aria-label="Setup method"
							>
								<button
									className={cn(
										"min-h-8 flex-1 rounded-full px-3 text-center text-[12px] font-medium transition-colors",
										effectiveSetupTab === "manual"
											? "bg-white/[0.10] text-[#FAFAFA]"
											: "text-[#A1A1AA] hover:text-[#FAFAFA]",
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
										"min-h-8 flex-1 rounded-full px-3 text-center text-[12px] font-medium transition-colors",
										effectiveSetupTab === "oneClick"
											? "bg-white/[0.10] text-[#FAFAFA]"
											: "text-[#A1A1AA] hover:text-[#FAFAFA]",
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
						<div className="min-w-0 space-y-3">
							{detailSetup &&
							mcpClientShowsOneClick(detailSetup, effectiveSetupTab) ? (
								<>
									{selectedClient === "mcp-url" && (
										<div className="space-y-2">
											<p className="text-[13px] leading-relaxed text-[#A1A1AA]">
												Paste this URL into any MCP client that supports remote
												servers over HTTPS.
											</p>
											<McpCodeBlock
												code="https://mcp.supermemory.ai/mcp"
												onCopy={() => {
													analytics.mcpInstallCmdCopied()
													toast.success("Copied to clipboard!")
													setActiveStep(3)
												}}
											/>
										</div>
									)}
									{selectedClient === "cursor" && (
										<div className="space-y-4">
											<p className="text-[13px] leading-relaxed text-[#A1A1AA]">
												Open the link below to add supermemory in Cursor, or use
												Manual instructions to edit{" "}
												<code className="font-mono text-[12px] text-[#8BC6FF]">
													~/.cursor/mcp.json
												</code>
												.
											</p>
											<div className="flex flex-col items-center gap-4 rounded-[10px] border border-white/[0.07] bg-[#0B0E13] p-6">
												<a
													href={getCursorDeeplink()}
													onClick={() => {
														analytics.mcpInstallCmdCopied()
														toast.success("Opening Cursor installer...")
														setActiveStep(3)
													}}
													rel="noopener noreferrer"
													target="_blank"
												>
													<Image
														alt="Add Supermemory MCP server to Cursor"
														className="cursor-pointer opacity-90 transition-opacity hover:opacity-100"
														height={40}
														src="https://cursor.com/deeplink/mcp-install-dark.svg"
														unoptimized
														width={200}
													/>
												</a>
											</div>
										</div>
									)}
									{selectedClient !== "mcp-url" &&
										selectedClient !== "cursor" && (
											<div className="space-y-2">
												<p className="text-[13px] leading-relaxed text-[#A1A1AA]">
													Run this command in your terminal. It installs the MCP
													for {clients[selectedKey]} and starts OAuth when
													needed.
												</p>
												<McpCodeBlock
													code={generateInstallCommand()}
													onCopy={() => {
														analytics.mcpInstallCmdCopied()
														setActiveStep(3)
													}}
												/>
											</div>
										)}
								</>
							) : (
								(() => {
									const manual = getManualInstallEntry(selectedKey)
									if (manual.kind === "chatgpt") {
										return (
											<div className="space-y-3">
												<ol className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[#A1A1AA]">
													<li>Open ChatGPT in your browser.</li>
													<li>
														Go to Settings → Apps → Advanced settings → enable
														Developer mode.
													</li>
													<li>
														Create an app and choose your MCP server URL when
														asked.
													</li>
													<li>
														Paste the URL below and complete OAuth in ChatGPT.
													</li>
												</ol>
												<McpCodeBlock
													code={CHATGPT_REMOTE_MCP_URL}
													onCopy={() => {
														analytics.mcpInstallCmdCopied()
														setActiveStep(3)
													}}
												/>
												<a
													className="inline-block text-[13px] text-[#4BA0FA] underline hover:text-[#8BC6FF]"
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
												snippetCopied={isManualCopied}
												variant="detail"
											/>
										)
									}
									if (manual.kind === "generic-remote") {
										const snippet = buildMcpUrlRemoteJson("your-api-key-here")
										return (
											<div className="space-y-3">
												<p className="text-[13px] leading-relaxed text-[#A1A1AA]">
													Add this to your client&apos;s MCP config. Replace the
													placeholder with an API key from supermemory settings
													(Integrations).
												</p>
												<McpCodeBlock
													code={snippet}
													multiline
													onCopy={() => {
														analytics.mcpInstallCmdCopied()
														setActiveStep(3)
													}}
												/>
												{detailSetup?.oneClick ? (
													<p className="text-[12px] text-[#737373]">
														Use Bearer auth in headers, or switch to One click
														setup and paste the HTTPS URL if your client
														supports OAuth only.
													</p>
												) : null}
											</div>
										)
									}
									return (
										<div className="space-y-3">
											<p className="text-[13px] leading-relaxed text-[#A1A1AA]">
												{manual.paths}
											</p>
											<p className="text-[13px] leading-relaxed text-[#A1A1AA]">
												Merge the snippet with your existing file (create it if
												needed). Restart the client and complete OAuth when
												prompted.
											</p>
											<McpCodeBlock
												code={manual.snippet}
												multiline
												onCopy={() => {
													analytics.mcpInstallCmdCopied()
													setActiveStep(3)
												}}
											/>
										</div>
									)
								})()
							)}
						</div>
					</div>

					{!isEmbedded && (
						<div className="border-t border-white/[0.06] pt-6">
							<h3
								className={cn(
									dmSansClassName(),
									"mb-3 text-[15px] font-semibold tracking-[-0.01em] text-[#FAFAFA]",
								)}
							>
								{detailSetup != null &&
								mcpClientShowsManual(detailSetup, effectiveSetupTab)
									? selectedClient === "chatgpt"
										? "Finish in ChatGPT"
										: selectedClient === "claude"
											? "Finish in Claude Desktop"
											: "Save and restart"
									: selectedClient === "cursor"
										? "Finish in Cursor"
										: "Run in terminal"}
							</h3>
							{activeStep === 3 && (
								<p
									className={cn(
										dmSansClassName(),
										"flex items-center gap-2 rounded-[10px] border border-white/[0.07] bg-[#0B0E13] p-3 text-[12px] text-[#A1A1AA]",
									)}
								>
									<SyncLogoIcon className="size-4 shrink-0 text-[#4BA0FA]" />
									{detailSetup != null &&
									mcpClientShowsManual(detailSetup, effectiveSetupTab)
										? selectedClient === "chatgpt"
											? "Complete app setup in ChatGPT, then enable it for your chat."
											: selectedClient === "claude"
												? "After Connectors, complete any prompts so supermemory is enabled for chat."
												: "Save your config, restart the client, and sign in if prompted."
										: selectedClient === "cursor"
											? "Complete the install in Cursor and sign in with OAuth if asked."
											: "Waiting for installation"}
								</p>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	)
}

interface MCPDetailViewProps {
	onBack: () => void
}

export function MCPDetailView({ onBack }: MCPDetailViewProps) {
	return (
		<div className="flex flex-1 w-full flex-col p-6 md:p-8">
			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<Button
						variant="link"
						className="h-auto self-start p-0 text-[#FAFAFA] hover:text-[#BFBFBF] hover:no-underline"
						onClick={onBack}
					>
						← Back
					</Button>
				</div>

				<div className="flex flex-1 flex-col items-center justify-start">
					<h1
						className={cn(
							"mb-1 text-2xl font-semibold tracking-[-0.02em] text-[#FAFAFA]",
							dmSansClassName(),
						)}
					>
						Connect Supermemory MCP to your AI Tools
					</h1>
					<p className={cn("mb-4 text-sm text-[#737373]", dmSansClassName())}>
						Connect Cursor, Claude, VS Code, and more via MCP.
					</p>

					<MCPSteps variant="full" />
				</div>
			</div>
		</div>
	)
}
