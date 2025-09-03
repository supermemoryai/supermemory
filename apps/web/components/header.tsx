"use client";

import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { LogoFull, Logo } from "@ui/assets/Logo";
import { Plus, User, Settings, CreditCard, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useIsMobile } from "@hooks/use-mobile";
import { useAuth } from "@lib/auth-context";
import { authClient } from "@lib/auth";
import { useRouter } from "next/navigation";
import { AddMemoryView } from "./views/add-memory";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
	const [showAddMemoryView, setShowAddMemoryView] = useState(false);
	const isMobile = useIsMobile();
	const router = useRouter();
	const { user } = useAuth();

	const handleLogout = async () => {
		try {
			authClient.signOut();
			router.push("/login");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	return (
		<>
			<header className="w-full h-16 px-4 flex items-center justify-between">
				<Link
					href="/"
					rel="noopener noreferrer"
					className="flex items-center"
				>
					{isMobile ? (
						<Logo className="h-8" />
					) : (
						<LogoFull className="h-8 text-foreground" />
					)}
				</Link>

				<div className="flex items-center gap-3">
					<Button
						onClick={() => setShowAddMemoryView(true)}
						className="bg-dodger-blue hover:bg-dodger-blue/90 text-white px-4 py-2 rounded-full cursor-pointer"
						variant="default"
						size="default"
					>
						<Plus className="h-4 w-4" />
						{isMobile ? "Add" : "Add Memory"}
					</Button>

					<ThemeToggle />

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="bg-muted hover:bg-muted/80 text-foreground rounded-full"
							>
								<User className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<div className="px-2 py-1.5 text-sm text-muted-foreground">
								{user?.email}
							</div>
							<DropdownMenuSeparator />

							<DropdownMenuItem className="cursor-pointer">
								<Settings className="h-4 w-4 mr-2" />
								Settings
							</DropdownMenuItem>

							<DropdownMenuItem className="cursor-pointer">
								<CreditCard className="h-4 w-4 mr-2" />
								Billing
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							<DropdownMenuItem
								className="cursor-pointer"
								onClick={handleLogout}
							>
								<LogOut className="h-4 w-4 mr-2" />
								Logout
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			{/* Add Memory Modal */}
			{showAddMemoryView && (
				<AddMemoryView
					initialTab="note"
					onClose={() => setShowAddMemoryView(false)}
				/>
			)}
		</>
	);
}