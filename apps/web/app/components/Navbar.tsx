import { Form } from "@remix-run/react";

import { Logo } from "./icons/Logo";
import { AddMemoryModal } from "./memories/AddMemory";
import { Button } from "./ui/button";

import { User } from "@supermemory/shared/types";
import {
	ChevronDown,
	Cloud,
	Github,
	LifeBuoy,
	LogOut,
	Moon,
	Sun,
	User as UserIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useKeyboardShortcut } from "~/lib/hooks/use-keyboard";
import { Theme, useTheme } from "~/lib/theme-provider";

function Navbar({ user }: { user?: User }) {
	const [theme, setTheme] = useTheme();

	const toggleTheme = (e: Event) => {
		e.preventDefault();
		setTheme(theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
	};

	useKeyboardShortcut(
		["c"],
		() => {
			console.log("Add Memory");
			document.getElementById("add-memory-button")?.click();
		},
		"Add Memory",
	);

	return (
		<div className="w-full sticky top-0 z-50 bg-background text-foreground flex items-center justify-between h-16 px-6">
			<a href="/" className="flex items-center gap-2">
				<Logo className="dark:fill-foreground" />
			</a>

			<div className="flex items-center gap-2">
				{user ? (
					<>
						<AddMemoryModal>
							<Button
								id="add-memory-button"
								size={"sm"}
								variant="secondary"
								className="flex items-center gap-2"
							>
								<span className="text-xs bg-slate-300 dark:bg-slate-700 px-1 py-0.5 rounded-md">
									C
								</span>
								Add Memory
							</Button>
						</AddMemoryModal>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<div className="flex items-center gap-2 cursor-pointer">
									<ChevronDown className="text-muted-foreground" />
									<Avatar className="w-8 h-8">
										<AvatarImage
											src={user.profilePictureUrl ?? ""}
											alt={user.firstName ?? "Profile picture"}
										/>
										<AvatarFallback>
											{user.firstName?.charAt(0) ?? "?"}
											{user.lastName?.charAt(0) ?? "?"}
										</AvatarFallback>
									</Avatar>
								</div>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-56 mr-8">
								<DropdownMenuLabel className="text-wrap break-words">
									{user.firstName} {user.lastName} <br />
									<span className="text-sm text-muted-foreground">{user.email}</span>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem>
										<UserIcon className="mr-2 h-4 w-4" />
										<span>Profile</span>
										<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={toggleTheme}>
										{theme === Theme.LIGHT ? (
											<Sun className="mr-2 h-4 w-4" />
										) : (
											<Moon className="mr-2 h-4 w-4" />
										)}
										<span>{theme === Theme.LIGHT ? "Dark mode" : "Light mode"}</span>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<a href="https://portal.productboard.com/8rhspck6pdelv78mptczaena" target="_blank">
											<LifeBuoy className="mr-2 h-4 w-4" />
											<span>Support</span>
										</a>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<a href="https://api.supermemory.ai" target="_blank">
											<Cloud className="mr-2 h-4 w-4" />
											<span>API</span>
										</a>
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<a
										href="https://github.com/supermemoryai/supermemory"
										className="flex items-center"
									>
										<Github className="mr-2 h-4 w-4" />
										<span>GitHub</span>
									</a>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Form action="/action/sign-out" method="post">
										<button className="w-full flex items-center gap-2" type="submit">
											<LogOut className="mr-2 h-4 w-4" /> Log out
										</button>
									</Form>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</>
				) : (
					<div className="flex gap-2">
						<Button variant="secondary" asChild>
							<a href="/signin">Login to SuperMemory</a>
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

export default Navbar;
