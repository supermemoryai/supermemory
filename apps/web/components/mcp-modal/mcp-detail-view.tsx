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
				"size-10 shrink-0 rounded-[10px] bg-[#0D121A] border border-[#242A33] flex items-center justify-center overflow-hidden",
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
	const [isCommandCopied, setIsCommandCopied] = useState(false)
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

	const copyToClipboard = () => {
		const command = generateInstallCommand()
		navigator.clipboard.writeText(command)
		analytics.mcpInstallCmdCopied()
		setIsCommandCopied(true)
		setActiveStep(3)
		setTimeout(() => setIsCommandCopied(false), 2000)
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

	const gradientStep3 =
		activeStep === 3
			? {
					background:
						"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
					backgroundClip: "text",
					WebkitBackgroundClip: "text",
					WebkitTextFillColor: "transparent",
				}
			: undefined

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
								rowIndex > 0 && "border-t border-[#242A33]",
							)}
						>
							<div className="w-full shrink-0 sm:w-30">
								<p className="text-[13px] font-semibold tracking-[-0.01em] text-[#8B8B8B]">
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
											"group flex w-full min-w-0 items-center gap-3 rounded-xl border border-[#242A33] bg-[#080B0F] p-3.5 text-left transition-colors",
											"hover:border-[#3273FC4D] hover:bg-[#08142D]",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3273FC]/40",
										)}
									>
										<ClientToolIcon clientKey={item.key} title={item.title} />
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium text-[#FAFAFA]">
												{item.title}
											</p>
											<p className="text-xs text-[#737373]">{item.subtitle}</p>
										</div>
										<ChevronRight
											className="size-4 shrink-0 text-[#525866] transition-transform group-hover:translate-x-0.5"
											aria-hidden
										/>
									</button>
								))}
							</div>
						</div>
					))}
					<p className="pt-1 text-sm text-[#8B8B8B]">
						You can connect several clients; setup is different for each one.
					</p>
				</div>
			) : (
				<div className={cn("space-y-4", dmSansClassName())}>
					<button
						type="button"
						onClick={() => {
							setSelectedClient(null)
							setActiveStep(1)
						}}
						className="text-sm font-medium text-[#8B8B8B] transition-colors hover:text-[#FAFAFA]"
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

					<div className="space-y-4 border-t border-[#242A33] pt-8">
						{detailSetup && mcpClientSetupShowsTabs(detailSetup) ? (
							<div
								className="flex w-full max-w-md flex-row gap-1 rounded-full border border-[#3D434D] bg-[#0D121A] p-1"
								role="tablist"
								aria-label="Setup method"
							>
								<button
									className={cn(
										"min-h-9 flex-1 rounded-full px-3 py-2 text-center text-xs font-medium transition-all",
										effectiveSetupTab === "manual"
											? "border border-[#3D434D] bg-[#080B0F] text-white"
											: "text-[#8B8B8B] hover:text-white",
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
											? "border border-[#3D434D] bg-[#080B0F] text-white"
											: "text-[#8B8B8B] hover:text-white",
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
											<p className="text-sm text-[#8B8B8B]">
												Paste this URL into any MCP client that supports remote
												servers over HTTPS.
											</p>
											<div className="relative">
												<input
													className={cn(
														"w-full rounded-lg border border-[#3D434D] bg-black p-2 pr-10 font-mono text-xs text-emerald-400",
														dmMonoClassName(),
													)}
													readOnly
													value="https://mcp.supermemory.ai/mcp"
												/>
												<button
													type="button"
													className="absolute top-1 right-1 cursor-pointer p-1"
													onClick={() => {
														navigator.clipboard.writeText(
															"https://mcp.supermemory.ai/mcp",
														)
														analytics.mcpInstallCmdCopied()
														toast.success("Copied to clipboard!")
														setActiveStep(3)
													}}
												>
													<CopyIcon className="size-4 text-[#8B8B8B] hover:text-white" />
												</button>
											</div>
										</div>
									)}
									{selectedClient === "cursor" && (
										<div className="space-y-4">
											<p className="text-sm text-[#8B8B8B]">
												Open the link below to add supermemory in Cursor, or use
												Manual instructions to edit{" "}
												<code className="text-xs text-emerald-400/90">
													~/.cursor/mcp.json
												</code>
												.
											</p>
											<div className="flex flex-col items-center gap-4 rounded-xl border border-[#1e3a2f] bg-[#0a1510] p-6">
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
												<p className="text-sm text-[#8B8B8B]">
													Run this command in your terminal. It installs the MCP
													for {clients[selectedKey]} and starts OAuth when
													needed.
												</p>
												<div className="relative">
													<input
														className={cn(
															"w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-xl py-4 pr-28 pl-3 text-xs text-white",
															dmMonoClassName(),
														)}
														style={{
															border: "1px solid rgba(61, 67, 77, 0.10)",
															background: "#0D121A",
														}}
														readOnly
														value={generateInstallCommand()}
													/>
													<button
														type="button"
														className={cn(
															"absolute top-[5px] right-1 flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2",
															dmSansClassName(),
														)}
														style={{
															background:
																"linear-gradient(180deg, #267BF1 40.23%, #15468B 100%), linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
															border: "1px solid #000",
														}}
														onClick={copyToClipboard}
													>
														{isCommandCopied ? (
															<>
																<Check className="size-4 text-white" />
																<span className="text-white">Copied</span>
															</>
														) : (
															<>
																<CopyIcon className="size-5 text-white stroke-[2px]" />
																<span className="text-white">Copy</span>
															</>
														)}
													</button>
												</div>
											</div>
										)}
								</>
							) : (
								(() => {
									const manual = getManualInstallEntry(selectedKey)
									if (manual.kind === "chatgpt") {
										return (
											<div className="space-y-3">
												<ol className="list-decimal space-y-2 pl-5 text-sm text-[#8B8B8B]">
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
												<div className="relative">
													<input
														className={cn(
															"w-full rounded-lg border border-[#3D434D] bg-black p-2 pr-10 font-mono text-xs text-emerald-400",
															dmMonoClassName(),
														)}
														readOnly
														value={CHATGPT_REMOTE_MCP_URL}
													/>
													<button
														type="button"
														className="absolute top-1 right-1 cursor-pointer p-1"
														onClick={() =>
															copyManualSnippet(CHATGPT_REMOTE_MCP_URL)
														}
													>
														<CopyIcon className="size-4 text-[#8B8B8B] hover:text-white" />
													</button>
												</div>
												<a
													className="inline-block text-sm text-[#4BA0FA] underline hover:text-[#6BB8FF]"
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
												<p className="text-sm text-[#8B8B8B]">
													Add this to your client&apos;s MCP config. Replace the
													placeholder with an API key from supermemory settings
													(Integrations).
												</p>
												<div className="relative">
													<pre className="max-w-full overflow-x-auto rounded-lg border border-[#3D434D] bg-black p-4 pr-12 text-xs">
														<code
															className={cn(
																"block font-mono whitespace-pre-wrap break-all text-emerald-400",
																dmMonoClassName(),
															)}
														>
															{snippet}
														</code>
													</pre>
													<button
														type="button"
														className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded bg-[#0D121A] hover:bg-[#1a1a1a]"
														onClick={() => copyManualSnippet(snippet)}
													>
														{isManualCopied ? (
															<span className="text-emerald-500">✓</span>
														) : (
															<CopyIcon className="size-3.5" />
														)}
													</button>
												</div>
												{detailSetup?.oneClick ? (
													<p className="text-xs text-[#737373]">
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
											<p className="text-sm text-[#8B8B8B]">{manual.paths}</p>
											<p className="text-sm text-[#8B8B8B]">
												Merge the snippet with your existing file (create it if
												needed). Restart the client and complete OAuth when
												prompted.
											</p>
											<div className="relative">
												<pre className="max-w-full overflow-x-auto rounded-lg border border-[#3D434D] bg-black p-4 pr-12 text-xs">
													<code
														className={cn(
															"block font-mono whitespace-pre-wrap break-all text-emerald-400",
															dmMonoClassName(),
														)}
													>
														{manual.snippet}
													</code>
												</pre>
												<button
													type="button"
													className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded bg-[#0D121A] hover:bg-[#1a1a1a]"
													onClick={() => copyManualSnippet(manual.snippet)}
												>
													{isManualCopied ? (
														<span className="text-emerald-500">✓</span>
													) : (
														<CopyIcon className="size-3.5" />
													)}
												</button>
											</div>
										</div>
									)
								})()
							)}
						</div>
					</div>

					<div className="border-t border-[#242A33] pt-8">
						<h3
							className="mb-4 text-lg font-medium text-white"
							style={gradientStep3}
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
									"flex items-center gap-2 rounded-xl p-4 pl-3 font-mono text-xs text-white",
									dmMonoClassName(),
								)}
								style={{
									border: "1px solid rgba(61, 67, 77, 0.10)",
									background: "#0D121A",
								}}
							>
								<SyncLogoIcon className="size-4" />
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
