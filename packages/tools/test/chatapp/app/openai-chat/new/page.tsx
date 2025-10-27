import { redirect } from "next/navigation"

function generateId() {
	return crypto.randomUUID?.() || Math.random().toString(36).slice(2)
}

export default function NewChatPage() {
	const chatId = generateId()
	redirect(`/openai-chat/${chatId}`)
}