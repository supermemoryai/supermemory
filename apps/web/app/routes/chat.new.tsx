import { useEffect, useState } from "react";
import Markdown from "react-markdown";

import { LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";

import { authkitLoader } from "@supermemory/authkit-remix-cloudflare";
import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { User } from "@supermemory/shared/types";
import { CoreMessage } from "ai";
import ChatComponent from "~/components/Chat";
import posthog from "posthog-js";

export const loader = (args: LoaderFunctionArgs) =>
	authkitLoader(args, async ({ request, context }) => {
		console.log(request.url);

		const session = await getSessionFromRequest(request, context);
		const user = session?.user;

		const chatMessages = new URL(request.url).searchParams.get("q");

		const base64Messages = chatMessages ? atob(chatMessages) : null;

		if (!base64Messages) {
			return redirect("/");
		}

		return json({ chatMessages: JSON.parse(base64Messages), user });
	});

function Chat() {
	const { chatMessages: initialChatMessages, user } = useLoaderData<typeof loader>() as {
		chatMessages: CoreMessage[];
		user: User;
	};


	return <ChatComponent user={user} chatMessages={initialChatMessages} />;
}

export default Chat;
