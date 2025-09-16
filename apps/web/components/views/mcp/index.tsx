import { $fetch } from "@lib/api"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { useForm } from "@tanstack/react-form"
import { useMutation } from "@tanstack/react-query"
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
import { CopyableCell } from "@ui/copyable-cell"
import { Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import Image from "next/image"
import { generateSlug } from "random-word-slugs"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { z } from "zod/v4"
import { analytics } from "@/lib/analytics"
import { InstallationDialogContent } from "./installation-dialog-content"

// Validation schemas
const mcpMigrationSchema = z.object({
	url: z
		.string()
		.min(1, "MCP Link is required")
		.regex(
			/^https:\/\/mcp\.supermemory\.ai\/[^/]+\/sse$/,
			"Link must be in format: https://mcp.supermemory.ai/userId/sse",
		),
})

export function MCPView() {
	const [isMigrateDialogOpen, setIsMigrateDialogOpen] = useState(false)
	const projectId = localStorage.getItem("selectedProject") ?? "default"
	const { org } = useAuth()
	const [apiKey, setApiKey] = useState<string>()
	const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false)

	useEffect(() => {
		analytics.mcpViewOpened()
	}, [])
	const apiKeyMutation = useMutation({
		mutationFn: async () => {
			if (apiKey) return apiKey
			const res = await authClient.apiKey.create({
				metadata: {
					organizationId: org?.id,
				},
				name: generateSlug(),
				prefix: `sm_${org?.id}_`,
			})
			return res.key
		},
		onSuccess: (data) => {
			setApiKey(data)
			setIsInstallDialogOpen(true)
		},
	})

	// Form for MCP migration
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

	// Migrate MCP mutation
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

	return (
		<div className="space-y-6">
			<div>
				<p className="text-sm text-white/70">
					Use MCP to create and access memories directly from your AI assistant.
					Integrate supermemory with Claude Desktop, Cursor, and other AI tools.
				</p>
			</div>

			<div className="space-y-4">
				<div>
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
						Use this URL to configure supermemory in your AI assistant
					</p>
				</div>

				<div className="flex items-center gap-4">
					<Dialog
						onOpenChange={setIsInstallDialogOpen}
						open={isInstallDialogOpen}
					>
						<DialogTrigger asChild>
							<Button
								disabled={apiKeyMutation.isPending}
								onClick={(e) => {
									e.preventDefault()
									e.stopPropagation()
									apiKeyMutation.mutate()
								}}
							>
								Install Now
							</Button>
						</DialogTrigger>
						{apiKey && <InstallationDialogContent />}
					</Dialog>
					<motion.a
						className="inline-block"
						href="https://cursor.com/install-mcp?name=supermemory&config=JTdCJTIydXJsJTIyJTNBJTIyaHR0cHMlM0ElMkYlMkZhcGkuc3VwZXJtZW1vcnkuYWklMkZtY3AlMjIlN0Q%3D"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<Image
							alt="Add supermemory MCP server to Cursor"
							height="32"
							src="https://cursor.com/deeplink/mcp-install-dark.svg"
							width="128"
						/>
					</motion.a>

					<div className="h-8 w-px bg-white/10" />

					<motion.div whileTap={{ scale: 0.95 }}>
						<Button
							className="bg-white/5 hover:bg-white/10 border-white/10 text-white h-8"
							onClick={() => setIsMigrateDialogOpen(true)}
							size="sm"
							variant="outline"
						>
							Migrate from v1
						</Button>
					</motion.div>
				</div>
			</div>
			<AnimatePresence>
				{isMigrateDialogOpen && (
					<Dialog
						onOpenChange={setIsMigrateDialogOpen}
						open={isMigrateDialogOpen}
					>
						<DialogContent className="sm:max-w-2xl bg-black/90 backdrop-blur-xl border-white/10 text-white">
							<motion.div
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								initial={{ opacity: 0, scale: 0.95 }}
							>
								<DialogHeader>
									<DialogTitle>Migrate from MCP v1</DialogTitle>
									<DialogDescription className="text-white/60">
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
										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className="flex flex-col gap-2"
											initial={{ opacity: 0, y: 10 }}
											transition={{ delay: 0.1 }}
										>
											<label className="text-sm font-medium" htmlFor="mcpUrl">
												MCP Link
											</label>
											<mcpMigrationForm.Field name="url">
												{({ state, handleChange, handleBlur }) => (
													<>
														<Input
															className="bg-white/5 border-white/10 text-white"
															id="mcpUrl"
															onBlur={handleBlur}
															onChange={(e) => handleChange(e.target.value)}
															placeholder="https://mcp.supermemory.ai/your-user-id/sse"
															value={state.value}
														/>
														{state.meta.errors.length > 0 && (
															<motion.p
																animate={{ opacity: 1, height: "auto" }}
																className="text-sm text-red-400 mt-1"
																exit={{ opacity: 0, height: 0 }}
																initial={{ opacity: 0, height: 0 }}
															>
																{state.meta.errors.join(", ")}
															</motion.p>
														)}
													</>
												)}
											</mcpMigrationForm.Field>
											<p className="text-xs text-white/50">
												Enter your old MCP Link in the format: <br />
												<span className="font-mono">
													https://mcp.supermemory.ai/userId/sse
												</span>
											</p>
										</motion.div>
									</div>
									<div className="flex justify-end gap-3 mt-4">
										<motion.div
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
										>
											<Button
												className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
												onClick={() => {
													setIsMigrateDialogOpen(false)
													mcpMigrationForm.reset()
												}}
												type="button"
												variant="outline"
											>
												Cancel
											</Button>
										</motion.div>
										<motion.div
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
										>
											<Button
												className="bg-white/10 hover:bg-white/20 text-white border-white/20"
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
										</motion.div>
									</div>
								</form>
							</motion.div>
						</DialogContent>
					</Dialog>
				)}
			</AnimatePresence>
		</div>
	)
}
