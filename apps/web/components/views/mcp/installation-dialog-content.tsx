import { Button } from "@ui/components/button";
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Label } from "@ui/components/label";
import { CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { $fetch } from "@repo/lib/api";
import { useQuery } from "@tanstack/react-query";

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
} as const;

interface Project {
	id: string;
	name: string;
	containerTag: string;
	createdAt: string;
	updatedAt: string;
	isExperimental?: boolean;
}

export function InstallationDialogContent() {
	const [client, setClient] = useState<keyof typeof clients>("cursor");
	const [selectedProject, setSelectedProject] = useState<string | null>("none");

	// Fetch projects
	const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const response = await $fetch("@get/projects");

			if (response.error) {
				throw new Error(response.error?.message || "Failed to load projects");
			}

			return response.data?.projects || [];
		},
		staleTime: 30 * 1000,
	});

	// Generate installation command based on selected project
	function generateInstallCommand() {
		let command = `npx -y install-mcp@latest https://api.supermemory.ai/mcp --client ${client} --oauth=yes`;

		if (selectedProject && selectedProject !== "none") {
			// Remove the "sm_project_" prefix from the containerTag
			const projectId = selectedProject.replace(/^sm_project_/, '');
			command += ` --project ${projectId}`;
		}

		return command;
	}

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Install the supermemory MCP Server</DialogTitle>
				<DialogDescription>
					Select the app and project you want to install supermemory MCP to, then run the
					following command:
				</DialogDescription>
			</DialogHeader>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="client-select">Client Application</Label>
					<Select
						onValueChange={(value) => setClient(value as keyof typeof clients)}
						value={client}
					>
						<SelectTrigger id="client-select" className="w-full">
							<SelectValue placeholder="Select client" />
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

				<div className="space-y-2">
					<Label htmlFor="project-select">Target Project (Optional)</Label>
					<Select
						onValueChange={setSelectedProject}
						value={selectedProject || "none"}
						disabled={isLoadingProjects}
					>
						<SelectTrigger id="project-select" className="w-full">
							<SelectValue placeholder="Select project" />
						</SelectTrigger>
						<SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
							<SelectItem value="none" className="text-white hover:bg-white/10">
								Auto-select project
							</SelectItem>
							<SelectItem value="sm_project_default" className="text-white hover:bg-white/10">
								Default Project
							</SelectItem>
							{projects
								.filter((p: Project) => p.containerTag !== "sm_project_default")
								.map((project: Project) => (
									<SelectItem
										key={project.id}
										value={project.containerTag}
										className="text-white hover:bg-white/10"
									>
										{project.name}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="command-input">Installation Command</Label>
					<Input
						id="command-input"
						className="font-mono text-xs!"
						readOnly
						value={generateInstallCommand()}
					/>
				</div>
			</div>

			<Button
				onClick={() => {
					const command = generateInstallCommand();
					navigator.clipboard.writeText(command);
					analytics.mcpInstallCmdCopied();
					toast.success("Copied to clipboard!");
				}}
			>
				<CopyIcon className="size-4" /> Copy Installation Command
			</Button>
		</DialogContent>
	);
}
