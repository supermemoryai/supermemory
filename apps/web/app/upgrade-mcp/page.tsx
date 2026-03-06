"use client"

import { $fetch } from "@lib/api"
import { useSession } from "@lib/auth"
import { useMutation } from "@tanstack/react-query"
import { Logo, LogoFull } from "@ui/assets/Logo"
import { Button } from "@ui/components/button"
import { Input } from "@ui/components/input"
import { GlassMenuEffect } from "@ui/other/glass-effect"
import { ArrowRight, CheckCircle, Upload, Zap } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Spinner } from "@/components/spinner"

interface MigrateMCPRequest {
	userId: string
	projectId: string
}

interface MigrateMCPResponse {
	success: boolean
	migratedCount: number
	message: string
	documentIds?: string[]
}

export default function MigrateMCPPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [mcpUrl, setMcpUrl] = useState("")
	const [projectId, setProjectId] = useState("default")

	const session = useSession()

	// Extract MCP URL from query parameter
	useEffect(() => {
		const urlParam = searchParams.get("url")
		if (urlParam) {
			setMcpUrl(urlParam)
		}
	}, [searchParams])

	useEffect(() => {
		console.log("session", session)
		if (!session.isPending && !session.data) {
			const redirectUrl = new URL("/login", window.location.href)
			redirectUrl.searchParams.set("redirect", window.location.href)
			router.push(redirectUrl.toString())
			return
		}
	}, [session, router])

	// Extract userId from MCP URL
	const getUserIdFromUrl = (url: string) => {
		return url.split("/").at(-2) || ""
	}

	const migrateMutation = useMutation({
		mutationFn: async (data: MigrateMCPRequest) => {
			const response = await $fetch("@post/documents/migrate-mcp", {
				body: data,
			})

			if (response.error) {
				throw new Error(
					response.error?.message || "Failed to migrate documents",
				)
			}

			return response.data
		},
		onSuccess: (data: MigrateMCPResponse) => {
			toast.success("Migration completed successfully", {
				description: data.message,
			})
			// Redirect to home page after successful migration
			setTimeout(() => {
				router.push("/?open=mcp")
			}, 2000) // Wait 2 seconds to show the success message
		},
		onError: (error: Error) => {
			toast.error("Migration failed", {
				description: error.message || "An unexpected error occurred",
			})
		},
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const userId = getUserIdFromUrl(mcpUrl)
		if (!userId) {
			toast.error("Please enter a valid MCP URL")
			return
		}

		migrateMutation.mutate({
			userId,
			projectId: projectId.trim() || "default",
		})
	}

	return (
		<div className="min-h-screen bg-[#0f1419] overflow-hidden relative">
			{/* Background elements */}
			<div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-purple-900/10" />

			{/* Top navigation */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="absolute top-0 left-0 right-0 z-10 p-6 flex items-center justify-between"
				initial={{ opacity: 0, y: -20 }}
			>
				<Link
					className="pointer-events-auto hover:opacity-80 transition-opacity"
					href="/"
				>
					<LogoFull className="h-8 hidden md:block text-white" />
					<Logo className="h-8 md:hidden text-white" />
				</Link>
			</motion.div>

			{/* Main content */}
			<div className="flex items-center justify-center min-h-screen p-4 relative z-10">
				<motion.div
					animate={{ opacity: 1, y: 0, scale: 1 }}
					className="w-full max-w-lg relative"
					initial={{ opacity: 0, y: 20, scale: 0.95 }}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 25,
						delay: 0.1,
					}}
				>
					{/* Glass card with effect */}
					<div className="relative rounded-2xl overflow-hidden">
						<GlassMenuEffect rounded="rounded-2xl" />

						<div className="relative z-10 p-8 md:p-10">
							{/* Header */}
							<motion.div
								animate={{ opacity: 1, y: 0 }}
								className="text-center mb-8"
								initial={{ opacity: 0, y: 10 }}
								transition={{ delay: 0.2 }}
							>
								<div className="flex items-center justify-center mb-4">
									<div className="relative">
										<div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl" />
										<div className="relative bg-blue-500/10 p-3 rounded-full border border-blue-500/20">
											<Zap className="w-6 h-6 text-blue-400" />
										</div>
									</div>
								</div>
								<h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
									Upgrade supermemory MCP
								</h1>
								<p className="text-slate-400 text-sm md:text-base">
									Migrate your documents to the new MCP server
								</p>
							</motion.div>

							{/* Form */}
							<motion.form
								animate={{ opacity: 1, y: 0 }}
								className="space-y-6"
								initial={{ opacity: 0, y: 20 }}
								onSubmit={handleSubmit}
								transition={{ delay: 0.3 }}
							>
								<div className="space-y-2">
									<label
										className="text-sm font-medium text-slate-200 flex items-center gap-2"
										htmlFor="mcpUrl"
									>
										<Upload className="w-4 h-4" />
										MCP URL
									</label>
									<div className="relative">
										<Input
											className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all duration-200 pl-4 pr-4 py-3 rounded-xl"
											disabled={migrateMutation.isPending}
											id="mcpUrl"
											onChange={(e) => setMcpUrl(e.target.value)}
											placeholder="https://mcp.supermemory.ai/userId/sse"
											type="url"
											value={mcpUrl}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<label
										className="text-sm font-medium text-slate-200"
										htmlFor="projectId"
									>
										Project ID
									</label>
									<div className="relative">
										<Input
											className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all duration-200 pl-4 pr-4 py-3 rounded-xl"
											disabled={migrateMutation.isPending}
											id="projectId"
											onChange={(e) => setProjectId(e.target.value)}
											placeholder="Project ID (default: 'default')"
											type="text"
											value={projectId}
										/>
									</div>
								</div>

								<motion.div
									whileHover={{ scale: 1.01 }}
									whileTap={{ scale: 0.99 }}
								>
									<Button
										className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 py-3 rounded-xl font-medium shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
										disabled={
											migrateMutation.isPending || !getUserIdFromUrl(mcpUrl)
										}
										size="lg"
										type="submit"
									>
										{migrateMutation.isPending ? (
											<>
												<Spinner className="mr-2 w-4 h-4" />
												Migrating documents...
											</>
										) : (
											<>
												Start Upgrade
												<ArrowRight className="ml-2 w-4 h-4" />
											</>
										)}
									</Button>
								</motion.div>
							</motion.form>

							{/* Success/Error States */}
							<AnimatePresence mode="wait">
								{migrateMutation.isSuccess && migrateMutation.data && (
									<motion.div
										animate={{ opacity: 1, y: 0, scale: 1 }}
										className="mt-6"
										exit={{ opacity: 0, y: -10, scale: 0.95 }}
										initial={{ opacity: 0, y: 20, scale: 0.95 }}
										key="success"
										transition={{ type: "spring", stiffness: 300, damping: 25 }}
									>
										<div className="relative rounded-xl overflow-hidden">
											<div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10" />
											<div className="relative p-4 border border-green-500/20 rounded-xl">
												<div className="text-green-400">
													<div className="flex items-center gap-2 mb-2">
														<CheckCircle className="w-5 h-5" />
														<p className="font-medium">
															Migration completed successfully!
														</p>
													</div>
													<p className="text-sm text-green-300/80 mb-3">
														Migrated {migrateMutation.data.migratedCount}{" "}
														documents
													</p>
													{migrateMutation.data.documentIds &&
														migrateMutation.data.documentIds.length > 0 && (
															<details className="mt-3">
																<summary className="cursor-pointer hover:text-green-300 transition-colors text-sm font-medium">
																	View migrated document IDs
																</summary>
																<div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
																	{migrateMutation.data.documentIds.map(
																		(id) => (
																			<code
																				className="block text-xs bg-black/30 px-3 py-2 rounded-lg border border-green-500/10 text-green-200"
																				key={id}
																			>
																				{id}
																			</code>
																		),
																	)}
																</div>
															</details>
														)}
												</div>
											</div>
										</div>
									</motion.div>
								)}

								{migrateMutation.isError && (
									<motion.div
										animate={{ opacity: 1, y: 0, scale: 1 }}
										className="mt-6"
										exit={{ opacity: 0, y: -10, scale: 0.95 }}
										initial={{ opacity: 0, y: 20, scale: 0.95 }}
										key="error"
										transition={{ type: "spring", stiffness: 300, damping: 25 }}
									>
										<div className="relative rounded-xl overflow-hidden">
											<div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10" />
											<div className="relative p-4 border border-red-500/20 rounded-xl">
												<div className="text-red-400">
													<p className="font-medium mb-1">Migration failed</p>
													<p className="text-sm text-red-300/80">
														{migrateMutation.error?.message ||
															"An unexpected error occurred"}
													</p>
												</div>
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	)
}
