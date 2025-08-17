"use client"

import { useIsMobile } from "@hooks/use-mobile"
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
import { CopyIcon, ExternalLink } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"

const clients = {
	cursor: "Cursor",
	claude: "Claude Desktop",
	vscode: "VSCode",
	cline: "Cline",
	"gemini-cli": "Gemini CLI",
	"claude-code": "Claude Code",
	"roo-cline": "Roo Cline",
	witsy: "Witsy",
	enconvo: "Enconvo",
} as const

interface ConnectAIModalProps {
	children: React.ReactNode
}

export function ConnectAIModal({ children }: ConnectAIModalProps) {
	const [client, setClient] = useState<keyof typeof clients>("cursor")
	const [isOpen, setIsOpen] = useState(false)
	const [showAllTools, setShowAllTools] = useState(false)
    const isMobile = useIsMobile()
	const installCommand = `npx -y install-mcp@latest https://api.supermemory.ai/mcp --client ${client} --oauth=yes`

	const copyToClipboard = () => {
		navigator.clipboard.writeText(installCommand)
		toast.success("Copied to clipboard!")
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-4xl">
				<DialogHeader>
					<DialogTitle>Connect Supermemory to Your AI</DialogTitle>
					<DialogDescription>
						Connect supermemory to your favorite AI tools using the Model Context Protocol (MCP). 
						This allows your AI assistant to create, search, and access your memories directly.
					</DialogDescription>
				</DialogHeader>

                <div className="mb-6 block md:hidden">
					<label
						className="text-sm font-medium text-white/80 block mb-2"
						htmlFor="mcp-server-url"
					>
						MCP Server URL
					</label>
					<div className="p-3 bg-white/5 rounded border border-white/10">
						<CopyableCell
							className="font-mono text-sm text-blue-400"
							value="https://api.supermemory.ai/mcp"
						/>
					</div>
					<p className="text-xs text-white/50 mt-2">
						Click URL to copy to clipboard. Use this URL to configure supermemory in your AI assistant.
					</p>
				</div>
				
				<div className="space-y-6">
					<div className="hidden md:block">
						<h3 className="text-sm font-medium mb-3">Supported AI Tools</h3>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
							{Object.entries(clients)
								.slice(0, showAllTools ? undefined : isMobile ? 4 : 6)
								.map(([key, clientName]) => (
									<div
										key={clientName}
										className="flex items-center gap-3 px-3 py-3 bg-muted rounded-md"
									>
										<div className="w-8 h-8 relative flex-shrink-0 flex items-center justify-center">
											<Image
												src={`/mcp-supported-tools/${key == "claude-code" ? "claude" : key}.png`}
												alt={clientName}
												width={isMobile ? 20 : 32}
												height={isMobile ? 20 : 32}
												className={"rounded object-contain"}
												onError={(e) => {
													const target = e.target as HTMLImageElement;
													target.style.display = 'none';
													const parent = target.parentElement;
													if (parent && !parent.querySelector('.fallback-text')) {
														const fallback = document.createElement('span');
														fallback.className = 'fallback-text text-xs font-bold text-muted-foreground';
														fallback.textContent = clientName.substring(0, 2).toUpperCase();
														parent.appendChild(fallback);
													}
												}}
											/>
										</div>
										<span className="text-sm font-medium">{clientName}</span>
									</div>
								))}
						</div>
						{Object.entries(clients).length > 6 && (
							<div className="mt-3 text-center">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setShowAllTools(!showAllTools)}
									className="text-xs text-muted-foreground hover:text-foreground"
								>
									{showAllTools ? "Show Less" : `Show All`}
								</Button>
							</div>
						)}
					</div>

					<div className="hidden md:block">
						<h3 className="text-sm font-medium mb-3">Quick Installation</h3>
						<div className="space-y-3 flex gap-2 items-center justify-between">
							<Select
								value={client}
								onValueChange={(value) => setClient(value as keyof typeof clients)}
							>
								<SelectTrigger className="w-48 mb-0">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(clients).map(([key, value]) => (
										<SelectItem key={key} value={key}>
											<div className="flex items-center gap-2">
												<div className="w-4 h-4 relative flex-shrink-0 flex items-center justify-center">
													<Image
														src={`/mcp-supported-tools/${key == "claude-code" ? "claude" : key}.png`}
														alt={value}
														width={16}
														height={16}
														className="rounded object-contain"
														onError={(e) => {
															const target = e.target as HTMLImageElement;
															target.style.display = 'none';
															const parent = target.parentElement;
															if (parent && !parent.querySelector('.fallback-text')) {
																const fallback = document.createElement('span');
																fallback.className = 'fallback-text text-xs font-bold text-muted-foreground';
																fallback.textContent = value.substring(0, 1).toUpperCase();
																parent.appendChild(fallback);
															}
														}}
													/>
												</div>
												{value}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							
                            <div className="relative w-full flex items-center">
                                <Input
                                className="font-mono text-xs w-full pr-10"
                                readOnly
                                value={installCommand}
                                />
                            
                                <Button
                                    onClick={copyToClipboard}
                                    className="absolute right-0 cursor-pointer"
                                    variant="ghost"
                                >
                                    <CopyIcon className="size-4" />
                                </Button>
                            </div>
						</div>
					</div>

					<div>
						<h3 className="text-sm font-medium mb-3">What You Can Do</h3>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>• Ask your AI to save important information as memories</li>
							<li>• Search through your saved memories during conversations</li>
							<li>• Get contextual information from your knowledge base</li>
							<li>• Seamlessly integrate with your existing AI workflow</li>
						</ul>
					</div>

					<div className="flex justify-between items-center pt-4 border-t">
						<Button
							variant="outline"
							onClick={() => window.open("https://docs.supermemory.ai/supermemory-mcp/introduction", "_blank")}
						>
							<ExternalLink className="w-4 h-4 mr-2" />
							Learn More
						</Button>
						<Button onClick={() => setIsOpen(false)}>
							Done
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
