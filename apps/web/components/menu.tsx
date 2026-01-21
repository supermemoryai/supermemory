"use client"

import { useIsMobile } from "@hooks/use-mobile"
import {
	fetchConsumerProProduct,
	fetchMemoriesFeature,
} from "@repo/lib/queries"
import { Button } from "@repo/ui/components/button"
import { ConnectAIModal } from "./connect-ai-modal"
import { HeadingH2Bold } from "@repo/ui/text/heading/heading-h2-bold"
import { GlassMenuEffect } from "@ui/other/glass-effect"
import { useCustomer } from "autumn-js/react"
import { Plus, Puzzle, User, X } from "lucide-react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Drawer } from "vaul"
import { useMobilePanel } from "@/lib/mobile-panel-context"
import { useChatOpen } from "@/stores"
import { ProjectSelector } from "./project-selector"
import { AddMemoryExpandedView, AddMemoryView } from "./views/add-memory"
import { IntegrationsView } from "./views/integrations"
import { ProfileView } from "./views/profile"

export const MCPIcon = ({ className }: { className?: string }) => {
	return (
		<svg
			className={className}
			fill="currentColor"
			fillRule="evenodd"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>ModelContextProtocol</title>
			<path d="M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z" />
			<path d="M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z" />
		</svg>
	)
}

