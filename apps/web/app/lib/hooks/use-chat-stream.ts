import { useEffect, useState } from "react";

import { convertToUIMessages } from "@supermemory/shared";
import { CoreMessage } from "ai";
import { useChat } from "ai/react";
import { CreateMessage } from "ai/react";
import { toast } from "sonner";

export const useChatStream = (initialMessages: CoreMessage[], initialThreadUuid?: string) => {
	const [threadUuid, setThreadUuid] = useState(initialThreadUuid || "");
	const { messages, input, setInput, append, isLoading, error, stop, handleSubmit } = useChat({
		initialMessages: convertToUIMessages(initialMessages),
		api: `/backend/api/chat`,
		onResponse: (resp) => {
			const newThreadUuid = resp.headers.get("Supermemory-Thread-Uuid");
			if (newThreadUuid) {
				setThreadUuid(newThreadUuid);
				if (window.location.pathname !== `/chat/${newThreadUuid}`) {
					window.history.replaceState({}, "", `/chat/${newThreadUuid}`);
				}
			}
		},
		keepLastMessageOnError: true,
		onError: (e) => {
			alert(`Error in chat: ${e}`);
		},
		body: {
			threadId: threadUuid,
		},
		credentials: "include",
	});

	const sendMessage = async ({
		comingFromUseEffect = false,
		fileURLs,
	}: { comingFromUseEffect?: boolean; fileURLs?: string[] } = {}) => {
		if (input.trim().length === 0 && !comingFromUseEffect) {
			return;
		}

		const item = {
			role: "user",
			content: input,
			experimental_attachments: fileURLs?.map((url) => ({
				name: url,
				url,
				contentType: url.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
			})),
			data:
				fileURLs &&
				JSON.parse(
					JSON.stringify({
						files:
							fileURLs?.map((url) => ({
								contentType: url.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
								url: decodeURIComponent(url),
								name: url.split("/").pop(),
							})) ?? [],
					}),
				),
		};

		console.log("item", item);

		append(item as unknown as CreateMessage);
	};

	useEffect(() => {
		if (error) {
			console.error(error);
			toast.error(`Error while starting chat: ${error}`);
			stop();
		}
		if (
			messages.length !== 0 &&
			!isLoading &&
			messages[messages.length - 1].role === "user" &&
			!error
		) {
			sendMessage({ comingFromUseEffect: true });
		}
	}, []);

	return { threadUuid, chatMessages: messages, sendMessage, input, setInput, isLoading };
};
