"use client";

import { AnimatePresence } from "framer-motion";
import React, { useEffect, useState } from "react";
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
        parts: [
          // {
          //   text: `It seems like there might be a typo in your question. Could you please clarify or provide more context? If you meant "interesting," please let me know what specific information or topic you find interesting, and I can help you with that.`,
          // },
        ],
        sources: [],
      },
    },
  ]);

  const router = useRouter();

  const getAnswer = async (query: string, spaces: string[]) => {
    const resp = await fetch(`/api/chat?q=${query}&spaces=${spaces}`, {
      method: "POST",
      body: JSON.stringify({ chatHistory }),
    });

    const reader = resp.body?.getReader();
    let done = false;
    let result = "";
    while (!done && reader) {
      const { value, done: d } = await reader.read();
      done = d;

      setChatHistory((prevChatHistory) => {
        const newChatHistory = [...prevChatHistory];
        const lastAnswer = newChatHistory[newChatHistory.length - 1];
        if (!lastAnswer) return prevChatHistory;
        lastAnswer.answer.parts.push({ text: new TextDecoder().decode(value) });
        return newChatHistory;
      });
    }

    console.log(result);
  };

  useEffect(() => {
    if (q.trim().length > 0) {
      getAnswer(
        q,
        spaces.map((s) => s.id),
      );
      setTimeout(() => {
        setLayout("chat");
      }, 300);
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
              <QueryInput initialQuery={q} initialSpaces={[]} disabled />
            </div>
          </motion.div>
        ) : (
          <div
            className="max-w-3xl flex mx-auto w-full flex-col mt-24"
            key="chat"
          >
            {chatHistory.map((chat, idx) => (
              <div
                key={idx}
                className={`mt-8 ${idx != chatHistory.length - 1 ? "pb-2 border-b" : ""}`}
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
                            <div
                              key={idx}
                              className="rounded-xl bg-secondary p-4 flex flex-col gap-2 min-w-72"
                            >
                              <div className="text-foreground-menu">
                                {source.type}
                              </div>
                              <div>{source.title}</div>
                            </div>
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
                        {chat.answer.parts.map((part) => part.text).join("")}
                      </Markdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChatWindow;
