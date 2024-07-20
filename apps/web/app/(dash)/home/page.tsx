"use client";

import React, { useEffect, useState } from "react";
import QueryInput from "./queryinput";
import { getSessionAuthToken, getSpaces } from "@/app/actions/fetchers";
import { useRouter } from "next/navigation";
import { createChatThread, linkTelegramToUser } from "@/app/actions/doers";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { variants } from "./homeVariants";
import { ChromeIcon, GithubIcon, TwitterIcon } from "lucide-react";
import Link from "next/link";

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

function Page({
	searchParams,
}: {
	searchParams: Record<string, string | string[] | undefined>;
}) {
	// TODO: use this to show a welcome page/modal
	// const { firstTime } = homeSearchParamsCache.parse(searchParams);

	const [telegramUser, setTelegramUser] = useState<string | undefined>(
		searchParams.telegramUser as string,
	);
	const [extensionInstalled, setExtensionInstalled] = useState<
		string | undefined
	>(searchParams.extension as string);

	const { push } = useRouter();

	const [spaces, setSpaces] = useState<{ id: number; name: string }[]>([]);

	const [showVariant, setShowVariant] = useState<number>(0);

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

		if (extensionInstalled) {
			toast.success("Extension installed successfully");
		}

		getSpaces().then((res) => {
			if (res.success && res.data) {
				setSpaces(res.data);
				return;
			}
			// TODO: HANDLE ERROR
		});

		setShowVariant(Math.floor(Math.random() * variants.length));

		getSessionAuthToken().then((token) => {
			if (typeof window === "undefined") return;
			window.postMessage({ token: token.data }, "*");
		});
	}, [telegramUser]);

	return (
		<div className="max-w-3xl h-full justify-center flex mx-auto w-full flex-col px-2 md:px-0">
			{/* all content goes here */}
			{/* <div className="">hi {firstTime ? 'first time' : ''}</div> */}

			<motion.h1
				{...{
					...slap,
					transition: { ...slap.transition, delay: 0.2 },
				}}
				className="text-center mx-auto bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]  bg-clip-text text-4xl tracking-tighter   text-transparent md:text-5xl"
			>
				{variants[showVariant]!.map((v, i) => {
					return (
						<span
							key={i}
							className={
								v.type === "highlighted"
									? "bg-gradient-to-r to-blue-200 from-zinc-300 text-transparent bg-clip-text"
									: ""
							}
						>
							{v.content}
						</span>
					);
				})}
			</motion.h1>

			<div className="w-full pb-20 mt-12">
				<QueryInput
					handleSubmit={async (q, spaces) => {
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
							`/chat/${threadid.data}?spaces=${JSON.stringify(spaces)}&q=${q}`,
						);
					}}
					initialSpaces={spaces}
					setInitialSpaces={setSpaces}
				/>
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
						href="https://github.com/supermemoryai/supermemory/issues/new"
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-2 text-muted-foreground hover:text-grey-50 duration-300"
					>
						<GithubIcon className="w-4 h-4" />
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
				</div>
			</div>
		</div>
	);
}

export default Page;
