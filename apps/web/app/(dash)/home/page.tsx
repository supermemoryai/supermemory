"use client";

import React, { Suspense, memo, use, useEffect, useState } from "react";
import QueryInput from "./queryinput";
import {
	getRecentChats,
	getSessionAuthToken,
	getSpaces,
} from "@/app/actions/fetchers";
import { useRouter } from "next/navigation";
import { createChatThread, linkTelegramToUser } from "@/app/actions/doers";
import { toast } from "sonner";
import { Heading } from "./heading";
import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

const linkTelegram = async (telegramUser: string) => {
	const response = await linkTelegramToUser(telegramUser);

	if (response.success) {
		toast.success("Your telegram has been linked successfully.");
	} else {
		toast.error("Failed to link telegram. Please try again.");
	}
};

function Page({
	searchParams,
}: {
	searchParams: Record<string, string | string[] | undefined>;
}) {
	const { push } = useRouter();

	const [spaces, setSpaces] = useState<{ id: number; name: string }[]>([]);

	const [queryPresent, setQueryPresent] = useState<boolean>(false);

	useEffect(() => {
		// telegram bot
		const telegramUser = searchParams.extension as string;
		if (telegramUser) {
			linkTelegram(telegramUser);
		}

		if (searchParams.extension as string) {
			toast.success("Extension installed successfully");
		}

		// fetch spaces
		getSpaces().then((res) => {
			if (res.success && res.data) {
				setSpaces(res.data);
				return;
			}
			// TODO: HANDLE ERROR
		});

		getSessionAuthToken().then((token) => {
			if (typeof window === "undefined") return;
			window.postMessage({ token: token.data }, "*");
		});
	}, []);

	return (
		<div className="max-w-3xl mt-[18vh] mx-auto w-full px-2 md:px-0">
			<Heading queryPresent={queryPresent} />
			<div className="w-full py-12">
				<QueryInput
					setQueryPresent={(t: boolean) => setQueryPresent(t)}
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
				/>
			</div>
			<History />
		</div>
	);
}

const History = memo(() => {
	const [chatThreads, setChatThreads] = useState(null);

	useEffect(() => {
		(async () => {
			const chatThreads = await getRecentChats();

			setChatThreads(chatThreads);
		})();
	}, []);

	if (!chatThreads){
		return <div>Loading</div>;
	}

	if (!chatThreads.success || !chatThreads.data) {
		return <div>Error fetching chat threads</div>;
	}

	return (
		<div className="space-y-5">
			<h3 className="text-lg">Recent Searches</h3>
			<ul className="text-base list-none space-y-3 text-[#b9b9b9]">
				{chatThreads.data.map((thread) => (
					<li className="flex items-center gap-2 truncate">
						<ArrowLongRightIcon className="h-5" />{" "}
						<Link prefetch={false} href={`/chat/${thread.id}`}>
							{thread.firstMessage}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
});

export default Page;