function Menu({ id }: { id?: string }) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const openParam = searchParams.get("open")

	// Valid view names that can be opened via URL parameter
	const validViews = [
		"addUrl",
		"mcp",
		"projects",
		"profile",
		"integrations",
	] as const
	type ValidView = (typeof validViews)[number]

	const [isHovered, setIsHovered] = useState(false)
	const [expandedView, setExpandedView] = useState<
		"addUrl" | "mcp" | "projects" | "profile" | "integrations" | null
	>(null)
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [isCollapsing, setIsCollapsing] = useState(false)
	const [showAddMemoryView, setShowAddMemoryView] = useState(false)
	const [showConnectAIModal, setShowConnectAIModal] = useState(false)
	const isMobile = useIsMobile()
	const { activePanel, setActivePanel } = useMobilePanel()
	const autumn = useCustomer()
	const { setIsOpen } = useChatOpen()

	const { data: memoriesCheck } = fetchMemoriesFeature(
		autumn,
		!autumn.isLoading,
	)

	const memoriesUsed = memoriesCheck?.usage ?? 0
	const memoriesLimit = memoriesCheck?.included_usage ?? 0

	const { data: proCheck } = fetchConsumerProProduct(autumn)

	useEffect(() => {
		if (memoriesCheck) {
			console.log({ memoriesCheck })
		}

		if (proCheck) {
			console.log({ proCheck })
		}
	}, [memoriesCheck, proCheck])

	// Function to clear the 'open' parameter from URL
	const clearOpenParam = useCallback(() => {
		const newSearchParams = new URLSearchParams(searchParams.toString())
		newSearchParams.delete("open")
		const newUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""}`
		router.replace(newUrl)
	}, [searchParams, router])

	const isProUser = proCheck?.allowed ?? false

	const shouldShowLimitWarning =
		!isProUser && memoriesUsed >= memoriesLimit * 0.8

	const menuItems = [
		{
			icon: Plus,
			text: "Add Memory",
			key: "addUrl" as const,
			disabled: false,
		},
		{
			icon: Puzzle,
			text: "Integrations",
			key: "integrations" as const,
			disabled: false,
		},
		{
			icon: MCPIcon,
			text: "MCP",
			key: "mcp" as const,
			disabled: false,
		},
		{
			icon: User,
			text: "Profile",
			key: "profile" as const,
			disabled: false,
		},
	]

	const handleMenuItemClick = (
		key: "chat" | "addUrl" | "mcp" | "projects" | "profile" | "integrations",
	) => {
		if (key === "chat") {
			setIsOpen(true)
			setIsMobileMenuOpen(false)
			if (isMobile) {
				setActivePanel("chat")
			}
		} else if (key === "mcp") {
			// Open ConnectAIModal directly for MCP
			setIsMobileMenuOpen(false)
			setExpandedView(null)
			setShowConnectAIModal(true)
		} else {
			if (expandedView === key) {
				setIsCollapsing(true)
				setExpandedView(null)
			} else if (key === "addUrl") {
				setShowAddMemoryView(true)
				setExpandedView(null)
			} else {
				setExpandedView(key)
			}
			if (isMobile) {
				setActivePanel("menu")
			}
		}
	}

	// Handle initial view opening based on URL parameter
	useEffect(() => {
		if (openParam) {
			if (openParam === "chat") {
				setIsOpen(true)
				setIsMobileMenuOpen(false)
				if (isMobile) {
					setActivePanel("chat")
				}
			} else if (openParam === "mcp") {
				// Open ConnectAIModal directly for MCP
				setIsMobileMenuOpen(false)
				setExpandedView(null)
				setShowConnectAIModal(true)
			} else if (openParam === "addUrl") {
				setShowAddMemoryView(true)
				setExpandedView(null)
				if (isMobile) {
					setIsMobileMenuOpen(true)
					setActivePanel("menu")
				}
			} else if (validViews.includes(openParam as ValidView)) {
				// For other valid views like "profile", "integrations"
				setExpandedView(openParam as ValidView)
				if (isMobile) {
					setIsMobileMenuOpen(true)
					setActivePanel("menu")
				}
			}

			// Clear the parameter from URL after performing any action
			clearOpenParam()
		}
	}, [
		openParam,
		isMobile,
		setIsOpen,
		setActivePanel,
		validViews,
		clearOpenParam,
	])

	// Watch for active panel changes on mobile
	useEffect(() => {
		if (isMobile && activePanel !== "menu" && activePanel !== null) {
			// Another panel became active, close the menu
			setIsMobileMenuOpen(false)
			setExpandedView(null)
		}
	}, [isMobile, activePanel])

	// Calculate width based on state
	const menuWidth = expandedView || isCollapsing ? 600 : isHovered ? 160 : 56

	// Dynamic z-index for mobile based on active panel
	const mobileZIndex = isMobile && activePanel === "menu" ? "z-[70]" : "z-[100]"

	return (
		<>
			{/* Desktop Menu */}
			{!isMobile && (
				<LayoutGroup>
					<div className="fixed h-screen w-full p-4 items-center top-0 left-0 pointer-events-none z-[60] flex">
						<motion.nav
							animate={{
								width: menuWidth,
								scale: 1,
							}}
							className="pointer-events-auto group relative flex text-sm font-medium flex-col items-start overflow-hidden rounded-3xl shadow-2xl"
							id={id}
							initial={{ width: 56, scale: 0.95 }}
							layout
							onMouseEnter={() => !expandedView && setIsHovered(true)}
							onMouseLeave={() => !expandedView && setIsHovered(false)}
							transition={{
								width: {
									duration: 0.2,
									ease: [0.4, 0, 0.2, 1],
								},
								scale: {
									duration: 0.5,
									ease: [0.4, 0, 0.2, 1],
								},
								layout: {
									duration: 0.2,
									ease: [0.4, 0, 0.2, 1],
								},
							}}
						>
							{/* Menu content */}
							<motion.div
								className="relative z-20 flex flex-col gap-6 w-full bg-white"
								layout
							>
								<AnimatePresence
									initial={false}
									mode="wait"
									onExitComplete={() => setIsCollapsing(false)}
								>
									{!expandedView ? (
										<motion.div
											animate={{
												opacity: 1,
											}}
											className="w-full flex flex-col gap-6 p-4"
											exit={{
												opacity: 0,
												transition: {
													duration: 0.2,
													ease: "easeOut",
												},
											}}
											initial={{
												opacity: 0,
											}}
											key="menu-items"
											layout
											style={{
												transform: "translateZ(0)",
												willChange: "opacity",
											}}
											transition={{
												opacity: {
													duration: 0.15,
													ease: "easeInOut",
												},
											}}
										>
											<div className="flex flex-col gap-6">
												{menuItems.map((item, index) => (
													<div key={item.key}>
														<motion.button
															animate={{
																opacity: 1,
																y: 0,
																scale: 1,
																transition: {
																	duration: 0.1,
																},
															}}
															className={`flex w-full items-center transition-colors duration-100 cursor-pointer relative ${isHovered || expandedView ? "px-1" : ""}`}
															initial={{ opacity: 0, y: 20, scale: 0.95 }}
															layout
															onClick={() => handleMenuItemClick(item.key)}
															type="button"
															whileHover={{
																scale: 1.02,
																transition: { duration: 0.1 },
															}}
															whileTap={{ scale: 0.98 }}
														>
															<motion.div
																animate={{
																	scale: 1,
																	transition: {
																		delay: expandedView === null ? 0.15 : 0,
																		duration: 0.1,
																	},
																}}
																initial={{ scale: 0.8 }}
																layout="position"
															>
																<item.icon className="duration-200 h-6 w-6 flex-shrink-0" />
															</motion.div>
															<motion.p
																animate={{
																	opacity: isHovered ? 1 : 0,
																	x: isHovered ? 0 : -10,
																}}
																className="pl-3 whitespace-nowrap"
																initial={{ opacity: 0, x: -10 }}
																style={{
																	transform: "translateZ(0)",
																}}
																transition={{
																	duration: isHovered ? 0.2 : 0.1,
																	delay: isHovered ? index * 0.03 : 0,
																	ease: [0.4, 0, 0.2, 1],
																}}
															>
																{item.text}
															</motion.p>
														</motion.button>
														{index === 0 && (
															<motion.div
																animate={{
																	opacity: 1,
																	scaleX: 1,
																}}
																className="w-full h-px bg-black/20 mt-3 origin-left"
																initial={{ opacity: 0, scaleX: 0 }}
																transition={{
																	duration: 0.3,
																	delay: 0.1,
																	ease: [0.4, 0, 0.2, 1],
																}}
															/>
														)}
													</div>
												))}
											</div>
										</motion.div>
									) : (
										<motion.div
											animate={{
												opacity: 1,
											}}
											className="w-full p-4"
											exit={{
												opacity: 0,
												transition: {
													duration: 0.2,
													ease: "easeOut",
												},
											}}
											initial={{
												opacity: 0,
											}}
											key="expanded-view"
											layout
											style={{
												transform: "translateZ(0)",
												willChange: "opacity, transform",
											}}
											transition={{
												opacity: {
													duration: 0.15,
													ease: "easeInOut",
												},
											}}
										>
											<motion.div
												animate={{ opacity: 1, y: 0 }}
												className="flex items-center justify-between mb-4"
												initial={{ opacity: 0, y: -10 }}
												layout
												transition={{
													delay: 0.05,
													duration: 0.2,
													ease: [0.4, 0, 0.2, 1],
												}}
											>
												<HeadingH2Bold className="text-white">
													{expandedView === "mcp" && "Model Context Protocol"}
													{expandedView === "profile" && "Profile"}
													{expandedView === "integrations" && "Integrations"}
												</HeadingH2Bold>
												<motion.div
													animate={{ opacity: 1, scale: 1 }}
													initial={{ opacity: 0, scale: 0.8 }}
													transition={{
														delay: 0.08,
														duration: 0.2,
													}}
												>
													<Button
														className="text-white/70 hover:text-white transition-colors duration-200"
														onClick={() => {
															setIsCollapsing(true)
															setExpandedView(null)
														}}
														size="icon"
														variant="ghost"
													>
														<X className="h-5 w-5" />
													</Button>
												</motion.div>
											</motion.div>
											<motion.div
												animate={{ opacity: 1, y: 0 }}
												className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar"
												initial={{ opacity: 0, y: 10 }}
												transition={{
													delay: 0.1,
													duration: 0.25,
													ease: [0.4, 0, 0.2, 1],
												}}
											>
												{expandedView === "profile" && <ProfileView />}
												{expandedView === "integrations" && (
													<IntegrationsView />
												)}
											</motion.div>
										</motion.div>
									)}
								</AnimatePresence>
							</motion.div>
						</motion.nav>
					</div>
				</LayoutGroup>
			)}

			{/* Mobile Menu with Vaul Drawer */}
			{isMobile && (
				<Drawer.Root
					open={isMobileMenuOpen || !!expandedView}
					onOpenChange={(open) => {
						if (!open) {
							setIsMobileMenuOpen(false)
							setExpandedView(null)
							setActivePanel(null)
						}
					}}
				>
					{/* Menu Trigger Button */}
					{!isMobileMenuOpen && !expandedView && (
						<Drawer.Trigger asChild>
							<div className={`fixed bottom-8 right-6 z-100 ${mobileZIndex}`}>
								<motion.button
									animate={{ scale: 1, opacity: 1 }}
									className="w-14 h-14 flex items-center justify-center text-white rounded-full shadow-2xl"
									initial={{ scale: 0.8, opacity: 0 }}
									onClick={() => {
										setIsMobileMenuOpen(true)
										setActivePanel("menu")
									}}
									transition={{
										duration: 0.3,
										ease: [0.4, 0, 0.2, 1],
									}}
									type="button"
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									{/* Glass effect background */}
									<div className="absolute inset-0 rounded-full">
										<GlassMenuEffect rounded="rounded-full" />
									</div>
									<svg
										className="h-6 w-6 relative z-10"
										fill="none"
										stroke="currentColor"
										strokeWidth={2}
										viewBox="0 0 24 24"
									>
										<title>Open menu</title>
										<path
											d="M4 6h16M4 12h16M4 18h16"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</motion.button>
							</div>
						</Drawer.Trigger>
					)}

					<Drawer.Portal>
						<Drawer.Overlay className="fixed inset-0 bg-black/40 z-[60]" />
						<Drawer.Content className="bg-transparent fixed bottom-0 left-0 right-0 z-[70] outline-none">
							<Drawer.Title className="sr-only">
								{expandedView === "addUrl" && "Add Memory"}
								{expandedView === "mcp" && "Model Context Protocol"}
								{expandedView === "profile" && "Profile"}
								{!expandedView && "Menu"}
							</Drawer.Title>
							<div className="w-full flex flex-col text-sm font-medium shadow-2xl relative overflow-hidden rounded-t-3xl max-h-[80vh]">
								{/* Glass effect background */}
								<div className="absolute inset-0 rounded-t-3xl">
									<GlassMenuEffect rounded="rounded-t-3xl" />
								</div>

								{/* Drag Handle */}
								<div className="relative z-20 flex justify-center py-3">
									<div className="w-12 h-1 bg-white/30 rounded-full" />
								</div>

								{/* Menu content */}
								<div className="relative z-20 flex flex-col w-full px-2 pb-8">
									<AnimatePresence
										initial={false}
										mode="wait"
										onExitComplete={() => setIsCollapsing(false)}
									>
										{!expandedView ? (
											<motion.div
												animate={{ opacity: 1 }}
												className="w-full flex flex-col gap-6"
												exit={{ opacity: 0 }}
												initial={{ opacity: 0 }}
												key="menu-items-mobile"
												layout
											>
												<motion.div
													animate={{ opacity: 1, y: 0 }}
													initial={{ opacity: 0, y: -10 }}
													transition={{ delay: 0.08 }}
												>
													<ProjectSelector />
												</motion.div>

												{/* Menu Items */}
												<div className="flex flex-col gap-3">
													{menuItems.map((item, index) => (
														<div key={item.key}>
															<motion.button
																animate={{
																	opacity: 1,
																	y: 0,
																	transition: {
																		delay: 0.1 + index * 0.05,
																		duration: 0.3,
																		ease: "easeOut",
																	},
																}}
																className="flex w-full items-center gap-3 px-2 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer relative"
																initial={{ opacity: 0, y: 10 }}
																layout
																onClick={() => {
																	handleMenuItemClick(item.key)
																	if (
																		item.key !== "mcp" &&
																		item.key !== "profile" &&
																		item.key !== "integrations"
																	) {
																		setIsMobileMenuOpen(false)
																	}
																}}
																type="button"
																whileHover={{ scale: 1.05 }}
																whileTap={{ scale: 0.95 }}
															>
																<item.icon className="h-5 w-5 drop-shadow-lg flex-shrink-0" />
																<span className="drop-shadow-lg text-sm font-medium flex-1 text-left">
																	{item.text}
																</span>
																{/* Show warning indicator for Add Memory when limits approached */}
																{shouldShowLimitWarning &&
																	item.key === "addUrl" && (
																		<span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
																			{memoriesLimit - memoriesUsed} left
																		</span>
																	)}
															</motion.button>
															{/* Add horizontal line after first item */}
															{index === 0 && (
																<motion.div
																	animate={{
																		opacity: 1,
																		scaleX: 1,
																	}}
																	className="w-full h-px bg-white/20 mt-2 origin-left"
																	initial={{ opacity: 0, scaleX: 0 }}
																	transition={{
																		duration: 0.3,
																		delay: 0.15 + index * 0.05,
																		ease: [0.4, 0, 0.2, 1],
																	}}
																/>
															)}
														</div>
													))}
												</div>
											</motion.div>
										) : (
											<motion.div
												animate={{ opacity: 1 }}
												className="w-full px-2 flex flex-col"
												exit={{ opacity: 0 }}
												initial={{ opacity: 0 }}
												key="expanded-view-mobile"
												layout
											>
												<div className="flex-1">
													<motion.div
														className="flex items-center justify-between"
														layout
													>
														<HeadingH2Bold className="text-white">
															{expandedView === "addUrl" && "Add Memory"}
															{expandedView === "mcp" &&
																"Model Context Protocol"}
															{expandedView === "profile" && "Profile"}
															{expandedView === "integrations" &&
																"Integrations"}
														</HeadingH2Bold>
														<Button
															className="text-white/70 hover:text-white transition-colors duration-200"
															onClick={() => {
																setIsCollapsing(true)
																setExpandedView(null)
															}}
															size="icon"
															variant="ghost"
														>
															<X className="h-5 w-5" />
														</Button>
													</motion.div>
													<div className="max-h-[60vh] overflow-y-auto pr-1">
														{expandedView === "addUrl" && (
															<AddMemoryExpandedView />
														)}
														{expandedView === "profile" && <ProfileView />}
														{expandedView === "integrations" && (
															<IntegrationsView />
														)}
													</div>
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							</div>
						</Drawer.Content>
					</Drawer.Portal>
				</Drawer.Root>
			)}

			{showAddMemoryView && (
				<AddMemoryView
					initialTab="note"
					onClose={() => setShowAddMemoryView(false)}
				/>
			)}

			<ConnectAIModal
				onOpenChange={setShowConnectAIModal}
				open={showConnectAIModal}
			>
				<Button className="hidden">Connect AI Assistant</Button>
			</ConnectAIModal>
		</>
	)
}

export default Menu
