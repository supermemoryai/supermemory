"use client"

import { useIsMobile } from "@hooks/use-mobile"
import { useAuth } from "@lib/auth-context"
import { $fetch } from "@repo/lib/api"
import { MemoryGraph } from "@repo/ui/memory-graph"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { Logo, LogoFull } from "@ui/assets/Logo"
import { Button } from "@ui/components/button"
import { GlassMenuEffect } from "@ui/other/glass-effect"
import {
	HelpCircle,
	LayoutGrid,
	List,
	LoaderIcon,
	MessageSquare,
	Unplug,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { z } from "zod"
import { ConnectAIModal } from "@/components/connect-ai-modal"
import { InstallPrompt } from "@/components/install-prompt"
import { MemoryListView } from "@/components/memory-list-view"
import Menu from "@/components/menu"
import { ProjectSelector } from "@/components/project-selector"
import { ReferralUpgradeModal } from "@/components/referral-upgrade-modal"
import type { TourStep } from "@/components/tour"
import { TourAlertDialog, useTour } from "@/components/tour"
import { AddMemoryView } from "@/components/views/add-memory"
import { ChatRewrite } from "@/components/views/chat"
import { TOUR_STEP_IDS, TOUR_STORAGE_KEY } from "@/lib/tour-constants"
import { useViewMode } from "@/lib/view-mode-context"
import { useChatOpen, useProject } from "@/stores"
import { useGraphHighlights } from "@/stores/highlights"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

const MemoryGraphPage = () => {
	const { documentIds: allHighlightDocumentIds } = useGraphHighlights()
	const isMobile = useIsMobile()
	const { viewMode, setViewMode, isInitialized } = useViewMode()
	const { selectedProject } = useProject()
	const { setSteps, isTourCompleted } = useTour()
	const { isOpen, setIsOpen } = useChatOpen()
	const [injectedDocs, setInjectedDocs] = useState<DocumentWithMemories[]>([])
	const [showAddMemoryView, setShowAddMemoryView] = useState(false)
	const [showReferralModal, setShowReferralModal] = useState(false)
	const [showConnectAIModal, setShowConnectAIModal] = useState(false)
	const [isHelpHovered, setIsHelpHovered] = useState(false)

	// Fetch projects meta to detect experimental flag
	const { data: projectsMeta = [] } = useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const response = await $fetch("@get/projects")
			return response.data?.projects ?? []
		},
		staleTime: 5 * 60 * 1000,
	})

	const isCurrentProjectExperimental = !!projectsMeta.find(
		(p: any) => p.containerTag === selectedProject,
	)?.isExperimental

	// Tour state
	const [showTourDialog, setShowTourDialog] = useState(false)

	// Define tour steps with useMemo to prevent recreation
	const tourSteps: TourStep[] = useMemo(() => {
		return [
			{
				content: (
					<div>
						<h3 className="font-semibold text-lg mb-2 text-white">
							Memories Overview
						</h3>
						<p className="text-gray-200">
							This is your memory graph. Each node represents a memory, and
							connections show relationships between them.
						</p>
					</div>
				),
				selectorId: TOUR_STEP_IDS.MEMORY_GRAPH,
				position: "center",
			},
			{
				content: (
					<div>
						<h3 className="font-semibold text-lg mb-2 text-white">
							Add Memories
						</h3>
						<p className="text-gray-200">
							Click here to add new memories to your knowledge base. You can add
							text, links, or connect external sources.
						</p>
					</div>
				),
				selectorId: TOUR_STEP_IDS.MENU_ADD_MEMORY,
				position: "right",
			},
			{
				content: (
					<div>
						<h3 className="font-semibold text-lg mb-2 text-white">
							Connections
						</h3>
						<p className="text-gray-200">
							Connect your external accounts like Google Drive, Notion, or
							OneDrive to automatically sync and organize your content.
						</p>
					</div>
				),
				selectorId: TOUR_STEP_IDS.MENU_CONNECTIONS,
				position: "right",
			},
			{
				content: (
					<div>
						<h3 className="font-semibold text-lg mb-2 text-white">Projects</h3>
						<p className="text-gray-200">
							Organize your memories into projects. Switch between different
							contexts easily.
						</p>
					</div>
				),
				selectorId: TOUR_STEP_IDS.MENU_PROJECTS,
				position: "right",
			},
			{
				content: (
					<div>
						<h3 className="font-semibold text-lg mb-2 text-white">
							MCP Servers
						</h3>
						<p className="text-gray-200">
							Access Model Context Protocol servers to give AI tools access to
							your memories securely.
						</p>
					</div>
				),
				selectorId: TOUR_STEP_IDS.MENU_MCP,
				position: "right",
			},
			{
				content: (
					<div>
						<h3 className="font-semibold text-lg mb-2 text-white">Billing</h3>
						<p className="text-gray-200">
							Manage your subscription and billing information.
						</p>
					</div>
				),
				selectorId: TOUR_STEP_IDS.MENU_BILLING,
				position: "right",
			},
			{
				content: (
					<div>
						<h3 className="font-semibold text-lg mb-2 text-white">
							View Toggle
						</h3>
						<p className="text-gray-200">
							Switch between graph view and list view to see your memories in
							different ways.
						</p>
					</div>
				),
				selectorId: TOUR_STEP_IDS.VIEW_TOGGLE,
				position: "left",
			},
			{
				content: (
					<div>
						<h3 className="font-semibold text-lg mb-2 text-white">Legend</h3>
						<p className="text-gray-200">
							Understand the different types of nodes and connections in your
							memory graph.
						</p>
					</div>
				),
				selectorId: TOUR_STEP_IDS.LEGEND,
				position: "left",
			},
			{
				content: (
					<div>
						<h3 className="font-semibold text-lg mb-2 text-white">
							Chat Assistant
						</h3>
						<p className="text-gray-200">
							Ask questions or add new memories using our AI-powered chat
							interface.
						</p>
					</div>
				),
				selectorId: TOUR_STEP_IDS.FLOATING_CHAT,
				position: "left",
			},
		]
	}, [])

	// Check if tour has been completed before
	useEffect(() => {
		const hasCompletedTour = localStorage.getItem(TOUR_STORAGE_KEY) === "true"
		if (!hasCompletedTour && !isTourCompleted) {
			const timer = setTimeout(() => {
				setShowTourDialog(true)
				setShowConnectAIModal(false)
			}, 1000) // Show after 1 second
			return () => clearTimeout(timer)
		}
	}, [isTourCompleted])

	// Set up tour steps
	useEffect(() => {
		setSteps(tourSteps)
	}, [setSteps, tourSteps])

	// Save tour completion to localStorage
	useEffect(() => {
		if (isTourCompleted) {
			localStorage.setItem(TOUR_STORAGE_KEY, "true")
		}
	}, [isTourCompleted])

	// Progressive loading via useInfiniteQuery
	const IS_DEV = process.env.NODE_ENV === "development"
	const PAGE_SIZE = IS_DEV ? 100 : 100
	const MAX_TOTAL = 1000

	const {
		data,
		error,
		isPending,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteQuery<DocumentsResponse, Error>({
		queryKey: ["documents-with-memories", selectedProject],
		initialPageParam: 1,
		queryFn: async ({ pageParam }) => {
			const response = await $fetch("@post/memories/documents", {
				body: {
					page: pageParam as number,
					limit: (pageParam as number) === 1 ? (IS_DEV ? 500 : 500) : PAGE_SIZE,
					sort: "createdAt",
					order: "desc",
					containerTags: selectedProject ? [selectedProject] : undefined,
				},
				disableValidation: true,
			})

			if (response.error) {
				throw new Error(response.error?.message || "Failed to fetch documents")
			}

			return response.data
		},
		getNextPageParam: (lastPage, allPages) => {
			const loaded = allPages.reduce(
				(acc, p) => acc + (p.documents?.length ?? 0),
				0,
			)
			if (loaded >= MAX_TOTAL) return undefined

			const { currentPage, totalPages } = lastPage.pagination
			if (currentPage < totalPages) {
				return currentPage + 1
			}
			return undefined
		},
		staleTime: 5 * 60 * 1000,
	})

	const baseDocuments = useMemo(() => {
		return (
			data?.pages.flatMap((p: DocumentsResponse) => p.documents ?? []) ?? []
		)
	}, [data])

	const allDocuments = useMemo(() => {
		if (injectedDocs.length === 0) return baseDocuments
		const byId = new Map<string, DocumentWithMemories>()
		for (const d of injectedDocs) byId.set(d.id, d)
		for (const d of baseDocuments) if (!byId.has(d.id)) byId.set(d.id, d)
		return Array.from(byId.values())
	}, [baseDocuments, injectedDocs])

	const totalLoaded = allDocuments.length
	const hasMore = hasNextPage
	const isLoadingMore = isFetchingNextPage

	const loadMoreDocuments = useCallback(async (): Promise<void> => {
		if (hasNextPage && !isFetchingNextPage) {
			await fetchNextPage()
			return
		}
		return
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])

	// Reset injected docs when project changes
	useEffect(() => {
		setInjectedDocs([])
	}, [selectedProject])

	// Surgical fetch of missing highlighted documents (customId-based IDs from search)
	useEffect(() => {
		if (!isOpen) return
		if (!allHighlightDocumentIds || allHighlightDocumentIds.length === 0) return
		const present = new Set<string>()
		for (const d of [...baseDocuments, ...injectedDocs]) {
			if (d.id) present.add(d.id)
			if ((d as any).customId) present.add((d as any).customId as string)
		}
		const missing = allHighlightDocumentIds.filter(
			(id: string) => !present.has(id),
		)
		if (missing.length === 0) return
		let cancelled = false
		const run = async () => {
			try {
				const resp = await $fetch("@post/memories/documents/by-ids", {
					body: {
						ids: missing,
						by: "customId",
						containerTags: selectedProject ? [selectedProject] : undefined,
					},
					disableValidation: true,
				})
				if (cancelled || (resp as any)?.error) return
				const extraDocs = (resp as any)?.data?.documents as
					| DocumentWithMemories[]
					| undefined
				if (!extraDocs || extraDocs.length === 0) return
				setInjectedDocs((prev) => {
					const seen = new Set<string>([
						...prev.map((d) => d.id),
						...baseDocuments.map((d) => d.id),
					])
					const merged = [...prev]
					for (const doc of extraDocs) {
						if (!seen.has(doc.id)) {
							merged.push(doc)
							seen.add(doc.id)
						}
					}
					return merged
				})
			} catch {}
		}
		void run()
		return () => {
			cancelled = true
		}
	}, [
		isOpen,
		allHighlightDocumentIds.join("|"),
		baseDocuments,
		injectedDocs,
		selectedProject,
		$fetch,
	])

	// Handle view mode change
	const handleViewModeChange = useCallback(
		(mode: "graph" | "list") => {
			setViewMode(mode)
		},
		[setViewMode],
	)

	useEffect(() => {
		const hasCompletedTour = localStorage.getItem(TOUR_STORAGE_KEY) === "true"
		if (hasCompletedTour && allDocuments.length === 0 && !showTourDialog) {
			setShowConnectAIModal(true)
		} else if (showTourDialog) {
			setShowConnectAIModal(false)
		}
	}, [allDocuments.length, showTourDialog])

	// Prevent body scrolling
	useEffect(() => {
		document.body.style.overflow = "hidden"
		document.body.style.height = "100vh"
		document.documentElement.style.overflow = "hidden"
		document.documentElement.style.height = "100vh"

		return () => {
			document.body.style.overflow = ""
			document.body.style.height = ""
			document.documentElement.style.overflow = ""
			document.documentElement.style.height = ""
		}
	}, [])

	return (
		<div className="relative h-screen bg-[#0f1419] overflow-hidden touch-none">
			{/* Main content area */}
			<motion.div
				animate={{
					marginRight: isOpen && !isMobile ? 600 : 0,
				}}
				className="h-full relative"
				transition={{
					duration: 0.2,
					ease: [0.4, 0, 0.2, 1], // Material Design easing - snappy but smooth
				}}
			>
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="absolute md:top-4 md:right-4 md:bottom-auto md:left-auto bottom-8 left-6 z-20 rounded-xl overflow-hidden"
					id={TOUR_STEP_IDS.VIEW_TOGGLE}
					initial={{ opacity: 0, y: -20 }}
					transition={{ type: "spring", stiffness: 300, damping: 25 }}
				>
					<GlassMenuEffect rounded="rounded-xl" />
					<div className="relative z-10 p-2 flex gap-1">
						<motion.button
							animate={{
								color: viewMode === "graph" ? "#93c5fd" : "#cbd5e1",
							}}
							className="relative h-8 px-3 flex items-center gap-2 text-sm font-medium rounded-md transition-colors"
							onClick={() => handleViewModeChange("graph")}
							transition={{ duration: 0.2 }}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
						>
							{viewMode === "graph" && (
								<motion.div
									className="absolute inset-0 bg-blue-500/20 rounded-md"
									layoutId="activeBackground"
									transition={{
										type: "spring",
										stiffness: 400,
										damping: 30,
									}}
								/>
							)}
							<span className="relative z-10 flex items-center gap-2">
								<LayoutGrid className="w-4 h-4" />
								<span className="hidden md:inline">Graph</span>
							</span>
						</motion.button>

						<motion.button
							animate={{
								color: viewMode === "list" ? "#93c5fd" : "#cbd5e1",
							}}
							className="relative h-8 px-3 flex items-center gap-2 text-sm font-medium rounded-md transition-colors"
							onClick={() => handleViewModeChange("list")}
							transition={{ duration: 0.2 }}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
						>
							{viewMode === "list" && (
								<motion.div
									className="absolute inset-0 bg-blue-500/20 rounded-md"
									layoutId="activeBackground"
									transition={{
										type: "spring",
										stiffness: 400,
										damping: 30,
									}}
								/>
							)}
							<span className="relative z-10 flex items-center gap-2">
								<List className="w-4 h-4" />
								<span className="hidden md:inline">List</span>
							</span>
						</motion.button>
					</div>
				</motion.div>

				{/* Animated content switching */}
				<AnimatePresence mode="wait">
					{viewMode === "graph" ? (
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							className="absolute inset-0"
							exit={{ opacity: 0, scale: 0.95 }}
							id={TOUR_STEP_IDS.MEMORY_GRAPH}
							initial={{ opacity: 0, scale: 0.95 }}
							key="graph"
							transition={{
								type: "spring",
								stiffness: 500,
								damping: 30,
							}}
						>
							<MemoryGraph
								autoLoadOnViewport={false}
								documents={allDocuments}
								error={error}
								hasMore={hasMore}
								highlightDocumentIds={allHighlightDocumentIds}
								highlightsVisible={isOpen}
								isExperimental={isCurrentProjectExperimental}
								isLoading={isPending}
								isLoadingMore={isLoadingMore}
								legendId={TOUR_STEP_IDS.LEGEND}
								loadMoreDocuments={loadMoreDocuments}
								occludedRightPx={isOpen && !isMobile ? 600 : 0}
								showSpacesSelector={false}
								totalLoaded={totalLoaded}
								variant="consumer"
							>
								<div className="absolute inset-0 flex items-center justify-center">
									<ConnectAIModal
										onOpenChange={setShowConnectAIModal}
										open={showConnectAIModal}
									>
										<div className="rounded-xl overflow-hidden cursor-pointer hover:bg-white/5 transition-colors p-6">
											<div className="relative z-10 text-slate-200 text-center">
												<p className="text-lg font-medium mb-4">
													Get Started with supermemory
												</p>
												<div className="flex flex-col gap-3">
													<p className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
														Click here to set up your AI connection
													</p>
													<p className="text-xs text-white/60">or</p>
													<button
														className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline"
														onClick={(e) => {
															e.stopPropagation()
															setShowAddMemoryView(true)
															setShowConnectAIModal(false)
														}}
														type="button"
													>
														Add your first memory
													</button>
												</div>
											</div>
										</div>
									</ConnectAIModal>
								</div>
							</MemoryGraph>
						</motion.div>
					) : (
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							className="absolute inset-0 md:ml-18"
							exit={{ opacity: 0, scale: 0.95 }}
							id={TOUR_STEP_IDS.MEMORY_LIST}
							initial={{ opacity: 0, scale: 0.95 }}
							key="list"
							transition={{
								type: "spring",
								stiffness: 500,
								damping: 30,
							}}
						>
							<MemoryListView
								documents={allDocuments}
								error={error}
								hasMore={hasMore}
								isLoading={isPending}
								isLoadingMore={isLoadingMore}
								loadMoreDocuments={loadMoreDocuments}
								totalLoaded={totalLoaded}
							>
								<div className="absolute inset-0 flex items-center justify-center">
									<ConnectAIModal
										onOpenChange={setShowConnectAIModal}
										open={showConnectAIModal}
									>
										<div className="rounded-xl overflow-hidden cursor-pointer hover:bg-white/5 transition-colors p-6">
											<div className="relative z-10 text-slate-200 text-center">
												<p className="text-lg font-medium mb-4">
													Get Started with supermemory
												</p>
												<div className="flex flex-col gap-3">
													<p className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
														Click here to set up your AI connection
													</p>
													<p className="text-xs text-white/60">or</p>
													<button
														className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline"
														onClick={(e) => {
															e.stopPropagation()
															setShowAddMemoryView(true)
															setShowConnectAIModal(false)
														}}
														type="button"
													>
														Add your first memory
													</button>
												</div>
											</div>
										</div>
									</ConnectAIModal>
								</div>
							</MemoryListView>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Top Bar */}
				<div className="absolute top-2 left-0 right-0 z-10 p-4 flex items-center justify-between">
					<div className="flex items-center gap-3 justify-between w-full md:w-fit md:justify-start">
						<Link
							className="pointer-events-auto"
							href="https://supermemory.ai"
							rel="noopener noreferrer"
							target="_blank"
						>
							<LogoFull
								className="h-8 hidden md:block"
								id={TOUR_STEP_IDS.LOGO}
							/>
							<Logo className="h-8 md:hidden" id={TOUR_STEP_IDS.LOGO} />
						</Link>

						<div className="hidden sm:block">
							<ProjectSelector />
						</div>

						<ConnectAIModal>
							<Button
								className="bg-white/5 hover:bg-white/10 border-white/20 text-white hover:text-white px-2 sm:px-3"
								size="sm"
								variant="outline"
							>
								<Unplug className="h-4 w-4" />
								<span className="hidden sm:inline ml-2">
									Connect to your AI
								</span>
								<span className="sm:hidden ml-1">Connect AI</span>
							</Button>
						</ConnectAIModal>
					</div>

					<div>
						<Menu />
					</div>
				</div>

				{/* Floating Open Chat Button */}
				{!isOpen && !isMobile && (
					<motion.div
						animate={{ opacity: 1, scale: 1 }}
						className="fixed bottom-6 right-6 z-50"
						initial={{ opacity: 0, scale: 0.8 }}
						transition={{
							type: "spring",
							stiffness: 300,
							damping: 25,
						}}
					>
						<Button
							className="px-4 bg-white hover:bg-white/80 text-[#001A39] shadow-lg hover:shadow-xl transition-all duration-200 rounded-full flex items-center gap-2 cursor-pointer"
							onClick={() => setIsOpen(true)}
							size="lg"
						>
							<MessageSquare className="h-5 w-5" />
							<span className="font-medium">Open Chat</span>
						</Button>
					</motion.div>
				)}

				<button
					className="fixed bottom-6 left-6 z-50 flex items-center overflow-hidden rounded-full shadow-2xl bg-transparent border-none cursor-pointer"
					onMouseEnter={() => setIsHelpHovered(true)}
					onMouseLeave={() => setIsHelpHovered(false)}
					type="button"
				>
					<div className="absolute inset-0 rounded-full">
						<GlassMenuEffect rounded="rounded-full" />
					</div>

					<div className="relative z-10 p-3 text-white">
						<HelpCircle className="h-5 w-5" />
					</div>

					<div
						className={`relative z-10 flex items-center text-white transition-all duration-300 overflow-hidden ${
							isHelpHovered
								? "opacity-100 max-w-32 pr-4 pl-0 py-3"
								: "opacity-0 max-w-0 px-0 py-3"
						}`}
					>
						<a
							className="flex items-center gap-2 text-sm font-medium hover:text-white/80 transition-colors whitespace-nowrap"
							href="mailto:dhravya@supermemory.com"
						>
							<span>Need Help?</span>
						</a>
					</div>
				</button>
			</motion.div>

			{/* Chat panel - positioned absolutely */}
			<motion.div
				className="fixed top-0 right-0 h-full z-50 md:z-auto"
				id={TOUR_STEP_IDS.FLOATING_CHAT}
				style={{
					width: isOpen ? (isMobile ? "100vw" : "600px") : 0,
					pointerEvents: isOpen ? "auto" : "none",
				}}
			>
				<motion.div
					animate={{ x: isOpen ? 0 : isMobile ? "100%" : 600 }}
					className="absolute inset-0"
					exit={{ x: isMobile ? "100%" : 600 }}
					initial={{ x: isMobile ? "100%" : 600 }}
					key="chat"
					transition={{
						type: "spring",
						stiffness: 500,
						damping: 40,
					}}
				>
					<ChatRewrite />
				</motion.div>
			</motion.div>

			{showAddMemoryView && (
				<AddMemoryView
					initialTab="note"
					onClose={() => setShowAddMemoryView(false)}
				/>
			)}

			{/* Tour Alert Dialog */}
			<TourAlertDialog onOpenChange={setShowTourDialog} open={showTourDialog} />

			{/* Referral/Upgrade Modal */}
			<ReferralUpgradeModal
				isOpen={showReferralModal}
				onClose={() => setShowReferralModal(false)}
			/>
		</div>
	)
}

// Wrapper component to handle auth and waitlist checks
export default function Page() {
	const router = useRouter()
	const { user } = useAuth()

	useEffect(() => {
		// save the token for chrome extension
		const url = new URL(window.location.href)
		const rawToken = url.searchParams.get("token")

		if (rawToken) {
			const encodedToken = encodeURIComponent(rawToken)
			window.postMessage({ token: encodedToken }, "*")
			url.searchParams.delete("token")
			window.history.replaceState({}, "", url.toString())
		}
	}, [])

	// Show loading state while checking authentication and waitlist status
	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#0f1419]">
				<div className="flex flex-col items-center gap-4">
					<LoaderIcon className="w-8 h-8 text-orange-500 animate-spin" />
					<p className="text-white/60">Loading...</p>
				</div>
			</div>
		)
	}

	// If we have a user and they have access, show the main component
	return (
		<>
			<MemoryGraphPage />
			<InstallPrompt />
		</>
	)
}
