import React from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "../../../public/logo.svg";

import { getChatHistory } from "../../actions/fetchers";
import NewChatButton from "./newChatButton";
import AutoBreadCrumbs from "./autoBreadCrumbs";
import SignOutButton from "./signOutButton";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/shadcn/dropdown-menu";
import { CaretDownIcon } from "@radix-ui/react-icons";

async function Header() {
	const chatThreads = await getChatHistory();

	if (!chatThreads.success || !chatThreads.data) {
		return <div>Error fetching chat threads</div>;
	}

	return (
		<div className="p-4 relative z-30 h-16 flex items-center">
			<div className="w-full flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link className="" href="/home">
						<Image
							src={Logo}
							alt="SuperMemory logo"
							className="hover:brightness-125 duration-200 w-full h-full"
						/>
					</Link>

					<AutoBreadCrumbs />
				</div>

				<div className="flex items-center gap-2">
					<NewChatButton />

					<DropdownMenu>
						<DropdownMenuTrigger className="inline-flex flex-row flex-nowrap items-center text-muted-foreground hover:text-foreground">
							History
							<CaretDownIcon />
						</DropdownMenuTrigger>
						<DropdownMenuContent className="p-4 w-full md:w-[400px] max-h-[70vh] overflow-auto border-none">
							{chatThreads.data.map((thread) => (
								<DropdownMenuItem asChild>
									<Link
										prefetch={false}
										href={`/chat/${thread.id}`}
										key={thread.id}
										className="p-2 rounded-md cursor-pointer focus:bg-secondary focus:text-current"
									>
										{thread.firstMessage}
									</Link>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<SignOutButton />
				</div>
			</div>
		</div>
	);
}

export default Header;
