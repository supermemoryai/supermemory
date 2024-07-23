import React from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "../../../public/logo.svg";

import { getChatHistory } from "../../actions/fetchers";
import NewChatButton from "./newChatButton";
import AutoBreadCrumbs from "./autoBreadCrumbs";
import SignOutButton from "./signOutButton";

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

					<div className="relative group">
						<button className="flex duration-200 items-center text-[#7D8994] hover:bg-[#1F2429] text-[13px] gap-2 px-3 py-2 rounded-xl">
							History
						</button>

						<div className="absolute p-4 hidden group-hover:block right-0 w-full md:w-[400px] max-h-[70vh] overflow-auto">
							<div className="bg-[#1F2429] rounded-xl p-2 flex flex-col shadow-lg">
								{chatThreads.data.map((thread) => (
									<Link
										prefetch={false}
										href={`/chat/${thread.id}`}
										key={thread.id}
										className="p-2 rounded-md hover:bg-secondary"
									>
										{thread.firstMessage}
									</Link>
								))}
							</div>
						</div>
					</div>
          <SignOutButton />
				</div>
			</div>
		</div>
	);
}

export default Header;
