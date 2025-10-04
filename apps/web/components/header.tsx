import { Button } from "@ui/components/button"
import { Logo, LogoFull } from "@ui/assets/Logo"
import Link from "next/link"
import {
	MoonIcon,
	Plus,
	SunIcon,
	MonitorIcon,
	Network,
	User,
	CreditCard,
	Chrome,
	LogOut,
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
import { useAuth } from "@lib/auth-context"
import { ConnectAIModal } from "./connect-ai-modal"
import { useTheme } from "next-themes"
import { cn } from "@lib/utils"
import { useRouter } from "next/navigation"
import { MCPIcon } from "./menu"
import { authClient } from "@lib/auth"
import { analytics } from "@/lib/analytics"
import { useGraphModal } from "@/stores"

export function Header({ onAddMemory }: { onAddMemory?: () => void }) {
	const { user } = useAuth()
	const { theme, setTheme } = useTheme()
	const router = useRouter()
	const { setIsOpen: setGraphModalOpen } = useGraphModal()

	const handleSignOut = () => {
		analytics.userSignedOut()
		authClient.signOut()
		router.push("/login")
	}

	return (
		<div className="flex items-center justify-between w-full p-3 md:p-4">
			<div className="flex items-center gap-2 md:gap-3 justify-between w-full">
				<Link
					className="pointer-events-auto"
					href={
						process.env.NODE_ENV === "development"
							? "http://localhost:3000"
							: "https://app.supermemory.ai"
					}
					rel="noopener noreferrer"
				>
					<LogoFull className="h-8 hidden md:block" />
					<Logo className="h-8 md:hidden" />
				</Link>

				<div className="flex items-center gap-1.5 md:gap-3">
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
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setGraphModalOpen(true)}
						className="gap-1.5"
					>
						<Network className="h-4 w-4" />
						<span className="hidden sm:inline">Graph View</span>
					</Button>
					<ConnectAIModal>
						<Button variant="ghost" size="sm" className="gap-1.5">
							<MCPIcon className="h-4 w-4" />
							<span className="hidden lg:inline">Connect to AI (MCP)</span>
						</Button>
					</ConnectAIModal>
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
								<User className="h-4 w-4 mr-2" />
								Profile
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => router.push("/settings/billing")}
							>
								<CreditCard className="h-4 w-4 mr-2" />
								Billing
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
								<Chrome className="h-4 w-4 mr-2" />
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
								<LogOut className="h-4 w-4 mr-2" />
								Logout
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	)
}
