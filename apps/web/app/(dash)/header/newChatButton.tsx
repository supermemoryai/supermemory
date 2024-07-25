"use client";

import { ChatIcon } from "@repo/ui/icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

function NewChatButton() {
	const path = usePathname();

	if (path.startsWith("/chat")) {
		return (
			<Link
				href="/home"
				className="flex duration-200 items-center text-[#7D8994] hover:bg-[#1F2429] text-[13px] gap-2 px-3 py-2 rounded-xl"
			>
				<Image src={ChatIcon} alt="Chat icon" className="w-5" />
				Start new chat
			</Link>
		);
	}

	return null;
}

export default NewChatButton;
