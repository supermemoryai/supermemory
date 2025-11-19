import { Button } from "@ui/components/button"
import { Logo, LogoFull } from "@ui/assets/Logo"
import Link from "next/link"
import {
	MoonIcon,
	Plus,
	SunIcon,
	MonitorIcon,
	User,
	CreditCard,
	Chrome,
	LogOut,
	WaypointsIcon,
	Gauge,
	HistoryIcon,
	Trash2,
	X,
	Check,
} from "lucide-react"
import {
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
	DropdownMenuLabel,
} from "@ui/components/dropdown-menu"
import { DropdownMenuItem } from "@ui/components/dropdown-menu"
import { DropdownMenu } from "@ui/components/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/tooltip"
import { useAuth } from "@lib/auth-context"
import { ConnectAIModal } from "./connect-ai-modal"
import { useTheme } from "next-themes"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { MCPIcon } from "./menu"
import { authClient } from "@lib/auth"
import { analytics } from "@/lib/analytics"
import { useGraphModal, usePersistentChat, useProject } from "@/stores"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@ui/components/dialog"
import { ScrollArea } from "@ui/components/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@lib/utils"
import { useEffect, useMemo, useState } from "react"

export function Header({ onAddMemory }: { onAddMemory?: () => void }) {
	const { user } = useAuth()
	const searchParams = useSearchParams()
	const { theme, setTheme } = useTheme()
	const router = useRouter()
	const { setIsOpen: setGraphModalOpen } = useGraphModal()
	const {
		getCurrentChat,
		conversations,
		currentChatId,
		setCurrentChatId,
		deleteConversation,
	} = usePersistentChat()
	const { selectedProject } = useProject()
	const pathname = usePathname()
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
		null,
	)
	const [mcpModalOpen, setMcpModalOpen] = useState(false)
	const [mcpInitialClient, setMcpInitialClient] = useState<"mcp-url" | null>(
		null,
	)
	const [mcpInitialTab, setMcpInitialTab] = useState<
		"oneClick" | "manual" | null
	>(null)

	const sorted = useMemo(() => {
		return [...conversations].sort((a, b) =>
			a.lastUpdated < b.lastUpdated ? 1 : -1,
		)
	}, [conversations])

	useEffect(() => {
		console.log("searchParams", searchParams.get("mcp"))
		const mcpParam = searchParams.get("mcp")
		if (mcpParam === "manual") {
			setMcpInitialClient("mcp-url")
			setMcpInitialTab("manual")
			setMcpModalOpen(true)
			const newSearchParams = new URLSearchParams(searchParams.toString())
			newSearchParams.delete("mcp")
			const newUrl = `${
				window.location.pathname
			}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""}`
			window.history.replaceState({}, "", newUrl)
		}
	}, [searchParams])

	function handleNewChat() {
		analytics.newChatStarted()
		const newId = crypto.randomUUID()
		setCurrentChatId(newId)
		router.push(`/chat/${newId}`)
		setIsDialogOpen(false)
	}

	function formatRelativeTime(isoString: string): string {
		return formatDistanceToNow(new Date(isoString), { addSuffix: true })
	}

	const handleSignOut = () => {
		analytics.userSignedOut()
		authClient.signOut()
		router.push("/login")
	}

	return (
		<div className="flex items-center justify-between w-full p-3 md:p-4">
			<div className="flex items-center gap-2 md:gap-3 justify-between w-full">
				<div className="flex items-center gap-1.5 md:gap-2">
					<Link
						className="pointer-events-auto"
						href={
							process.env.NODE_ENV === "development"
								? "http://localhost:3000"
								: "https://app.supermemory.ai"
						}
						rel="noopener noreferrer"
					>
						{getCurrentChat()?.title && pathname.includes("/chat") ? (
							<div className="flex items-center gap-2 md:gap-4 min-w-0 max-w-[200px] md:max-w-md">
								<Logo className="h-6 block text-foreground flex-shrink-0" />
								<span className="truncate text-sm md:text-base">
									{getCurrentChat()?.title}
								</span>
							</div>
						) : (
							<>
								<LogoFull className="h-8 hidden md:block" />
								<Logo className="h-8 md:hidden text-foreground" />
							</>
						)}
					</Link>
				</div>

				<div className="flex items-center gap-1.5 md:gap-2">
					<Button
						variant="secondary"
						size="sm"
						onClick={onAddMemory}
						className="gap-1.5"
					>
						<Plus className="h-4 w-4" />
						<span className="hidden sm:inline">Add Memory</span>
						<span className="hidden md:inline bg-secondary-foreground/10 rounded-md px-2 py-[2px] text-xs">
							c
						</span>
					</Button>
					<Dialog
						open={isDialogOpen}
						onOpenChange={(open) => {
							setIsDialogOpen(open)
							if (open) {
								analytics.chatHistoryViewed()
							}
							if (!open) {
								setConfirmingDeleteId(null)
							}
						}}
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<DialogTrigger asChild>
									<Button variant="ghost" size="sm">
										<HistoryIcon className="h-4 w-4" />
									</Button>
								</DialogTrigger>
							</TooltipTrigger>
							<TooltipContent>
								<p>Chat History</p>
							</TooltipContent>
						</Tooltip>
						<DialogContent className="sm:max-w-lg">
							<DialogHeader className="pb-4 border-b rounded-t-lg">
								<DialogTitle className="">Conversations</DialogTitle>
								<DialogDescription>
									Project{" "}
									<span className="font-mono font-medium">
										{selectedProject}
									</span>
								</DialogDescription>
							</DialogHeader>

							<ScrollArea className="max-h-96">
								<div className="flex flex-col gap-1">
									{sorted.map((c) => {
										const isActive = c.id === currentChatId
										return (
											<button
												key={c.id}
												type="button"
												onClick={() => {
													setCurrentChatId(c.id)
													router.push(`/chat/${c.id}`)
													setIsDialogOpen(false)
													setConfirmingDeleteId(null)
												}}
												className={cn(
													"flex items-center justify-between rounded-md px-3 py-2 outline-none w-full text-left",
													"transition-colors",
													isActive ? "bg-primary/10" : "hover:bg-muted",
												)}
												aria-current={isActive ? "true" : undefined}
											>
												<div className="min-w-0">
													<div className="flex items-center gap-2">
														<span
															className={cn(
																"text-sm font-medium truncate",
																isActive ? "text-foreground" : undefined,
															)}
														>
															{c.title || "Untitled Chat"}
														</span>
													</div>
													<div className="text-xs text-muted-foreground">
														Last updated {formatRelativeTime(c.lastUpdated)}
													</div>
												</div>
												{confirmingDeleteId === c.id ? (
													<div className="flex items-center gap-1">
														<Button
															type="button"
															size="icon"
															onClick={(e) => {
																e.stopPropagation()
																analytics.chatDeleted()
																deleteConversation(c.id)
																setConfirmingDeleteId(null)
															}}
															className="bg-red-500 text-white hover:bg-red-600 hover:text-white"
															aria-label="Confirm delete"
														>
															<Check className="size-4" />
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															onClick={(e) => {
																e.stopPropagation()
																setConfirmingDeleteId(null)
															}}
															aria-label="Cancel delete"
														>
															<X className="size-4 text-muted-foreground" />
														</Button>
													</div>
												) : (
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={(e) => {
															e.stopPropagation()
															setConfirmingDeleteId(c.id)
														}}
														aria-label="Delete conversation"
													>
														<Trash2 className="size-4 text-muted-foreground" />
													</Button>
												)}
											</button>
										)
									})}
									{sorted.length === 0 && (
										<div className="text-xs text-muted-foreground px-3 py-2">
											No conversations yet
										</div>
									)}
								</div>
							</ScrollArea>
							<Button
								variant="outline"
								size="lg"
								className="w-full border-dashed"
								onClick={handleNewChat}
							>
								<Plus className="size-4 mr-1" /> New Conversation
							</Button>
						</DialogContent>
					</Dialog>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setGraphModalOpen(true)}
							>
								<WaypointsIcon className="h-5 w-5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Graph View</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<ConnectAIModal
							open={mcpModalOpen}
							onOpenChange={setMcpModalOpen}
							openInitialClient={mcpInitialClient}
							openInitialTab={mcpInitialTab}
						>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="gap-1.5 hidden md:block"
									onClick={() => setMcpModalOpen(true)}
								>
									<MCPIcon className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
						</ConnectAIModal>
						<TooltipContent>
							<p>Connect to AI (MCP)</p>
						</TooltipContent>
					</Tooltip>
					<DropdownMenu>
						<DropdownMenuTrigger>
							<Avatar className="border border-border h-8 w-8 md:h-10 md:w-10">
								<AvatarImage src={user?.image ?? ""} />
								<AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
							</Avatar>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="mr-2 md:mr-4 px-2 w-56">
							<DropdownMenuLabel>
								<div>
									<p className="text-sm font-medium">{user?.name}</p>
									<p className="text-xs text-muted-foreground">{user?.email}</p>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => router.push("/settings")}>
								<User className="h-4 w-4" />
								Profile
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => router.push("/settings/billing")}
							>
								<CreditCard className="h-4 w-4" />
								Billing
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => router.push("/settings/integrations")}
							>
								<Gauge className="h-4 w-4" />
								Integrations
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => {
									window.open(
										"https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc",
										"_blank",
										"noopener,noreferrer",
									)
								}}
							>
								<Chrome className="h-4 w-4" />
								Chrome Extension
							</DropdownMenuItem>
							<DropdownMenuItem
								className="flex items-center justify-between p-2 cursor-default hover:bg-transparent focus:bg-transparent data-[highlighted]:bg-transparent"
								onSelect={(e) => e.preventDefault()}
							>
								<span className="text-sm font-medium">Theme</span>
								<div className="flex items-center gap-1 bg-accent rounded-full">
									<Button
										variant={theme === "system" ? "default" : "ghost"}
										size="sm"
										className={cn(
											"h-6 w-6 rounded-full group hover:cursor-pointer",
										)}
										onClick={() => setTheme("system")}
										title="System"
									>
										<MonitorIcon
											className={cn(
												theme === "system"
													? "text-primary-foreground"
													: "text-muted-foreground",
												"h-3 w-3 group-hover:text-foreground",
											)}
										/>
									</Button>
									<Button
										variant={theme === "light" ? "default" : "ghost"}
										size="sm"
										className={cn(
											"h-6 w-6 rounded-full group hover:cursor-pointer",
										)}
										onClick={() => setTheme("light")}
										title="Light"
									>
										<SunIcon
											className={cn(
												theme === "light"
													? "text-primary-foreground"
													: "text-muted-foreground",
												"h-3 w-3 group-hover:text-foreground",
											)}
										/>
									</Button>
									<Button
										variant={theme === "dark" ? "default" : "ghost"}
										size="sm"
										className={cn(
											"h-6 w-6 rounded-full group hover:cursor-pointer",
										)}
										onClick={() => setTheme("dark")}
										title="Dark"
									>
										<MoonIcon
											className={cn(
												theme === "dark"
													? "text-primary-foreground"
													: "text-muted-foreground",
												"h-3 w-3 group-hover:text-foreground",
											)}
										/>
									</Button>
								</div>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => handleSignOut()}>
								<LogOut className="h-4 w-4" />
								Logout
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	)
}
