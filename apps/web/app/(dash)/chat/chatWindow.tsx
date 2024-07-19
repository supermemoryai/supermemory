"use client";

import { AnimatePresence } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import QueryInput from "../home/queryinput";
import { cn } from "@repo/ui/lib/utils";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChatHistory, sourcesZod } from "@repo/shared-types";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@repo/ui/shadcn/accordion";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { code, p } from "./markdownRenderHelpers";
import { codeLanguageSubset } from "@/lib/constants";
import { toast } from "sonner";
import Link from "next/link";
import { createChatObject } from "@/app/actions/doers";
import { ClipboardIcon } from "@heroicons/react/24/outline";
import { SendIcon } from "lucide-react";

function ChatWindow({
	q,
	spaces,
	initialChat = [
		{
			question: q,
			answer: {
				parts: [],
				sources: [],
			},
		},
	],
	threadId,
}: {
	q: string;
	spaces: { id: number; name: string }[];
	initialChat?: ChatHistory[];
	threadId: string;
}) {
	const [layout, setLayout] = useState<"chat" | "initial">(
		initialChat.length > 1 ? "chat" : "initial",
	);
	const [chatHistory, setChatHistory] = useState<ChatHistory[]>(initialChat);

	const removeJustificationFromText = (text: string) => {
		// remove everything after the first "<justification>" word
		const justificationLine = text.indexOf("<justification>");
		if (justificationLine !== -1) {
			// Add that justification to the last chat message
			const lastChatMessage = chatHistory[chatHistory.length - 1];
			if (lastChatMessage) {
				lastChatMessage.answer.justification = text.slice(justificationLine);
			}
			return text.slice(0, justificationLine);
		}
		return text;
	};

	const router = useRouter();

	const getAnswer = async (query: string, spaces: string[]) => {
		const sourcesFetch = await fetch(
			`/api/chat?q=${query}&spaces=${spaces}&sourcesOnly=true&threadId=${threadId}`,
			{
				method: "POST",
				body: JSON.stringify({ chatHistory }),
			},
		);

		// TODO: handle this properly
		const sources = await sourcesFetch.json();

		const sourcesParsed = sourcesZod.safeParse(sources);

		if (!sourcesParsed.success) {
			console.error(sourcesParsed.error);
			toast.error("Something went wrong while getting the sources");
			return;
		}
		window.scrollTo({
			top: document.documentElement.scrollHeight,
			behavior: "smooth",
		});

		const updateChatHistoryAndFetch = async () => {
			// Step 1: Update chat history with the assistant's response
			await new Promise((resolve) => {
				setChatHistory((prevChatHistory) => {
					const newChatHistory = [...prevChatHistory];
					const lastAnswer = newChatHistory[newChatHistory.length - 1];
					if (!lastAnswer) {
						resolve(undefined);
						return prevChatHistory;
					}

					const filteredSourceUrls = new Set(
						sourcesParsed.data.metadata.map((source) => source.url),
					);
					const uniqueSources = sourcesParsed.data.metadata.filter((source) => {
						if (filteredSourceUrls.has(source.url)) {
							filteredSourceUrls.delete(source.url);
							return true;
						}
						return false;
					});

					lastAnswer.answer.sources = uniqueSources.map((source) => ({
						title: source.title ?? "Untitled",
						type: source.type ?? "page",
						source: source.url ?? "https://supermemory.ai",
						content: source.description ?? "No content available",
						numChunks: sourcesParsed.data.metadata.filter(
							(f) => f.url === source.url,
						).length,
					}));

					resolve(newChatHistory);
					return newChatHistory;
				});
			});

			// Step 2: Fetch data from the API
			const resp = await fetch(
				`/api/chat?q=${query}&spaces=${spaces}&threadId=${threadId}`,
				{
					method: "POST",
					body: JSON.stringify({ chatHistory, sources: sourcesParsed.data }),
				},
			);

			// Step 3: Read the response stream and update the chat history
			const reader = resp.body?.getReader();
			let done = false;
			while (!done && reader) {
				const { value, done: d } = await reader.read();
				if (d) {
					setChatHistory((prevChatHistory) => {
						createChatObject(threadId, prevChatHistory);
						return prevChatHistory;
					});
				}
				done = d;

				const txt = new TextDecoder().decode(value);
				setChatHistory((prevChatHistory) => {
					const newChatHistory = [...prevChatHistory];
					const lastAnswer = newChatHistory[newChatHistory.length - 1];
					if (!lastAnswer) return prevChatHistory;

					window.scrollTo({
						top: document.documentElement.scrollHeight,
						behavior: "smooth",
					});

					lastAnswer.answer.parts.push({ text: txt });
					return newChatHistory;
				});
			}
		};

		updateChatHistoryAndFetch();
	};

	useEffect(() => {
		if (q.trim().length > 0 || chatHistory.length > 0) {
			setLayout("chat");
			const lastChat = chatHistory.length > 0 ? chatHistory.length - 1 : 0;
			const startGenerating = chatHistory[lastChat]?.answer.parts[0]?.text
				? false
				: true;
			if (startGenerating) {
				getAnswer(
					q,
					spaces.map((s) => `${s.id}`),
				);
			}
		} else {
			router.push("/home");
		}
	}, []);

	return (
		<div className="h-full">
			<AnimatePresence mode="popLayout">
				{layout === "initial" ? (
					<motion.div
						exit={{ opacity: 0 }}
						key="initial"
						className="max-w-3xl h-full justify-center items-center flex mx-auto w-full flex-col"
					>
						<div className="w-full h-96">
							<QueryInput
								handleSubmit={() => {}}
								initialQuery={q}
								initialSpaces={[]}
								disabled
							/>
						</div>
					</motion.div>
				) : (
					<div
						className="max-w-3xl z-10 mx-auto relative h-full overflow-y-auto scrollbar-none"
						key="chat"
					>
						<div className="w-full pt-24 mb-40 px-4 md:px-0">
							{chatHistory.map((chat, idx) => (
								<div key={idx} className="space-y-16">
									<div
										className={`mt-8 ${idx != chatHistory.length - 1 ? "pb-2 border-b border-b-gray-400" : ""}`}
									>
										<h2
											className={cn(
												"text-white transition-all transform translate-y-0 opacity-100 duration-500 ease-in-out font-semibold text-xl",
											)}
										>
											{chat.question}
										</h2>

										<div className="flex flex-col mt-2">
											<div>
												<div className="text-foreground-menu py-2">Answer</div>
												<div className="text-base">
													{/* Loading state */}
													{(chat.answer.parts.length === 0 ||
														chat.answer.parts.join("").length === 0) && (
														<div className="animate-pulse flex space-x-4">
															<div className="flex-1 space-y-3 py-1">
																<div className="h-2 bg-slate-700 rounded"></div>
																<div className="h-2 bg-slate-700 rounded"></div>
															</div>
														</div>
													)}

													<Markdown
														remarkPlugins={[remarkGfm, [remarkMath]]}
														rehypePlugins={[
															rehypeKatex,
															[
																rehypeHighlight,
																{
																	detect: true,
																	ignoreMissing: true,
																	subset: codeLanguageSubset,
																},
															],
														]}
														components={{
															code: code as any,
															p: p as any,
														}}
														className="flex flex-col gap-2 text-base"
													>
														{removeJustificationFromText(
															chat.answer.parts
																.map((part) => part.text)
																.join(""),
														)}
													</Markdown>

													<div className="mt-3 relative -left-2 flex items-center gap-1">
														{/* TODO: speak response */}
														{/* <button className="group h-8 w-8 flex justify-center items-center active:scale-75 duration-200">
                              <SpeakerWaveIcon className="size-[18px] group-hover:text-primary" />
                            </button> */}
														{/* copy response */}
														<button
															onClick={() =>
																navigator.clipboard.writeText(
																	chat.answer.parts
																		.map((part) => part.text)
																		.join(""),
																)
															}
															className="group h-8 w-8 flex justify-center items-center active:scale-75 duration-200"
														>
															<ClipboardIcon className="size-[18px] group-hover:text-primary" />
														</button>
													</div>
												</div>
											</div>

											<div
												className={`space-y-4 ${chat.answer.sources.length > 0 || chat.answer.parts.length === 0 ? "flex" : "hidden"}`}
											>
												<Accordion
													defaultValue={
														idx === chatHistory.length - 1 ? "memories" : ""
													}
													type="single"
													collapsible
												>
													<AccordionItem value="memories">
														<AccordionTrigger className="text-foreground-menu">
															Related Memories
														</AccordionTrigger>
														{/* TODO: fade out content on the right side, the fade goes away when the user scrolls */}
														<AccordionContent
															className="flex flex-col no-scrollbar overflow-auto gap-4 relative max-w-3xl no-scrollbar"
															defaultChecked
														>
															<div className="w-full no-scrollbar flex gap-4">
																{/* Loading state */}
																{chat.answer.sources.length > 0 ||
																	(chat.answer.parts.length === 0 && (
																		<>
																			{[1, 2, 3, 4].map((_, idx) => (
																				<div
																					key={`loadingState-${idx}`}
																					className="w-[350px] shrink-0 p-4 gap-2 rounded-2xl flex flex-col bg-secondary animate-pulse"
																				>
																					<div className="bg-slate-700 h-2 rounded-full w-1/2"></div>
																					<div className="bg-slate-700 h-2 rounded-full w-full"></div>
																				</div>
																			))}
																		</>
																	))}
																{chat.answer.sources.map((source, idx) => (
																	<Link
																		href={source.source}
																		key={idx}
																		className="w-[350px] shrink-0 p-4 gap-2 rounded-2xl flex flex-col bg-secondary"
																	>
																		<div className="flex justify-between text-foreground-menu text-sm">
																			<span>{source.type}</span>

																			{source.numChunks > 1 && (
																				<span>{source.numChunks} chunks</span>
																			)}
																		</div>
																		<div className="text-base">
																			{source.title}
																		</div>
																		<div className="text-xs line-clamp-2">
																			{source.content.length > 100
																				? source.content.slice(0, 100) + "..."
																				: source.content}
																		</div>
																	</Link>
																))}
															</div>

															{chat.answer.justification &&
																chat.answer.justification.length && (
																	<div
																		className={`${chat.answer.justification && chat.answer.justification.length > 0 ? "flex" : "hidden"}`}
																	>
																		<Accordion
																			defaultValue={""}
																			type="single"
																			collapsible
																		>
																			<AccordionItem value="justification">
																				<AccordionTrigger className="text-foreground-menu">
																					Justification
																				</AccordionTrigger>
																				<AccordionContent
																					className="relative flex gap-2 max-w-3xl overflow-auto no-scrollbar"
																					defaultChecked
																				>
																					{chat.answer.justification.length > 0
																						? chat.answer.justification
																								.replaceAll(
																									"<justification>",
																									"",
																								)
																								.replaceAll(
																									"</justification>",
																									"",
																								)
																						: "No justification provided."}
																				</AccordionContent>
																			</AccordionItem>
																		</Accordion>
																	</div>
																)}
														</AccordionContent>
													</AccordionItem>
												</Accordion>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>

						<div className="fixed bottom-24 md:bottom-4 w-full max-w-3xl">
							<QueryInput
								mini
								className="w-full shadow-md"
								initialQuery={""}
								initialSpaces={spaces}
								handleSubmit={async (q, spaces) => {
									setChatHistory((prevChatHistory) => {
										return [
											...prevChatHistory,
											{
												question: q,
												answer: {
													parts: [],
													sources: [],
												},
											},
										];
									});
									await getAnswer(
										q,
										spaces.map((s) => `${s.id}`),
									);
								}}
							/>
						</div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
}

export default ChatWindow;
