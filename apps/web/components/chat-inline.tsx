"use client";

import { ArrowUp } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateId } from "@lib/generate-id";
import { usePersistentChat } from "@/stores/chat";

export function ChatInline() {
	const [message, setMessage] = useState("");
	const router = useRouter();
	const { setCurrentChatId, setConversation } = usePersistentChat();

	const handleSend = () => {
		if (!message.trim()) return;

		const newChatId = generateId();

		const userMessage = {
			id: generateId(),
			role: "user" as const,
			content: message.trim(),
			parts: [{ type: "text" as const, text: message.trim() }],
		};

		setCurrentChatId(newChatId);
		setConversation(newChatId, [userMessage]);

		router.push(`/chat/${newChatId}`);

		setMessage("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="flex flex-col h-full rounded-lg overflow-hidden">
			<div className="flex-1 flex items-center justify-center px-4">
				<div className="w-full max-w-4xl">
					<div className="text-start mb-6">
						<h2 className="text-xl font-medium text-foreground mb-2">
							Good evening, Mahesh
						</h2>
					</div>
					<div className="relative">
						<div className="bg-gradient-to-r from-blue-500 to-blue-600 p-[2px] rounded-3xl shadow-lg">
							<form
								className="flex flex-col items-end gap-3 bg-white rounded-[22px] p-3"
								onSubmit={(e) => {
									e.preventDefault()
									if (!message.trim()) return
									handleSend()
								}}
							>
								<textarea
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder="Yo, describe my fav destination..."
									className="w-full text-black placeholder-black/40 rounded-md outline-none resize-none text-base leading-relaxed"
									rows={2}
								/>
								<div className="flex items-center gap-2 w-full justify-between">
									<div className="flex items-center gap-2" />
									<button
										onClick={handleSend}
										disabled={!message.trim()}
										className="text-white border-0 rounded-lg size-10 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										type="button"
									>
										<img src="/icons/send.svg" alt="Send" className="w-8 h-8" />
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
