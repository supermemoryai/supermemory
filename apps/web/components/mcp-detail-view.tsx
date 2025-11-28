"use client"

import { useState, useEffect } from "react"
import { Button } from "@ui/components/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import { CircleCheckIcon, CopyIcon, Check } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { analytics } from "@/lib/analytics"
import { cn } from "@lib/utils"
import { dmMonoClassName, dmSansClassName } from "@/utils/fonts"
import { SyncLogoIcon } from "@ui/assets/icons"

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

interface MCPDetailViewProps {
	onBack: () => void
}

export function MCPDetailView({ onBack }: MCPDetailViewProps) {
	const [selectedClient, setSelectedClient] = useState<
		keyof typeof clients | null
	>(null)
	const [selectedProject] = useState<string>("sm_project_default")
	const [mcpUrlTab, setMcpUrlTab] = useState<"oneClick" | "manual">("oneClick")
	const [isCopied, setIsCopied] = useState(false)
	const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1)

	useEffect(() => {
		analytics.mcpViewOpened()
	}, [])

	function generateInstallCommand() {
		if (!selectedClient) return ""

		let command = `npx -y install-mcp@latest https://api.supermemory.ai/mcp --client ${selectedClient} --oauth=yes`

		const projectIdForCommand = selectedProject.replace(/^sm_project_/, "")
		command += ` --project ${projectIdForCommand}`

		return command
	}

	const copyToClipboard = () => {
		const command = generateInstallCommand()
		navigator.clipboard.writeText(command)
		analytics.mcpInstallCmdCopied()
		setIsCopied(true)
		setActiveStep(3)
		setTimeout(() => setIsCopied(false), 2000)
	}

	return (
		<div className="flex flex-col h-full p-8">
			<div className="mb-6">
				<Button
					variant="link"
					className="text-white hover:text-gray-300 p-0"
					onClick={onBack}
				>
					← Back
				</Button>
			</div>

			<div className="flex-1 flex flex-col items-start justify-start">
				<h1 className="text-white text-3xl font-medium mb-6 text-start">
					Connect your AI to supermemory MCP
				</h1>

				<div className="mb-8 space-x-4 flex max-w-2xl">
					<div
						className={cn(
							"flex items-start space-x-3 w-[200px]",
							dmSansClassName(),
						)}
					>
						<CircleCheckIcon className="size-4 text-green-500 flex-shrink-0 mt-0.5" />
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
						<CircleCheckIcon className="size-4 text-green-500 flex-shrink-0 mt-0.5" />
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
						<CircleCheckIcon className="size-4 text-green-500 flex-shrink-0 mt-0.5" />
						<p className="text-[#8B8B8B] text-sm">
							One-time setup, seamless integration across your workflow
						</p>
					</div>
				</div>

				<div className="w-full max-w-2xl relative">
					<div
						className="absolute left-4 top-0 w-[1px] bg-[#1E293B] z-10"
						style={{ height: activeStep === 3 ? "calc(100% - 4rem)" : "100%" }}
					/>
					<div className="flex items-start space-x-4 z-20">
						<div
							className={cn(
								"rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium flex-shrink-0 z-20 bg-[#161F2B] text-white",
							)}
						>
							<span
								style={
									activeStep === 1
										? {
												background:
													"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
												backgroundClip: "text",
												WebkitBackgroundClip: "text",
												WebkitTextFillColor: "transparent",
											}
										: undefined
								}
							>
								1
							</span>
						</div>
						<div className="flex-1 mb-4">
							<div className="flex gap-4 mb-4">
								<h3
									className="text-white text-lg font-medium"
									style={
										activeStep === 1
											? {
													background:
														"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
													backgroundClip: "text",
													WebkitBackgroundClip: "text",
													WebkitTextFillColor: "transparent",
												}
											: undefined
									}
								>
									Select your AI client
								</h3>
								{selectedClient && (
									<Select
										onValueChange={(value) => {
											setSelectedClient(value as keyof typeof clients)
											setActiveStep(2)
										}}
										value={selectedClient || undefined}
									>
										<SelectTrigger
											className="max-w-md rounded-full border-[#242A33] text-white hover:border-gray-600 !bg-transparent"
											style={{
												background:
													"linear-gradient(0deg, #0A0E14 0%, #080B0F 100%)",
											}}
										>
											{selectedClient ? (
												<div className="flex items-center gap-2">
													<Image
														alt={clients[selectedClient]}
														height={20}
														width={20}
														unoptimized
														src={
															selectedClient === "mcp-url"
																? "/mcp-icon.svg"
																: `/mcp-supported-tools/${selectedClient === "claude-code" ? "claude" : selectedClient}.png`
														}
													/>
													<span>{clients[selectedClient]}</span>
												</div>
											) : (
												<SelectValue placeholder="Select a client" />
											)}
										</SelectTrigger>
										<SelectContent className="bg-black border-none">
											{Object.entries(clients)
												.slice(0, 7)
												.map(([key, clientName]) => (
													<SelectItem
														key={key}
														value={key}
														className="text-white hover:bg-[#080B0F]"
													>
														<div className="flex items-center gap-2">
															<Image
																alt={clientName}
																height={20}
																width={20}
																unoptimized
																src={
																	key === "mcp-url"
																		? "/mcp-icon.svg"
																		: `/mcp-supported-tools/${key === "claude-code" ? "claude" : key}.png`
																}
															/>
															<span>{clientName}</span>
														</div>
													</SelectItem>
												))}
										</SelectContent>
									</Select>
								)}
							</div>
							<div
								className={cn(
									"flex flex-wrap gap-2 mb-4",
									selectedClient ? "hidden" : "",
								)}
							>
								{Object.entries(clients)
									.slice(0, 7)
									.map(([key, clientName]) => (
										<button
											key={key}
											type="button"
											onClick={() => {
												setSelectedClient(key as keyof typeof clients)
												setActiveStep(2)
											}}
											className={`mcp-client-button-group px-3 py-1 rounded-full border-1 transition-colors cursor-pointer duration-200 ${
												selectedClient === key
													? "border-blue-500 bg-blue-500/10"
													: "border-[#242A33] bg-[#080B0F] hover:border-[#3273FC4D] hover:bg-[#08142D]"
											}`}
										>
											<div className="flex items-center space-x-2">
												<div className="w-5 h-5 flex items-center justify-center">
													<Image
														alt={clientName}
														unoptimized
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
																	"fallback-text text-xs font-bold text-white"
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
												<span className="mcp-client-gradient-text text-sm font-medium text-white">
													{clientName}
												</span>
											</div>
										</button>
									))}
							</div>
							{!selectedClient && (
								<p
									className={cn(
										"text-[#8B8B8B] text-[14px]",
										dmSansClassName(),
									)}
								>
									*You can connect to all of these, setup is different for each
									one
								</p>
							)}
						</div>
					</div>

					<div className="flex items-start space-x-4">
						<div
							className={cn(
								"rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium flex-shrink-0 z-20 text-white bg-[#161F2B]",
								"",
							)}
						>
							<span
								style={
									activeStep === 2
										? {
												background:
													"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
												backgroundClip: "text",
												WebkitBackgroundClip: "text",
												WebkitTextFillColor: "transparent",
											}
										: undefined
								}
							>
								2
							</span>
						</div>
						<div className="flex-1 mb-4">
							<h3
								className="text-white text-lg font-medium mb-4"
								style={
									activeStep === 2
										? {
												background:
													"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
												backgroundClip: "text",
												WebkitBackgroundClip: "text",
												WebkitTextFillColor: "transparent",
											}
										: undefined
								}
							>
								Copy the installation command
							</h3>
							{selectedClient && (
								<div className="space-y-3">
									{selectedClient === "mcp-url" ? (
										<div className="space-y-4">
											<div className="flex justify-end">
												<div className="flex bg-[#0D121A] rounded-full p-1 border border-gray-600">
													<button
														className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
															mcpUrlTab === "oneClick"
																? "bg-[#080B0F] text-white border border-gray-600"
																: "text-gray-400 hover:text-white"
														}`}
														onClick={() => setMcpUrlTab("oneClick")}
														type="button"
													>
														Quick Setup
													</button>
													<button
														className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
															mcpUrlTab === "manual"
																? "bg-[#080B0F] text-white border border-gray-600"
																: "text-gray-400 hover:text-white"
														}`}
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
														Use this URL to quickly configure supermemory in
														your AI assistant
													</p>
													<div className="relative">
														<input
															className="font-mono text-xs w-full pr-10 p-2 bg-black border border-gray-600 rounded text-green-400"
															readOnly
															value="https://api.supermemory.ai/mcp"
														/>
														<button
															type="button"
															className="absolute top-1 right-1 cursor-pointer p-1"
															onClick={() => {
																navigator.clipboard.writeText(
																	"https://api.supermemory.ai/mcp",
																)
																analytics.mcpInstallCmdCopied()
																toast.success("Copied to clipboard!")
																setActiveStep(3)
															}}
														>
															<CopyIcon className="size-4 text-gray-400 hover:text-white" />
														</button>
													</div>
												</div>
											) : (
												<div className="space-y-3">
													<p className="text-sm text-gray-400">
														Add this configuration to your MCP settings file
														with authentication
													</p>
													<div className="relative">
														<pre className="bg-black border border-gray-600 rounded-lg p-4 pr-12 text-xs overflow-x-auto max-w-full">
															<code className="font-mono block whitespace-pre-wrap break-all text-green-400">
																{`{
  "supermemory-mcp": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://api.supermemory.ai/mcp"],
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
															className="absolute top-2 right-2 cursor-pointer h-8 w-8 p-0 bg-[#0D121A] hover:bg-[#1a1a1a] rounded"
															onClick={() => {
																const config = `{
  "supermemory-mcp": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://api.supermemory.ai/mcp"],
    "env": {},
    "headers": {
      "Authorization": "Bearer your-api-key-here"
    }
  }
}`
																navigator.clipboard.writeText(config)
																analytics.mcpInstallCmdCopied()
																toast.success("Copied to clipboard!")
																setIsCopied(true)
																setActiveStep(3)
																setTimeout(() => setIsCopied(false), 2000)
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
														The API key is included as a Bearer token in the
														Authorization header
													</p>
												</div>
											)}
										</div>
									) : (
										<div className="space-y-3">
											<div className="relative">
												<input
													className="font-mono text-xs w-full pr-10 p-4 px-2 bg-[#0D121A] rounded-xl text-white pl-3"
													style={{
														border: "1px solid rgba(61, 67, 77, 0.10)",
													}}
													readOnly
													value={generateInstallCommand()}
												/>
												<button
													type="button"
													className={cn(
														"absolute top-1.5 right-1 cursor-pointer p-1 flex items-center rounded-[10px] px-3 py-2 gap-2",
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
															<CopyIcon className="size-3 text-white" />
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

					<div className="flex items-start space-x-4">
						<div
							className={cn(
								"rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium flex-shrink-0 z-20",
								"bg-[#161F2B] text-white",
							)}
						>
							<span
								style={
									activeStep === 3
										? {
												background:
													"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
												backgroundClip: "text",
												WebkitBackgroundClip: "text",
												WebkitTextFillColor: "transparent",
											}
										: undefined
								}
							>
								3
							</span>
						</div>
						<div className="flex-1 space-y-4">
							<h3
								className="text-white text-lg font-medium"
								style={
									activeStep === 3
										? {
												background:
													"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
												backgroundClip: "text",
												WebkitBackgroundClip: "text",
												WebkitTextFillColor: "transparent",
											}
										: undefined
								}
							>
								Run command in your terminal
							</h3>
							{activeStep === 3 && (
								<p
									className={cn(
										"font-mono text-xs w-full pr-10 p-4 px-2 bg-[#0D121A] rounded-xl text-white pl-3 flex items-center gap-2",
										dmMonoClassName(),
									)}
									style={{
										border: "1px solid rgba(61, 67, 77, 0.10)",
									}}
								>
									<SyncLogoIcon className="size-4" />
									Waiting for installation
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
