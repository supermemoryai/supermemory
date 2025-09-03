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
							Night owl, Mahesh
						</h2>
					</div>
					<div className="relative">
						<div className="flex flex-col border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow min-h-24">
							<textarea
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Ask your supermemory..."
								id="chat-inline-textarea"
								className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base resize-none px-4 py-3"
								rows={2}
							/>
							<div className="flex w-full rounded-b-lg justify-end">
								<button
									onClick={handleSend}
									disabled={!message.trim()}
									className="p-2 mr-1 rounded-lg disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors flex-shrink-0"
									type="button"
								>
									<ArrowUp className="w-6 h-6 bg-black rounded-full p-1 text-white" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
