"use client"

import { useState, useEffect } from "react"
import { Button } from "@ui/components/button"
import { CircleCheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { analytics } from "@/lib/analytics"

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
		toast.success("Copied to clipboard!")
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

			<div className="flex-1 flex flex-col items-center justify-start">
				<h1 className="text-white text-3xl font-medium mb-6 text-center">
					Connect your AI to supermemory MCP
				</h1>

				<div className="mb-8 space-x-4 flex max-w-2xl">
					<div className="flex items-start space-x-3">
						<CircleCheckIcon className="size-10 text-green-500" />
						<p className="text-foreground/40 text-sm">
							MCP connects your AI apps to create and use memories directly
						</p>
					</div>
					<div className="flex items-start space-x-3">
						<CircleCheckIcon className="size-10 text-green-500" />
						<p className="text-foreground/40 text-sm">
							Auto-fetch the right context from anything you've saved
						</p>
					</div>
					<div className="flex items-start space-x-3">
						<CircleCheckIcon className="size-10 text-green-500" />
						<p className="text-foreground/40 text-sm">
							One-time setup, seamless integration across your workflow
						</p>
					</div>
				</div>

				<div className="w-full max-w-2xl space-y-6">
					<div className="flex items-start space-x-4">
						<div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium flex-shrink-0">
							1
						</div>
						<div className="flex-1">
							<h3 className="text-white text-lg font-medium mb-4">
								Select your AI client
							</h3>
							<div className="flex flex-wrap gap-2 mb-4">
								{Object.entries(clients)
									.slice(0, 7)
									.map(([key, clientName]) => (
										<button
											key={key}
											type="button"
											onClick={() =>
												setSelectedClient(key as keyof typeof clients)
											}
											className={`px-3 py-2 rounded-full border-2 transition-colors duration-200 ${
												selectedClient === key
													? "border-blue-500 bg-blue-500/10"
													: "border-[#0D121A] bg-[#080B0F] hover:border-gray-600"
											}`}
										>
											<div className="flex items-center space-x-2">
												<span className="text-sm font-medium text-white">
													{clientName}
												</span>
											</div>
										</button>
									))}
							</div>
							<p className="text-gray-400 text-xs">
								*You can connect to all of these, setup is different for each
								one
							</p>
						</div>
					</div>

					<div className="flex items-start space-x-4">
						<div className="bg-gray-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium flex-shrink-0">
							2
						</div>
						<div className="flex-1">
							<h3 className="text-white text-lg font-medium mb-2">
								Copy the installation command
							</h3>
							{selectedClient ? (
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
													className="font-mono text-xs w-full pr-10 p-2 bg-black border border-gray-600 rounded text-green-400"
													readOnly
													value={generateInstallCommand()}
												/>
												<button
													type="button"
													className="absolute top-1 right-1 cursor-pointer p-1"
													onClick={copyToClipboard}
												>
													<CopyIcon className="size-4 text-gray-400 hover:text-white" />
												</button>
											</div>
											<p className="text-gray-400 text-sm">
												Copy and run this command in your terminal to install
												the MCP server.
											</p>
										</div>
									)}
								</div>
							) : (
								<p className="text-gray-400 text-sm">
									The command will be provided once you select an AI client
									above.
								</p>
							)}
						</div>
					</div>

					<div className="flex items-start space-x-4">
						<div className="bg-gray-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium flex-shrink-0">
							3
						</div>
						<div className="flex-1">
							<h3 className="text-white text-lg font-medium mb-2">
								Run command in your terminal
							</h3>
							<p className="text-gray-400 text-sm">
								Execute the copied command in your terminal to complete the
								setup.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
