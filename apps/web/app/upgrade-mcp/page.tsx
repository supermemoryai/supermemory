"use client"

import { $fetch } from "@lib/api"
import { Button } from "@ui/components/button"
import { Input } from "@ui/components/input"
import { GlassMenuEffect } from "@ui/other/glass-effect"
import { useMutation } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Spinner } from "@/components/spinner"
import { motion, AnimatePresence } from "motion/react"
import { Logo, LogoFull } from "@ui/assets/Logo"
import { ArrowRight, CheckCircle, Upload, Zap } from "lucide-react"
import Link from "next/link"
import { useSession } from "@lib/auth"

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
			const response = await $fetch("@post/memories/migrate-mcp", {
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
			{/* Top navigation */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="absolute top-0 left-0 right-0 z-10 p-6 flex items-center justify-between"
			>
				<Link
					href="/"
					className="pointer-events-auto hover:opacity-80 transition-opacity"
				>
					<LogoFull className="h-8 hidden md:block text-white" />
					<Logo className="h-8 md:hidden text-white" />
				</Link>
			</motion.div>

			{/* Main content */}
			<div className="flex items-center justify-center min-h-screen p-4 relative z-10">
				<motion.div
					initial={{ opacity: 0, y: 20, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 25,
						delay: 0.1,
					}}
					className="w-full max-w-lg relative"
				>
					{/* Glass card with effect */}
					<div className="relative rounded-2xl overflow-hidden">
						<GlassMenuEffect rounded="rounded-2xl" />

						<div className="relative z-10 p-8 md:p-10">
							{/* Header */}
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="text-center mb-8"
							>
								<h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
									Upgrade MCP
								</h1>
							</motion.div>

							{/* Form */}
							<motion.form
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
								onSubmit={handleSubmit}
								className="space-y-6"
							>
								<div className="space-y-2">
									<label
										htmlFor="mcpUrl"
										className="text-sm font-medium text-slate-200 flex items-center gap-2"
									>
										URL
									</label>
									<div className="relative">
										<Input
											id="mcpUrl"
											type="url"
											value={mcpUrl}
											onChange={(e) => setMcpUrl(e.target.value)}
											placeholder="https://mcp.supermemory.ai/userId/sse"
											className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all duration-200 pl-4 pr-4 py-3 rounded-xl"
											disabled={migrateMutation.isPending}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<label
										htmlFor="projectId"
										className="text-sm font-medium text-slate-200"
									>
										Project ID
									</label>
									<div className="relative">
										<Input
											id="projectId"
											type="text"
											value={projectId}
											onChange={(e) => setProjectId(e.target.value)}
											placeholder="Project ID (default: 'default')"
											className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all duration-200 pl-4 pr-4 py-3 rounded-xl"
											disabled={migrateMutation.isPending}
										/>
									</div>
								</div>

								<motion.div
									whileHover={{ scale: 1.01 }}
									whileTap={{ scale: 0.99 }}
								>
									<Button
										type="submit"
										className="w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
										disabled={
											migrateMutation.isPending || !getUserIdFromUrl(mcpUrl)
										}
										size="lg"
									>
										{migrateMutation.isPending ? (
											<>
												<Spinner className="mr-2 w-4 h-4" />
												Migrating documents...
											</>
										) : (
											<>
												Start Upgrade
												<ArrowRight className="w-4 h-4" />
											</>
										)}
									</Button>
								</motion.div>
							</motion.form>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	)
}
