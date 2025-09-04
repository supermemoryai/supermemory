"use client";

import { useChat, useCompletion } from "@ai-sdk/react";
import { cn } from "@lib/utils";
import { Button } from "@ui/components/button";
import { DefaultChatTransport } from "ai";
import {
	Check,
	ChevronDown,
	ChevronRight,
	Copy,
	Plus,
	RotateCcw,
	UserIcon,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { TextShimmer } from "@/components/text-shimmer";
import { usePersistentChat, useProject } from "@/stores";
import { useGraphHighlights } from "@/stores/highlights";
import { Spinner } from "../../spinner";

interface MemoryResult {
	documentId?: string;
	title?: string;
	content?: string;
	url?: string;
	score?: number;
}

interface ExpandableMemoriesProps {
	foundCount: number;
	results: MemoryResult[];
}

function ExpandableMemories({ foundCount, results }: ExpandableMemoriesProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	if (foundCount === 0) {
		return (
			<div className="text-sm flex items-center gap-2 text-muted-foreground">
				<Check className="size-4" /> No memories found
			</div>
		);
	}

	return (
		<div className="text-sm">
			<button
				className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
				onClick={() => setIsExpanded(!isExpanded)}
				type="button"
			>
				{isExpanded ? (
					<ChevronDown className="size-4" />
				) : (
					<ChevronRight className="size-4" />
				)}
				<Check className="size-4" />
				Found {foundCount} {foundCount === 1 ? "memory" : "memories"}
			</button>

			{isExpanded && results.length > 0 && (
				<div className="mt-2 ml-6 space-y-2 max-h-48 overflow-y-auto">
					{results.map((result, index) => {
						const isClickable =
							result.url &&
							(result.url.startsWith("http://") ||
								result.url.startsWith("https://"));

						const content = (
							<>
								{result.title && (
									<div className="font-medium text-sm mb-1 text-foreground">
										{result.title}
									</div>
								)}
								{result.content && (
									<div className="text-xs text-muted-foreground line-clamp-2">
										{result.content}
									</div>
								)}
								{result.url && (
									<div className="text-xs text-blue-400 mt-1 truncate">
										{result.url}
									</div>
								)}
								{result.score && (
									<div className="text-xs text-muted-foreground mt-1">
										Score: {(result.score * 100).toFixed(1)}%
									</div>
								)}
							</>
						);

						if (isClickable) {
							return (
								<a
									className="block p-2 bg-white/5 rounded-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors cursor-pointer"
									href={result.url}
									key={result.documentId || index}
									rel="noopener noreferrer"
									target="_blank"
								>
									{content}
								</a>
							);
						}

						return (
							<div
								className="p-2 bg-white/5 rounded-md border border-white/10"
								key={result.documentId || index}
							>
								{content}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

function useStickyAutoScroll(triggerKeys: ReadonlyArray<unknown>) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const [isAutoScroll, setIsAutoScroll] = useState(true);
	const [isFarFromBottom, setIsFarFromBottom] = useState(false);

	const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
		const node = bottomRef.current;
		if (node) node.scrollIntoView({ behavior, block: "end" });
	};

	useEffect(function observeBottomVisibility() {
		const container = scrollContainerRef.current;
		const sentinel = bottomRef.current;
		if (!container || !sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries || entries.length === 0) return;
				const isIntersecting = entries.some((e) => e.isIntersecting);
				setIsAutoScroll(isIntersecting);
			},
			{ root: container, rootMargin: "0px 0px 80px 0px", threshold: 0 },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, []);

	useEffect(
		function observeContentResize() {
			const container = scrollContainerRef.current;
			if (!container) return;
			const resizeObserver = new ResizeObserver(() => {
				if (isAutoScroll) scrollToBottom("auto");
				const distanceFromBottom =
					container.scrollHeight - container.scrollTop - container.clientHeight;
				setIsFarFromBottom(distanceFromBottom > 100);
			});
			resizeObserver.observe(container);
			return () => resizeObserver.disconnect();
		},
		[isAutoScroll],
	);

	function enableAutoScroll() {
		setIsAutoScroll(true);
	}

	useEffect(
		function autoScrollOnNewContent() {
			if (isAutoScroll) scrollToBottom("auto");
		},
		[isAutoScroll, scrollToBottom, ...triggerKeys],
	);

	const recomputeDistanceFromBottom = () => {
		const container = scrollContainerRef.current;
		if (!container) return;
		const distanceFromBottom =
			container.scrollHeight - container.scrollTop - container.clientHeight;
		setIsFarFromBottom(distanceFromBottom > 100);
	};

	useEffect(() => {
		recomputeDistanceFromBottom();
	}, [recomputeDistanceFromBottom, ...triggerKeys]);

	function onScroll() {
		recomputeDistanceFromBottom();
	}

	return {
		scrollContainerRef,
		bottomRef,
		isAutoScroll,
		isFarFromBottom,
		onScroll,
		enableAutoScroll,
		scrollToBottom,
	} as const;
}

export function ChatMessages() {
	const { selectedProject } = useProject();
	const {
		currentChatId,
		setCurrentChatId,
		setConversation,
		getCurrentConversation,
		setConversationTitle,
		getCurrentChat,
	} = usePersistentChat();

	const [input, setInput] = useState("");
	const activeChatIdRef = useRef<string | null>(null);
	const shouldGenerateTitleRef = useRef<boolean>(false);
	const hasRunInitialMessageRef = useRef<boolean>(false);

	const { setDocumentIds } = useGraphHighlights();

	const { messages, sendMessage, status, stop, setMessages, id, regenerate } =
		useChat({
			id: currentChatId ?? undefined,
			transport: new DefaultChatTransport({
				api: `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`,
				credentials: "include",
				body: { metadata: { projectId: selectedProject } },
			}),
			maxSteps: 2,
			onFinish: (result) => {
				const activeId = activeChatIdRef.current;
				if (!activeId) return;
				if (result.message.role !== "assistant") return;

				if (shouldGenerateTitleRef.current) {
					const textPart = result.message.parts.find(
						(p: any) => p?.type === "text",
					) as any;
					const text = textPart?.text?.trim();
					if (text) {
						shouldGenerateTitleRef.current = false;
						complete(text);
					}
				}
			},
		});

	useEffect(() => {
		activeChatIdRef.current = currentChatId ?? id ?? null;
	}, [currentChatId, id]);

	useEffect(() => {
		if (currentChatId && !hasRunInitialMessageRef.current) {
			const msgs = getCurrentConversation();
			if (msgs && msgs.length === 1) {
				sendMessage({ text: msgs[0].content });
				hasRunInitialMessageRef.current = true;
			}
		}
	}, []);

	useEffect(() => {
		if (id && id !== currentChatId) {
			setCurrentChatId(id);
		}
	}, [id, currentChatId, setCurrentChatId]);

	useEffect(() => {
		const msgs = getCurrentConversation();
		if (msgs && msgs.length > 0) {
			setMessages(msgs);
		} else if (!currentChatId) {
			setMessages([]);
		}
		setInput("");
	}, [currentChatId]);

	useEffect(() => {
		const activeId = currentChatId ?? id;
		if (activeId && messages.length > 0) {
			setConversation(activeId, messages);
		}
	}, [messages, currentChatId, id, setConversation]);

	const { complete } = useCompletion({
		api: `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/title`,
		credentials: "include",
		onFinish: (_, completion) => {
			const activeId = activeChatIdRef.current;
			if (!completion || !activeId) return;
			setConversationTitle(activeId, completion.trim());
		},
	});

	// Update graph highlights from the most recent tool-searchMemories output
	useEffect(() => {
		try {
			const lastAssistant = [...messages]
				.reverse()
				.find((m) => m.role === "assistant");
			if (!lastAssistant) return;
			const lastSearchPart = [...(lastAssistant.parts as any[])]
				.reverse()
				.find(
					(p) =>
						p?.type === "tool-searchMemories" &&
						p?.state === "output-available",
				);
			if (!lastSearchPart) return;
			const output = (lastSearchPart as any).output;
			const ids = Array.isArray(output?.results)
				? ((output.results as any[])
						.map((r) => r?.documentId)
						.filter(Boolean) as string[])
				: [];
			if (ids.length > 0) {
				setDocumentIds(ids);
			}
		} catch {}
	}, [messages, setDocumentIds]);

	useEffect(() => {
		const currentSummary = getCurrentChat();
		const hasTitle = Boolean(
			currentSummary?.title && currentSummary.title.trim().length > 0,
		);
		shouldGenerateTitleRef.current = !hasTitle;
	}, [getCurrentChat]);
	const {
		scrollContainerRef,
		bottomRef,
		isFarFromBottom,
		onScroll,
		enableAutoScroll,
		scrollToBottom,
	} = useStickyAutoScroll([messages, status]);

	return (
		<div className="h-full mx-auto flex flex-col max-w-3xl">
			<div className="flex-1 relative">
				<div
					className="flex flex-col gap-2 absolute inset-0 overflow-y-auto px-4 pt-4 pb-7 scroll-pb-7 custom-scrollbar"
					onScroll={onScroll}
					ref={scrollContainerRef}
				>
					{messages.map((message) => (
						<div
							className={cn(
								"flex my-2",
								message.role === "user"
									? "items-center flex-row-reverse gap-2"
									: "flex-col",
							)}
							key={message.id}
						>
							<div
								className={cn(
									"flex flex-col gap-2 max-w-4/5",
									message.role === "user"
										? "bg-white/10 px-3 py-1.5 border border-black/20 rounded-lg"
										: "",
								)}
							>
								{message.parts
									.filter((part) =>
										["text", "tool-searchMemories", "tool-addMemory"].includes(
											part.type,
										),
									)
									.map((part, index) => {
										switch (part.type) {
											case "text":
												return (
													<div key={`${message.id}-${part.type}-${index}`}>
														<Streamdown>{part.text}</Streamdown>
													</div>
												)
											case "tool-searchMemories": {
												switch (part.state) {
													case "input-available":
													case "input-streaming":
														return (
															<div
																className="text-sm flex items-center gap-2 text-muted-foreground"
																key={`${message.id}-${part.type}-${index}`}
															>
																<Spinner className="size-4" /> Searching
																memories...
															</div>
														)
													case "output-error":
														return (
															<div
																className="text-sm flex items-center gap-2 text-muted-foreground"
																key={`${message.id}-${part.type}-${index}`}
															>
																<X className="size-4" /> Error recalling
																memories
															</div>
														)
													case "output-available": {
														const output = part.output
														const foundCount =
															typeof output === "object" &&
															output !== null &&
															"count" in output
																? Number(output.count) || 0
																: 0
														// @ts-expect-error
														const results = Array.isArray(output?.results)
															? // @ts-expect-error
																output.results
															: []

														return (
															<ExpandableMemories
																foundCount={foundCount}
																key={`${message.id}-${part.type}-${index}`}
																results={results}
															/>
														)
													}
													default:
														return null
												}
											}
											case "tool-addMemory": {
												switch (part.state) {
													case "input-available":
														return (
															<div
																className="text-sm flex items-center gap-2 text-muted-foreground"
																key={`${message.id}-${part.type}-${index}`}
															>
																<Spinner className="size-4" /> Adding memory...
															</div>
														)
													case "output-error":
														return (
															<div
																className="text-sm flex items-center gap-2 text-muted-foreground"
																key={`${message.id}-${part.type}-${index}`}
															>
																<X className="size-4" /> Error adding memory
															</div>
														)
													case "output-available":
														return (
															<div
																className="text-sm flex items-center gap-2 text-muted-foreground"
																key={`${message.id}-${part.type}-${index}`}
															>
																<Check className="size-4" /> Memory added
															</div>
														)
													case "input-streaming":
														return (
															<div
																className="text-sm flex items-center gap-2 text-muted-foreground"
																key={`${message.id}-${part.type}-${index}`}
															>
																<Spinner className="size-4" /> Adding memory...
															</div>
														)
													default:
														return null
												}
											}
											default:
												return null
										}
									})}
							</div>
							{message.role === "assistant" && (
								<div className="flex items-center gap-0.5 mt-0.5">
									<Button
										className="size-7 text-muted-foreground hover:text-foreground"
										onClick={() => {
											navigator.clipboard.writeText(
												message.parts
													.filter((p) => p.type === "text")
													?.map((p) => (p as any).text)
													.join("\n") ?? "",
											)
											toast.success("Copied to clipboard")
										}}
										size="icon"
										variant="ghost"
									>
										<Copy className="size-3.5" />
									</Button>
									<Button
										className="size-6 text-muted-foreground hover:text-foreground"
										onClick={() => regenerate({ messageId: message.id })}
										size="icon"
										variant="ghost"
									>
										<RotateCcw className="size-3.5" />
									</Button>
								</div>
							)}
						</div>
					))}
					{status === "submitted" && (
						<div className="flex text-muted-foreground justify-start gap-2 px-4 py-3 items-center w-full">
							<Spinner className="size-4" />
							<TextShimmer className="text-sm" duration={1.5}>
								Thinking...
							</TextShimmer>
						</div>
					)}
					<div ref={bottomRef} />
				</div>

				<Button
					className={cn(
						"rounded-full w-fit mx-auto shadow-md z-10 absolute inset-x-0 bottom-4 flex justify-center",
						"transition-all duration-200 ease-out",
						isFarFromBottom
							? "opacity-100 scale-100 pointer-events-auto"
							: "opacity-0 scale-95 pointer-events-none",
					)}
					onClick={() => {
						enableAutoScroll()
						scrollToBottom("smooth")
					}}
					size="sm"
					type="button"
					variant="default"
				>
					Scroll to bottom
				</Button>
			</div>

			<div className="px-4 pb-4 pt-1 relative flex-shrink-0">
				<div className="bg-gradient-to-r from-blue-500 to-blue-600 p-[3px] rounded-3xl shadow-lg">
					<div className="flex p-2 gap-2">
						<div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-2 text-white text-xs hover:bg-white/15 transition-all duration-200 cursor-pointer shadow-lg">
							Suggest me best hotels in Liechtenstein
						</div>
						<div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-2 text-white/90 text-xs hover:bg-white/15 transition-all duration-200 cursor-pointer shadow-lg">
							Prepare a full itinerary to Liechtenstein
						</div>
					</div>
					<form
						className="flex flex-col items-end gap-3 bg-white rounded-[22px] p-3"
						onSubmit={(e) => {
							e.preventDefault()
							if (status === "submitted") return
							if (status === "streaming") {
								stop()
								return
							}
							if (input.trim()) {
								enableAutoScroll()
								scrollToBottom("auto")
								sendMessage({ text: input })
								setInput("")
							}
						}}
					>
						<textarea
							className="w-full text-black placeholder-black/40 rounded-md outline-none resize-none text-base leading-relaxed"
							disabled={status === "submitted"}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Yo, describe my fav destination..."
							rows={2}
							value={input}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault()
									if (input.trim() && status !== "submitted") {
										enableAutoScroll()
										scrollToBottom("auto")
										sendMessage({ text: input })
										setInput("")
									}
								}
							}}
						/>

						<div className="flex items-center gap-2 w-full justify-between">
							<div className="flex items-center gap-2">
								<Button
									className="bg-white/20 hover:bg-white/30 text-black border-[#EBEBEB] rounded-lg size-10"
									size="icon"
									type="button"
									variant="outline"
								>
									<img
										src="/icons/attach.svg"
										alt="Attach"
										className="w-5 h-5"
									/>
								</Button>
								<Button
									className="bg-white/20 hover:bg-white/30 text-black border-[#EBEBEB] rounded-lg px-4 py-2 h-10"
									type="button"
									variant="outline"
								>
									<Plus className="size-4" />
									Link Project
								</Button>
							</div>

							<Button
								className="flex items-center justify-center bg-white"
								disabled={status === "submitted"}
								size="icon"
								type="submit"
								variant="ghost"
							>
								{status === "ready" ? (
									<img src="/icons/send.svg" alt="Send" className="w-8 h-8" />
								) : status === "submitted" ? (
									<Spinner className="size-5" />
								) : (
									<X className="size-5" />
								)}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}
