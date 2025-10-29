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
		<div className="flex flex-col w-full">
			<div className="flex flex-col h-[93vh]">
				<div className="flex-1 flex justify-center min-h-0 w-full md:px-4">
					<div className="flex flex-col min-h-0 w-full max-w-4xl">
						<ChatMessages />
					</div>
				</div>
			</div>
		</div>
	)
}
