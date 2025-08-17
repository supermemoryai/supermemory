import { Button } from "@ui/components/button"
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog"
import { Input } from "@ui/components/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import { CopyIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { analytics } from "@/lib/analytics"

const clients = {
	cursor: "Cursor",
	claude: "Claude Desktop",
	vscode: "VSCode",
	cline: "Cline",
	"roo-cline": "Roo Cline",
	witsy: "Witsy",
	enconvo: "Enconvo",
	"gemini-cli": "Gemini CLI",
	"claude-code": "Claude Code",
} as const

export function InstallationDialogContent() {
	const [client, setClient] = useState<keyof typeof clients>("cursor")
	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Install the supermemory MCP Server</DialogTitle>
				<DialogDescription>
					Select the app you want to install supermemory MCP to, then run the
					following command:
				</DialogDescription>
			</DialogHeader>
			<div className="flex gap-2 items-center">
				<Input
					className="font-mono text-xs!"
					readOnly
					value={`npx -y install-mcp@latest https://api.supermemory.ai/mcp --client ${client} --oauth=yes`}
				/>
				<Select
					onValueChange={(value) => setClient(value as keyof typeof clients)}
					value={client}
				>
					<SelectTrigger className="w-48">
						<SelectValue placeholder="Theme" />
					</SelectTrigger>
					<SelectContent>
						{Object.entries(clients).map(([key, value]) => (
							<SelectItem key={key} value={key}>
								{value}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<Button
				onClick={() => {
					navigator.clipboard.writeText(
						`npx -y install-mcp@latest https://api.supermemory.ai/mcp --client ${client} --oauth=yes`,
					)
					analytics.mcpInstallCmdCopied()
					toast.success("Copied to clipboard!")
				}}
			>
				<CopyIcon className="size-4" /> Copy Installation Command
			</Button>
		</DialogContent>
	)
}
