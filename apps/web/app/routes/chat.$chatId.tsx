import { useEffect, useState } from "react";
import Markdown from "react-markdown";

import { LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, useParams } from "@remix-run/react";

import { proxy } from "../../server/proxy";

import { authkitLoader } from "@supermemory/authkit-remix-cloudflare";
import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { CoreMessage } from "ai";
import posthog from "posthog-js";
import ChatComponent from "~/components/Chat";
import Navbar from "~/components/Navbar";
import { useChatStream } from "~/lib/hooks/use-chat-stream";
import { cn } from "~/lib/utils";

export const loader = (args: LoaderFunctionArgs) =>
	authkitLoader(args, async ({ request, context }) => {
		const session = await getSessionFromRequest(request, context);
		const user = session?.user;

		if (!user) {
			return redirect("/");
		}

		const threadId = args.params.chatId;
		if (!threadId) {
			return redirect("/");
		}

		const chatHistory = await proxy(`/v1/chat/${threadId}`, {}, request, context);
		const chatHistoryJson = (await chatHistory.json()) as { chatHistory: CoreMessage[] };

		if (!chatHistory) {
			return redirect("/");
		}

		return json({ user, chatMessages: chatHistoryJson.chatHistory });
	});

function Chat() {
	const { user, chatMessages } = useLoaderData<typeof loader>();
	const { chatId } = useParams();

	return (
		<ChatComponent
			user={user}
			chatMessages={chatMessages as CoreMessage[]}
			initialThreadUuid={chatId}
		/>
	);
}

export default Chat;
