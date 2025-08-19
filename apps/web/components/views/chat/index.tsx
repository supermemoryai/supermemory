"use client";

import { cn } from "@lib/utils";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@ui/components/dialog";
import { ScrollArea } from "@ui/components/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { HistoryIcon, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { analytics } from "@/lib/analytics";
import { useChatOpen, usePersistentChat, useProject } from "@/stores";
import { ChatMessages } from "./chat-messages";

export function ChatRewrite() {
	const { setIsOpen } = useChatOpen();
	const { selectedProject } = useProject();
	const { conversations, currentChatId, setCurrentChatId, getCurrentChat } =
		usePersistentChat();

	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const sorted = useMemo(() => {
		return [...conversations].sort((a, b) =>
			a.lastUpdated < b.lastUpdated ? 1 : -1,
		);
	}, [conversations]);

	function handleNewChat() {
		analytics.newChatStarted();
		const newId = crypto.randomUUID();
		setCurrentChatId(newId);
		setIsDialogOpen(false);
	}

	function formatRelativeTime(isoString: string): string {
		return formatDistanceToNow(new Date(isoString), { addSuffix: true });
	}

	return (
		<div className="flex flex-col h-full overflow-y-hidden border-l bg-background">
			<div className="border-b px-4 py-3 flex justify-between items-center">
				<h3 className="text-lg font-semibold line-clamp-1 text-ellipsis overflow-hidden">
					{getCurrentChat()?.title ?? "New Chat"}
				</h3>
				<div className="flex items-center gap-2">
					<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
						<DialogTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								onClick={() => analytics.chatHistoryViewed()}
							>
								<HistoryIcon className="size-4 text-muted-foreground" />
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-lg">
							<DialogHeader className="pb-4 border-b rounded-t-lg">
								<DialogTitle className="">Conversations</DialogTitle>
								<DialogDescription>
									Project{" "}
									<span className="font-mono font-medium">
										{selectedProject}
									</span>
								</DialogDescription>
							</DialogHeader>

							<ScrollArea className="max-h-96">
								<div className="flex flex-col gap-1">
									{sorted.map((c) => {
										const isActive = c.id === currentChatId;
										return (
											<div
												key={c.id}
												role="button"
												tabIndex={0}
												onClick={() => {
													setCurrentChatId(c.id);
													setIsDialogOpen(false);
												}}
												className={cn(
													"flex items-center justify-between rounded-md px-3 py-2 outline-none",
													"transition-colors",
													isActive ? "bg-primary/10" : "hover:bg-muted",
												)}
												aria-current={isActive ? "true" : undefined}
											>
												<div className="min-w-0">
													<div className="flex items-center gap-2">
														<span
															className={cn(
																"text-sm font-medium truncate",
																isActive ? "text-foreground" : undefined,
															)}
														>
															{c.title || "Untitled Chat"}
														</span>
													</div>
													<div className="text-xs text-muted-foreground">
														Last updated {formatRelativeTime(c.lastUpdated)}
													</div>
												</div>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={(e) => {
														e.stopPropagation();
														analytics.chatDeleted();
													}}
													aria-label="Delete conversation"
												>
													<Trash2 className="size-4 text-muted-foreground" />
												</Button>
											</div>
										);
									})}
									{sorted.length === 0 && (
										<div className="text-xs text-muted-foreground px-3 py-2">
											No conversations yet
										</div>
									)}
								</div>
							</ScrollArea>
							<Button
								variant="outline"
								size="lg"
								className="w-full border-dashed"
								onClick={handleNewChat}
							>
								<Plus className="size-4 mr-1" /> New Conversation
							</Button>
						</DialogContent>
					</Dialog>
					<Button variant="outline" size="icon" onClick={handleNewChat}>
						<Plus className="size-4 text-muted-foreground" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => setIsOpen(false)}
					>
						<X className="size-4 text-muted-foreground" />
					</Button>
				</div>
			</div>
			<ChatMessages />
		</div>
	);
}
