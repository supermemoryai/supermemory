"use client";

import React, { useEffect, useState } from "react";
import QueryInput from "./queryinput";
import { getSessionAuthToken, getSpaces } from "@/app/actions/fetchers";
import { redirect, useRouter } from "next/navigation";
import {
	createChatThread,
	getQuerySuggestions,
	linkTelegramToUser,
} from "@/app/actions/doers";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ChromeIcon, GithubIcon, MailIcon, TwitterIcon } from "lucide-react";
import Link from "next/link";
import History from "./history";

const slap = {
	initial: {
		opacity: 0,
		scale: 1.1,
	},
	whileInView: { opacity: 1, scale: 1 },
	transition: {
		duration: 0.5,
		ease: "easeInOut",
	},
	viewport: { once: true },
};

function Page({ searchParams }: { searchParams: Record<string, string> }) {
	const telegramUser = searchParams.telegramUser;
	const extensionInstalled = searchParams.extension;
	const [query, setQuery] = useState(searchParams.q || "");

	const [spaces, setSpaces] = useState<{ id: number; name: string }[]>([]);

	const { push } = useRouter();

	useEffect(() => {
		if (telegramUser) {
			const linkTelegram = async () => {
				const response = await linkTelegramToUser(telegramUser);

				if (response.success) {
					toast.success("Your telegram has been linked successfully.");
				} else {
					toast.error("Failed to link telegram. Please try again.");
				}
			};

			linkTelegram();
		}

		getSpaces().then((res) => {
			if (res.success && res.data) {
				setSpaces(res.data);
				return;
			}
			// TODO: HANDLE ERROR
		});

		getSessionAuthToken().then((token) => {
			if (typeof window === "undefined") return;
			if (extensionInstalled) {
				toast.success("Extension installed successfully");
			}
			window.postMessage({ token: token.data }, "*");
		});
	}, [telegramUser]);

	return (
		<div className="max-w-3xl h-full justify-center flex mx-auto w-full flex-col px-2 md:px-0">
			<motion.h1
				{...{
					...slap,
					transition: { ...slap.transition, delay: 0.2 },
				}}
				className="text-center mx-auto bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]  bg-clip-text text-4xl tracking-tighter   text-transparent md:text-5xl pb-2"
			>
				<span>Ask your</span>{" "}
				<span className="inline-flex items-center gap-2 bg-gradient-to-r to-blue-300 from-zinc-300 text-transparent bg-clip-text">
					supermemory
				</span>
			</motion.h1>

			<div className="w-full pb-20 mt-10">
				<QueryInput
					query={query}
					setQuery={setQuery}
					handleSubmit={async (q, spaces, proMode) => {
						if (q.length === 0) {
							toast.error("Query is required");
							return;
						}

						const threadid = await createChatThread(q);

						if (!threadid.success || !threadid.data) {
							toast.error("Failed to create chat thread");
							return;
						}

						push(
							`/chat/${threadid.data}?spaces=${JSON.stringify(spaces)}&q=${q}&proMode=${proMode}`,
						);
					}}
					initialSpaces={spaces}
				/>

				<History setQuery={setQuery} />
			</div>

			<div className="w-full fixed bottom-0 left-0 p-4">
				<div className="flex items-center justify-center gap-8">
					<Link
						href="https://supermemory.ai/extension"
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-2 text-muted-foreground hover:text-grey-50 duration-300"
					>
						<ChromeIcon className="w-4 h-4" />
						Install extension
					</Link>
					<Link
						href="mailto:feedback@supermemory.ai"
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-2 text-muted-foreground hover:text-grey-50 duration-300"
					>
						<MailIcon className="w-4 h-4" />
						Bug report
					</Link>
					<Link
						href="https://x.com/supermemoryai"
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-2 text-muted-foreground hover:text-grey-50 duration-300"
					>
						<TwitterIcon className="w-4 h-4" />
						Twitter
					</Link>
					<Link
						href="https://t.me/supermemoryai_bot"
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-2 text-muted-foreground hover:text-grey-50 duration-300"
					>
						<svg
							viewBox="0 0 256 256"
							xmlns="http://www.w3.org/2000/svg"
							preserveAspectRatio="xMidYMid"
							className="grayscale size-4"
							fill="transparent"
						>
							<path d="M128 0C94.06 0 61.48 13.494 37.5 37.49A128.038 128.038 0 0 0 0 128c0 33.934 13.5 66.514 37.5 90.51C61.48 242.506 94.06 256 128 256s66.52-13.494 90.5-37.49c24-23.996 37.5-56.576 37.5-90.51 0-33.934-13.5-66.514-37.5-90.51C194.52 13.494 161.94 0 128 0Z" />
							<path
								fill="currentColor"
								d="M57.94 126.648c37.32-16.256 62.2-26.974 74.64-32.152 35.56-14.786 42.94-17.354 47.76-17.441 1.06-.017 3.42.245 4.96 1.49 1.28 1.05 1.64 2.47 1.82 3.467.16.996.38 3.266.2 5.038-1.92 20.24-10.26 69.356-14.5 92.026-1.78 9.592-5.32 12.808-8.74 13.122-7.44.684-13.08-4.912-20.28-9.63-11.26-7.386-17.62-11.982-28.56-19.188-12.64-8.328-4.44-12.906 2.76-20.386 1.88-1.958 34.64-31.748 35.26-34.45.08-.338.16-1.598-.6-2.262-.74-.666-1.84-.438-2.64-.258-1.14.256-19.12 12.152-54 35.686-5.1 3.508-9.72 5.218-13.88 5.128-4.56-.098-13.36-2.584-19.9-4.708-8-2.606-14.38-3.984-13.82-8.41.28-2.304 3.46-4.662 9.52-7.072Z"
							/>
						</svg>
						Telegram bot
					</Link>
				</div>
			</div>
		</div>
	);
}

export default Page;
