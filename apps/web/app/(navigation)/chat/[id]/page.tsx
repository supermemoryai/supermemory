"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { usePersistentChat } from "@/stores"
import { ChatMessages } from "@/components/views/chat/chat-messages"

export default function ChatPage() {
	const params = useParams()
	const { setCurrentChatId } = usePersistentChat()

	const chatId = params.id as string

	useEffect(() => {
		if (chatId) {
			setCurrentChatId(chatId)
		}
	}, [chatId, setCurrentChatId])

	return (
		<div className="h-full overflow-hidden">
			<ChatMessages />
		</div>
	)
}
