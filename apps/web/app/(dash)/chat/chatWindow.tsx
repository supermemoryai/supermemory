"use client";

import { AnimatePresence } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import QueryInput from "../home/queryinput";
import { cn } from "@repo/ui/lib/utils";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChatHistory } from "@repo/shared-types";
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
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";

function ChatWindow({
  q,
  spaces,
}: {
  q: string;
  spaces: { id: string; name: string }[];
}) {
  const [layout, setLayout] = useState<"chat" | "initial">("initial");
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([
    {
      question: q,
      answer: {
        parts: [],
        sources: [],
      },
    },
  ]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

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
      `/api/chat?q=${query}&spaces=${spaces}&sourcesOnly=true`,
      {
        method: "POST",
        body: JSON.stringify({ chatHistory }),
      },
    );

    // TODO: handle this properly
    const sources = await sourcesFetch.json();

    const sourcesZod = z.object({
      ids: z.array(z.string()),
      metadata: z.array(z.any()),
    });

    const sourcesParsed = sourcesZod.safeParse(sources);

    if (!sourcesParsed.success) {
      console.log(sources);
      console.error(sourcesParsed.error);
      toast.error("Something went wrong while getting the sources");
      return;
    }

    setChatHistory((prevChatHistory) => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
      const newChatHistory = [...prevChatHistory];
      const lastAnswer = newChatHistory[newChatHistory.length - 1];
      if (!lastAnswer) return prevChatHistory;
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
      return newChatHistory;
    });

    const resp = await fetch(`/api/chat?q=${query}&spaces=${spaces}`, {
      method: "POST",
      body: JSON.stringify({ chatHistory }),
    });

    const reader = resp.body?.getReader();
    let done = false;
    while (!done && reader) {
      const { value, done: d } = await reader.read();
      done = d;

      setChatHistory((prevChatHistory) => {
        const newChatHistory = [...prevChatHistory];
        const lastAnswer = newChatHistory[newChatHistory.length - 1];
        if (!lastAnswer) return prevChatHistory;
        const txt = new TextDecoder().decode(value);

        if (isAutoScroll) {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth",
          });
        }

        lastAnswer.answer.parts.push({ text: txt });
        return newChatHistory;
      });
    }
  };

  useEffect(() => {
    if (q.trim().length > 0) {
      setLayout("chat");
      getAnswer(
        q,
        spaces.map((s) => s.id),
      );
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
            className="max-w-3xl relative flex mx-auto w-full flex-col mt-24 pb-32"
            key="chat"
          >
            {chatHistory.map((chat, idx) => (
              <div
                key={idx}
                className={`mt-8 ${idx != chatHistory.length - 1 ? "pb-2 border-b border-b-gray-400" : ""}`}
              >
                <h2
                  className={cn(
                    "text-white transition-all transform translate-y-0 opacity-100 duration-500 ease-in-out font-semibold text-2xl",
                  )}
                >
                  {chat.question}
                </h2>

                <div className="flex flex-col gap-2 mt-2">
                  <div
                    className={`${chat.answer.sources.length > 0 || chat.answer.parts.length === 0 ? "flex" : "hidden"}`}
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
                          className="relative flex gap-2 max-w-3xl overflow-auto no-scrollbar"
                          defaultChecked
                        >
                          {/* Loading state */}
                          {chat.answer.sources.length > 0 ||
                            (chat.answer.parts.length === 0 && (
                              <>
                                {[1, 2, 3, 4].map((_, idx) => (
                                  <div
                                    key={`loadingState-${idx}`}
                                    className="rounded-xl bg-secondary p-4 flex flex-col gap-2 min-w-72 animate-pulse"
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
                              className="rounded-xl bg-secondary p-4 flex flex-col gap-2 min-w-72"
                            >
                              <div className="flex justify-between text-foreground-menu text-sm">
                                <span>{source.type}</span>

                                {source.numChunks > 1 && (
                                  <span>{source.numChunks} chunks</span>
                                )}
                              </div>
                              <div className="text-base">{source.title}</div>
                              <div className="text-xs">
                                {source.content.length > 100
                                  ? source.content.slice(0, 100) + "..."
                                  : source.content}
                              </div>
                            </Link>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  {/* Summary */}
                  <div>
                    <div className="text-foreground-menu py-2">Summary</div>
                    <div className="text-base">
                      {chat.answer.parts.length === 0 && (
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
                        className="flex flex-col gap-2"
                      >
                        {removeJustificationFromText(
                          chat.answer.parts.map((part) => part.text).join(""),
                        )}
                      </Markdown>
                    </div>
                  </div>

                  {/* Justification */}
                  {chat.answer.justification &&
                    chat.answer.justification.length && (
                      <div
                        className={`${chat.answer.justification && chat.answer.justification.length > 0 ? "flex" : "hidden"}`}
                      >
                        <Accordion defaultValue={""} type="single" collapsible>
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
                                    .replaceAll("<justification>", "")
                                    .replaceAll("</justification>", "")
                                : "No justification provided."}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    )}
                </div>
              </div>
            ))}

            <div className="fixed bottom-0 w-full max-w-3xl pb-4">
              <QueryInput
                mini
                className="w-full shadow-md"
                initialQuery={""}
                initialSpaces={[]}
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
