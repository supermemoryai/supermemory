"use client";

import { useEffect, useState } from "react";
import { usePersistentChat } from "@/stores/chat";
import { ChatMessages } from "@/components/views/chat/chat-messages";
import { AppHeader } from "@/components/header";

export default function Page(props: { params: Promise<{ id: string }> }) {
	const [id, setId] = useState<string | null>(null);
	const { setCurrentChatId } = usePersistentChat();

	useEffect(() => {
		async function getParams() {
			const params = await props.params;
			setId(params.id);
			setCurrentChatId(params.id);
		}
		getParams();
	}, [props.params, setCurrentChatId]);

	if (!id) {
		return <div>Loading...</div>;
	}

	return (
		<div className="h-screen w-full flex flex-col">
			<AppHeader />
			<div className="flex-1 overflow-hidden">
				<ChatMessages />
			</div>
		</div>
	);
}
