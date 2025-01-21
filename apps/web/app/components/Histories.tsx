import React from "react";

import { Clock } from "lucide-react";

function Histories({
	historyMessages,
}: {
	historyMessages: { chatId: string; firstMessage: string }[];
}) {
	return (
		<div className="mt-12 max-w-lg hidden md:block">
			<div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
				<Clock className="w-4 h-4" />
				<span>Recently Asked</span>
			</div>
			<div className="space-y-2">
				{historyMessages.map((history) => (
					<a
						key={history.chatId}
						href={`/chat/${history.chatId}`}
						className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer text-sm text-neutral-600 dark:text-neutral-300"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							className="size-4 flex-shrink-0"
						>
							<path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
						</svg>

						<span className="line-clamp-1 truncate">{history.firstMessage}</span>
					</a>
				))}
			</div>
		</div>
	);
}

export default Histories;
