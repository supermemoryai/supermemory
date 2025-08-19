"use client";

import { useChat, useCompletion } from "@ai-sdk/react";
import { cn } from "@lib/utils";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Check, Copy, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { TextShimmer } from "@/components/text-shimmer";
import { usePersistentChat, useProject } from "@/stores";
import { useGraphHighlights } from "@/stores/highlights";
import { Spinner } from "../../spinner";

function useStickyAutoScroll(triggerKeys: ReadonlyArray<unknown>) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const [isAutoScroll, setIsAutoScroll] = useState(true);
	const [isFarFromBottom, setIsFarFromBottom] = useState(false);

	function scrollToBottom(behavior: ScrollBehavior = "auto") {
		const node = bottomRef.current;
		if (node) node.scrollIntoView({ behavior, block: "end" });
	}

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
		[isAutoScroll, ...triggerKeys],
	);

	function recomputeDistanceFromBottom() {
		const container = scrollContainerRef.current;
		if (!container) return;
		const distanceFromBottom =
			container.scrollHeight - container.scrollTop - container.clientHeight;
		setIsFarFromBottom(distanceFromBottom > 100);
	}

	useEffect(() => {
		recomputeDistanceFromBottom();
	}, [...triggerKeys]);

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

	const activeChatIdRef = useRef<string | null>(null);
	const shouldGenerateTitleRef = useRef<boolean>(false);

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
		if (id && id !== currentChatId) {
			setCurrentChatId(id);
		}
	}, [id, currentChatId, setCurrentChatId]);

	useEffect(() => {
		const msgs = getCurrentConversation();
		setMessages(msgs ?? []);
		setInput("");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentChatId]);

	useEffect(() => {
		const activeId = currentChatId ?? id;
		if (activeId && messages.length > 0) {
			setConversation(activeId, messages);
		}
	}, [messages, currentChatId, id, setConversation]);

	const [input, setInput] = useState("");
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
	}, [currentChatId, id, getCurrentChat]);
	const {
		scrollContainerRef,
		bottomRef,
		isFarFromBottom,
		onScroll,
		enableAutoScroll,
		scrollToBottom,
	} = useStickyAutoScroll([messages, status]);

	return (
		<>
			<div className="relative grow">
				<div
					ref={scrollContainerRef}
					onScroll={onScroll}
					className="flex flex-col gap-2 absolute inset-0 overflow-y-auto px-4 pt-4 pb-7 scroll-pb-7"
				>
					{messages.map((message) => (
						<div
							key={message.id}
							className={cn(
								"flex flex-col",
								message.role === "user" ? "items-end" : "items-start",
							)}
						>
							<div className="flex flex-col gap-2 max-w-4/5 bg-white/10 py-3 px-4 rounded-lg">
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
													<div
														key={index}
														className="prose prose-sm prose-invert max-w-none"
													>
														<ReactMarkdown remarkPlugins={[remarkGfm]}>
															{(part as any).text}
														</ReactMarkdown>
													</div>
												);
											case "tool-searchMemories":
												switch (part.state) {
													case "input-available":
													case "input-streaming":
														return (
															<div
																key={index}
																className="text-sm flex items-center gap-2 text-muted-foreground"
															>
																<Spinner className="size-4" /> Searching
																memories...
															</div>
														);
													case "output-error":
														return (
															<div
																key={index}
																className="text-sm flex items-center gap-2 text-muted-foreground"
															>
																<X className="size-4" /> Error recalling
																memories
															</div>
														);
													case "output-available": {
														const output = (part as any).output;
														const foundCount =
															typeof output === "object" &&
															output !== null &&
															"count" in output
																? Number(output.count) || 0
																: 0;
														const ids = Array.isArray(output?.results)
															? ((output.results as any[])
																	.map((r) => r?.documentId)
																	.filter(Boolean) as string[])
															: [];
														return (
															<div
																key={index}
																className="text-sm flex items-center gap-2 text-muted-foreground"
															>
																<Check className="size-4" /> Found {foundCount}{" "}
																memories
															</div>
														);
													}
												}
											case "tool-addMemory":
												switch (part.state) {
													case "input-available":
														return (
															<div
																key={index}
																className="text-sm flex items-center gap-2 text-muted-foreground"
															>
																<Spinner className="size-4" /> Adding memory...
															</div>
														);
													case "output-error":
														return (
															<div
																key={index}
																className="text-sm flex items-center gap-2 text-muted-foreground"
															>
																<X className="size-4" /> Error adding memory
															</div>
														);
													case "output-available":
														return (
															<div
																key={index}
																className="text-sm flex items-center gap-2 text-muted-foreground"
															>
																<Check className="size-4" /> Memory added
															</div>
														);
													case "input-streaming":
														return (
															<div
																key={index}
																className="text-sm flex items-center gap-2 text-muted-foreground"
															>
																<Spinner className="size-4" /> Adding memory...
															</div>
														);
												}
										}

										return null;
									})}
							</div>
							{message.role === "assistant" && (
								<div className="flex items-center gap-0.5 mt-0.5">
									<Button
										variant="ghost"
										size="icon"
										className="size-7 text-muted-foreground hover:text-foreground"
										onClick={() => {
											navigator.clipboard.writeText(
												message.parts
													.filter((p) => p.type === "text")
													?.map((p) => (p as any).text)
													.join("\n") ?? "",
											);
											toast.success("Copied to clipboard");
										}}
									>
										<Copy className="size-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="size-6 text-muted-foreground hover:text-foreground"
										onClick={() => regenerate({ messageId: message.id })}
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
					type="button"
					onClick={() => {
						enableAutoScroll();
						scrollToBottom("smooth");
					}}
					className={cn(
						"rounded-full w-fit mx-auto shadow-md z-10 absolute inset-x-0 bottom-4 flex justify-center",
						"transition-all duration-200 ease-out",
						isFarFromBottom
							? "opacity-100 scale-100 pointer-events-auto"
							: "opacity-0 scale-95 pointer-events-none",
					)}
					variant="default"
					size="sm"
				>
					Scroll to bottom
				</Button>
			</div>

			<form
				className="flex gap-2 px-4 pb-4 pt-1 relative"
				onSubmit={(e) => {
					e.preventDefault();
					if (status === "submitted") return;
					if (status === "streaming") {
						stop();
						return;
					}
					if (input.trim()) {
						enableAutoScroll();
						scrollToBottom("auto");
						sendMessage({ text: input });
						setInput("");
					}
				}}
			>
				<div className="absolute top-0 left-0 -mt-7 w-full h-7 bg-gradient-to-t from-background to-transparent" />
				<Input
					className="w-full"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					disabled={status === "submitted"}
					placeholder="Say something..."
				/>
				<Button type="submit" disabled={status === "submitted"}>
					{status === "ready" ? (
						<ArrowUp className="size-4" />
					) : status === "submitted" ? (
						<Spinner className="size-4" />
					) : (
						<X className="size-4" />
					)}
				</Button>
			</form>
		</>
	);
}
