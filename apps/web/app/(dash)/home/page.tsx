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
	const [telegramUser, setTelegramUser] = useState<string | undefined>(
		searchParams.telegramUser as string,
	);
	const [extensionInstalled, setExtensionInstalled] = useState<
		string | undefined
	>(searchParams.extension as string);

	const { push } = useRouter();

	const [spaces, setSpaces] = useState<{ id: number; name: string }[]>([]);


	useEffect(() => {
		// telegram bot
		if (telegramUser) {
			linkTelegram(telegramUser);
		}

		if (extensionInstalled) {
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
	}, [telegramUser]);

	return (
		<div className="max-w-3xl h-full justify-center flex mx-auto w-full flex-col px-2 md:px-0">
			<Heading />
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
		</div>
	);
}

export default Page;
