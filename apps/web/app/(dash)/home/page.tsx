"use client";

import React, { useEffect, useState } from "react";
import QueryInput from "./queryinput";
import { getSessionAuthToken, getSpaces } from "@/app/actions/fetchers";
import { useRouter } from "next/navigation";
import { createChatThread, linkTelegramToUser } from "@/app/actions/doers";
import { toast } from "sonner";
import { Heading } from "./heading";

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
		const telegramUser = searchParams.extension as string
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
		<div className="max-w-3xl h-full justify-center flex mx-auto w-full flex-col px-2 md:px-0">
			<Heading queryPresent={queryPresent} />
			<div className="w-full pb-20 mt-12">
				<QueryInput
					setQueryPresent={(t:boolean)=> setQueryPresent(t)}
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
		</div>
	);
}

export default Page;
