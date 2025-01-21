import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

import ChatInputForm from "./ChatInputForm";
import Navbar from "./Navbar";
import SharedCard from "./memories/SharedCard";

import { User } from "@supermemory/shared/types";
import { CoreMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useChatStream } from "~/lib/hooks/use-chat-stream";
import { Memory } from "~/lib/types/memory";

interface ChatProps {
	user: User;
	chatMessages: CoreMessage[];
	initialThreadUuid?: string;
}

function Chat({ user, chatMessages, initialThreadUuid }: ChatProps) {
	const {
		threadUuid,
		chatMessages: chatMessagesStreamed,
		input,
		setInput,
		sendMessage,
		isLoading,
	} = useChatStream(chatMessages, initialThreadUuid);

	const [expandedMessageIndexes, setExpandedMessageIndexes] = useState<number[]>([]);
	const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [streamingText, setStreamingText] = useState("");

	const hasAnnotations = chatMessagesStreamed.some(
		(message) => message.role === "assistant" && message.annotations?.length,
	);

	const toggleExpand = (index: number) => {
		setExpandedMessageIndexes((prev) =>
			prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
		);
	};

	const scrollToBottom = () => {
		if (messagesEndRef.current && shouldAutoScroll) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	};

	useEffect(() => {
		scrollToBottom();
	}, [chatMessagesStreamed]);

	useEffect(() => {
		const lastMessage = chatMessagesStreamed[chatMessagesStreamed.length - 1];
		if (lastMessage?.role === "assistant" && isLoading) {
			setStreamingText(lastMessage.content as string);
		} else {
			setStreamingText("");
		}
	}, [chatMessagesStreamed, isLoading]);

	const handleScroll = () => {
		if (!scrollContainerRef.current) return;

		const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
		const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
		setShouldAutoScroll(isAtBottom);
	};

	const renderAttachments = (attachments: any[]) => (
		<div className="flex flex-wrap gap-4 mb-4">
			{attachments.map((attachment) => (
				<motion.div
					key={attachment.name}
					className="relative"
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ duration: 0.2 }}
				>
					{attachment.url.endsWith(".png") ||
					attachment.url.endsWith(".jpg") ||
					attachment.url.endsWith(".jpeg") ? (
						<img
							src={attachment.url}
							alt={attachment.name}
							className="max-w-[300px] rounded-lg shadow-sm"
						/>
					) : (
						<div className="p-4 border rounded-lg">
							<a
								href={attachment.url}
								className="text-blue-500 hover:underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								{attachment.name}
							</a>
						</div>
					)}
				</motion.div>
			))}
		</div>
	);

	const renderMessageContent = (content: string | any, isLatestAndLoading: boolean) => (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
		>
			<Markdown className="prose dark:prose-invert prose-lg w-full">
				{isLatestAndLoading ? streamingText : typeof content === "string" ? content.replace(/<context>[\s\S]*?<\/context>/g, "") : content}
			</Markdown>
		</motion.div>
	);

	const groupAnnotationsByHost = (annotations: Memory[]) => {
		return annotations.reduce(
			(acc, curr) => {
				let host = "";
				try {
					const url = new URL(curr.url || "");
					host = url.host;
				} catch {
					host = "unknown";
				}
				if (!acc[host]) acc[host] = [];
				acc[host].push(curr);
				return acc;
			},
			{} as Record<string, Memory[]>,
		);
	};

	const renderAnnotations = (messageAnnotations: Memory[], index: number, isMobile = false) => {
		const isExpanded = expandedMessageIndexes.includes(index);
		const groupedAnnotations = groupAnnotationsByHost(messageAnnotations);

		return (
			<div
				className={
					isMobile ? "lg:hidden mb-4" : "hidden lg:block w-[320px] flex-shrink-0 -translate-y-12"
				}
			>
				<AnimatePresence>
					{!isExpanded ? (
						<motion.button
							onClick={() => toggleExpand(index)}
							className={`text-${isMobile ? "xs" : "sm"} text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1`}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
						>
							<ChevronDown className={`w-${isMobile ? "3" : "4"} h-${isMobile ? "3" : "4"}`} />
							{messageAnnotations.length} relevant{" "}
							{messageAnnotations.length === 1 ? "item" : "items"}
						</motion.button>
					) : (
						<motion.div
							className="space-y-4"
							initial={{ opacity: 0, [isMobile ? "y" : "x"]: isMobile ? 10 : 20 }}
							animate={{ opacity: 1, [isMobile ? "y" : "x"]: 0 }}
							exit={{ opacity: 0, [isMobile ? "y" : "x"]: isMobile ? -10 : 20 }}
						>
							<div className={`text-${isMobile ? "xs" : "sm"} font-medium text-muted-foreground`}>
								Related Context
							</div>
							<div className={isMobile ? "flex gap-2 overflow-x-auto pb-2" : "space-y-6"}>
								{isMobile
									? messageAnnotations.map((annotation, i) => (
											<motion.div
												key={i}
												className="flex-shrink-0 w-[200px] scale-90"
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ duration: 0.2, delay: i * 0.1 }}
											>
												<SharedCard data={annotation} />
											</motion.div>
										))
									: Object.entries(groupedAnnotations).map(([host, items], i) => (
											<div key={host} className="space-y-2">
												{items.length > 1 && (
													<div className="text-xs text-muted-foreground">
														{host} ({items.length} items)
													</div>
												)}
												<div className="space-y-2">
													{items.map((annotation, j) => (
														<motion.div
															key={j}
															initial={{ opacity: 0, y: 10 }}
															animate={{ opacity: 1, y: 0 }}
															transition={{ duration: 0.2, delay: j * 0.1 }}
														>
															<SharedCard data={annotation} />
														</motion.div>
													))}
												</div>
											</div>
										))}
							</div>
							<motion.button
								onClick={() => toggleExpand(index)}
								className={`flex items-center gap-${isMobile ? "1" : "2"} text-${isMobile ? "xs" : "sm"} text-muted-foreground hover:text-foreground transition-colors`}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
							>
								<ChevronUp className={`w-${isMobile ? "3" : "4"} h-${isMobile ? "3" : "4"}`} />
								Show less
							</motion.button>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		);
	};

	return (
		<div>
			<Navbar user={user} />
			<div
				className="p-4 font-geist md:p-24 md:pt-16 h-[calc(100vh-64px)] overflow-y-auto"
				ref={scrollContainerRef}
				onScroll={handleScroll}
			>
				<div className="grid grid-cols-12 gap-8">
					<div
						className={`col-span-12 ${hasAnnotations ? "lg:col-start-2" : "lg:col-start-3"} relative`}
					>
						<div className="space-y-8 pb-24">
							{chatMessagesStreamed.map((message, index) => {
								const isLatestAndLoading = index === chatMessagesStreamed.length - 1 && isLoading && message.role === "assistant";

								if (message.role === "user") {
									return (
										<motion.div
											key={index}
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.3 }}
										>
											{message.experimental_attachments &&
												renderAttachments(message.experimental_attachments)}
											<Markdown className={"text-xl"}>{message.content}</Markdown>
										</motion.div>
									);
								}

								if (message.role === "assistant") {
									const messageAnnotations = message.annotations?.[0]
										? (message.annotations[0] as unknown as Memory[])
										: undefined;

									return (
										<motion.div
											key={index}
											className="relative w-full"
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.3 }}
										>
											<>
												{messageAnnotations &&
													messageAnnotations.length > 0 &&
													renderAnnotations(messageAnnotations, index, true)}
												<div className="flex gap-8">
													<div className="flex-1">{renderMessageContent(message.content, isLatestAndLoading)}</div>
													{messageAnnotations &&
														messageAnnotations.length > 0 &&
														renderAnnotations(messageAnnotations, index)}
												</div>
											</>
										</motion.div>
									);
								}
								return null;
							})}

							{isLoading && !chatMessagesStreamed[chatMessagesStreamed.length - 1]?.content && (
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									className="flex gap-8"
								>
									<div className="flex-1">
										<div className="animate-pulse space-y-4">
											{[3 / 4, 1 / 2, 2 / 3, 1 / 3].map((width, i) => (
												<div key={i} className={`h-6 bg-muted rounded w-${width}`} />
											))}
										</div>
									</div>
									{hasAnnotations && (
										<div className="hidden lg:block w-[320px] flex-shrink-0 -translate-y-12">
											<div className="animate-pulse space-y-4">
												{[...Array(2)].map((_, i) => (
													<div key={i} className="h-[160px] bg-muted rounded" />
												))}
											</div>
										</div>
									)}
								</motion.div>
							)}
							<div ref={messagesEndRef} />
						</div>

						<div
							className={`fixed bottom-8 ${hasAnnotations ? "lg:w-[calc(66.666667%-2rem)]" : "lg:w-[calc(66.666667%)]"} w-[calc(100%-2rem)] left-1/2 -translate-x-1/2`}
						>
							<ChatInputForm
								submit={sendMessage}
								user={user}
								input={input}
								setInput={setInput}
								isLoading={isLoading}
								mini
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Chat;
