"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FilterSpaces } from "./Sidebar/FilterCombobox";
import { Textarea2 } from "./ui/textarea";
import { ArrowRight, ArrowUp } from "lucide-react";
import { MemoryDrawer } from "./MemoryDrawer";
import useViewport from "@/hooks/useViewport";
import { AnimatePresence, motion } from "framer-motion";
import { cn, countLines, getIdsFromSource } from "@/lib/utils";
import { ChatHistory } from "../../types/memory";
import { ChatAnswer, ChatMessage, ChatQuestion } from "./ChatMessage";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemory } from "@/contexts/MemoryContext";

import Image from "next/image";

function supportsDVH() {
  try {
    return CSS.supports("height: 100dvh");
  } catch {
    return false;
  }
}

export default function Main({ sidebarOpen }: { sidebarOpen: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [hide, setHide] = useState(false);
  const [layout, setLayout] = useState<"chat" | "initial">("initial");
  const [value, setValue] = useState("");
  const { width } = useViewport();
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { spaces } = useMemory();

  // Variable to keep track of the chat history in this session
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);

  const [toBeParsed, setToBeParsed] = useState("");

  const textArea = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLDivElement>(null);

  const [selectedSpaces, setSelectedSpaces] = useState<number[]>([]);

  useEffect(() => {
    const search = searchParams.get("q");
    if (search && search.trim().length > 0) {
      setValue(search);
      onSend();
      router.push("/");
    }
  }, []);

  useEffect(() => {
    function onResize() {
      if (!main.current || !window.visualViewport) return;
      if (
        window.visualViewport.height < window.innerHeight + 20 &&
        window.visualViewport.height > window.innerHeight - 20
      ) {
        setHide(false);
        window.scrollTo(0, 0);
      } else {
        setHide(true);
        window.scrollTo(0, document.body.scrollHeight);
      }
    }

    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    // Define a function to try parsing the accumulated data
    const tryParseAccumulatedData = () => {
      // Attempt to parse the "toBeParsed" state as JSON
      try {
        // Split the accumulated data by the known delimiter "\n\n"
        const parts = toBeParsed.split("\n\n");
        let remainingData = "";

        // Process each part to extract JSON objects
        parts.forEach((part, index) => {
          try {
            const parsedPart = JSON.parse(part.replace("data: ", "")); // Try to parse the part as JSON

            // If the part is the last one and couldn't be parsed, keep it to  accumulate more data
            if (index === parts.length - 1 && !parsedPart) {
              remainingData = part;
            } else if (parsedPart && parsedPart.response) {
              // Append to chat history in this way:
              // If the last message was from the model, append to that message
              // Otherwise, Start a new message from the model and append to that
              if (chatHistory.length > 0) {
                setChatHistory((prev: ChatHistory[]) => {
                  const lastMessage = prev[prev.length - 1];
                  const newParts = [
                    ...lastMessage.answer.parts,
                    { text: parsedPart.response },
                  ];
                  return [
                    ...prev.slice(0, prev.length - 1),
                    {
                      ...lastMessage,
                      answer: {
                        parts: newParts,
                        sources: lastMessage.answer.sources,
                      },
                    },
                  ];
                });
              } else {
              }
            }
          } catch (error) {
            // If parsing fails and it's not the last part, it's a malformed JSON
            if (index !== parts.length - 1) {
              console.error("Malformed JSON part: ", part);
            } else {
              // If it's the last part, it may be incomplete, so keep it
              remainingData = part;
            }
          }
        });

        // Update the toBeParsed state to only contain the unparsed remainder
        if (remainingData !== toBeParsed) {
          setToBeParsed(remainingData);
        }
      } catch (error) {
        console.error("Error parsing accumulated data: ", error);
      }
    };

    // Call the parsing function if there's data to be parsed
    if (toBeParsed) {
      tryParseAccumulatedData();
    }
  }, [toBeParsed]);

  const modifyChatHistory = useCallback((old: ChatHistory[]) => {
    const final: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    old.forEach((chat) => {
      final.push({
        role: "user",
        parts: [{ text: chat.question }],
      });
      final.push({
        role: "model",
        parts: chat.answer.parts.map((part) => ({ text: part.text })),
      });
    });

    return final;
  }, []);

  const getSearchResults = async () => {
    setIsAiLoading(true);

    const _value = value.trim();
    setValue("");

    setChatHistory((prev) => [
      ...prev,
      {
        question: _value,
        answer: {
          parts: [],
          sources: [],
        },
      },
    ]);

    const sourcesResponse = await fetch(
      `/api/chat?sourcesOnly=true&q=${_value}`,
      {
        method: "POST",
        body: JSON.stringify({
          chatHistory: modifyChatHistory(chatHistory),
        }),
      },
    );

    console.log(await sourcesResponse.json());

    // const sourcesInJson = (await sourcesResponse.json()) as {
    //   ids: string[];
    // };

    // console.log(sourcesInJson)
    const sourcesInJson = { ids: [] };

    setIsAiLoading(false);
    setChatHistory((prev) => {
      const lastMessage = prev[prev.length - 1];
      return [
        ...prev.slice(0, prev.length - 1),
        {
          ...lastMessage,
          answer: {
            parts: lastMessage.answer.parts,
            sources: getIdsFromSource(sourcesInJson.ids) ?? [],
          },
        },
      ];
    });

    const actualSelectedSpaces = selectedSpaces.map(
      (space) => spaces.find((s) => s.id === space)?.name ?? "",
    );

    const response = await fetch(
      `/api/chat?q=${_value}&spaces=${actualSelectedSpaces.join(",")}`,
      {
        method: "POST",
        body: JSON.stringify({
          chatHistory: modifyChatHistory(chatHistory),
        }),
      },
    );

    if (response.status !== 200) {
      setIsAiLoading(false);
      return;
    }

    if (response.body) {
      let reader = response.body?.getReader();
      let decoder = new TextDecoder("utf-8");
      let result = "";

      // @ts-ignore
      reader.read().then(function processText({ done, value }) {
        if (done) {
          setIsAiLoading(false);
          setToBeParsed("");
          setValue("");

          return;
        }
        setToBeParsed((prev) => prev + decoder.decode(value));

        return reader?.read().then(processText);
      });
    }
  };

  const onSend = async () => {
    setLayout("chat");
    await getSearchResults();
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {layout === "chat" ? (
          <Chat
            key="chat"
            isLoading={isAiLoading}
            chatHistory={chatHistory}
            sidebarOpen={sidebarOpen}
            askQuestion={onSend}
            setValue={setValue}
            value={value}
          />
        ) : (
          <main
            data-sidebar-open={sidebarOpen}
            ref={main}
            className={cn(
              "sidebar relative flex w-full flex-col items-end justify-center gap-5 px-5 pt-5 transition-[padding-left,padding-top,padding-right] delay-200 duration-200 md:items-center md:gap-10 md:px-72 [&[data-sidebar-open='true']]:pr-10 [&[data-sidebar-open='true']]:delay-0 md:[&[data-sidebar-open='true']]:pl-[calc(2.5rem+30vw)]",
              hide ? "" : "main-hidden",
            )}
          >
            <Image
              className="absolute right-10 top-10 rounded-md"
              src="/icons/logo_bw_without_bg.png"
              alt="Smort logo"
              width={50}
              height={50}
            />
            <h1 className="text-rgray-11 mt-auto w-full text-center text-3xl font-bold tracking-tight md:mt-0">
              Ask your second brain
            </h1>

            <Textarea2
              ref={textArea}
              exit={{
                opacity: 0,
                y: 50,
              }}
              transition={{
                type: "tween",
                duration: 0.2,
              }}
              textAreaProps={{
                placeholder: "Ask your second brain...",
                className:
                  "h-auto overflow-auto md:h-full md:resize-none text-lg py-0 px-2 pt-2 md:py-0 md:p-5 resize-y text-rgray-11 w-full min-h-[1em]",
                value,
                autoFocus: true,
                onChange: (e) => setValue(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    onSend();
                  }
                },
              }}
            >
              <div className="text-rgray-11/70 flex h-full w-fit items-center justify-center pl-0 md:w-full md:p-2">
                <FilterSpaces
                  name={"Filter"}
                  onClose={() => {
                    textArea.current?.querySelector("textarea")?.focus();
                  }}
                  className="hidden md:flex"
                  selectedSpaces={selectedSpaces}
                  setSelectedSpaces={setSelectedSpaces}
                />
                <button
                  onClick={onSend}
                  disabled={value.trim().length < 1}
                  className="text-rgray-11/70 bg-rgray-3 focus-visible:ring-rgray-8 hover:bg-rgray-4 mt-auto flex items-center justify-center rounded-full p-2 ring-2 ring-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:ml-auto md:mt-0"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </Textarea2>
            {width <= 768 && <MemoryDrawer hide={hide} />}
          </main>
        )}
      </AnimatePresence>
    </>
  );
}

export function Chat({
  sidebarOpen,
  chatHistory,
  isLoading = false,
  askQuestion,
  setValue,
  value,
}: {
  sidebarOpen: boolean;
  isLoading?: boolean;
  chatHistory: ChatHistory[];
  askQuestion: () => void;
  setValue: (value: string) => void;
  value: string;
}) {
  const textArea = useRef<HTMLDivElement>(null);

  function onValueChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setValue(value);
    const lines = countLines(e.target);
    e.target.rows = Math.min(5, lines);
  }

  return (
    <main
      data-sidebar-open={sidebarOpen}
      className={cn(
        "sidebar relative flex w-full flex-col items-end gap-5 px-5 pt-5 transition-[padding-left,padding-top,padding-right] delay-200 duration-200 md:items-center md:gap-10 md:px-72 [&[data-sidebar-open='true']]:pr-10 [&[data-sidebar-open='true']]:delay-0 md:[&[data-sidebar-open='true']]:pl-[calc(2.5rem+30vw)]",
      )}
    >
      <div className="scrollbar-none h-screen w-full overflow-y-auto px-5">
        {chatHistory.map((msg, i) => (
          <ChatMessage index={i} key={i} isLast={i === chatHistory.length - 1}>
            <ChatQuestion>{msg.question}</ChatQuestion>
            <ChatAnswer
              loading={i === chatHistory.length - 1 ? isLoading : false}
              sources={msg.answer.sources}
            >
              {msg.answer.parts.map((part) => part.text).join(" ")}
            </ChatAnswer>
          </ChatMessage>
        ))}
      </div>
      <div className="from-rgray-2 via-rgray-2 to-rgray-2/0 absolute bottom-0 left-0 h-[30%] w-full bg-gradient-to-t" />
      <div
        data-sidebar-open={sidebarOpen}
        className="absolute flex w-full items-center justify-center"
      >
        <div className="animate-from-top fixed bottom-10 mt-auto flex w-[50%] flex-col items-start justify-center gap-2">
          <FilterSpaces
            name={"Filter"}
            onClose={() => {
              textArea.current?.querySelector("textarea")?.focus();
            }}
            side="top"
            align="start"
            className="bg-[#252525]"
            // TODO: SPACES FILTER HERE
            selectedSpaces={[]}
            setSelectedSpaces={(spaces) => {}}
          />
          <Textarea2
            ref={textArea}
            className="bg-rgray-2 h-auto w-full flex-row items-start justify-center overflow-auto px-3 md:items-center md:justify-center"
            textAreaProps={{
              placeholder: "Ask your SuperMemory...",
              className:
                "overflow-auto h-auto p-3 md:resize-none text-lg w-auto resize-y text-rgray-11 w-full",
              value,
              rows: 1,
              autoFocus: true,
              onChange: onValueChange,
              onKeyDown: (e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  askQuestion();
                }
              },
            }}
          >
            <div className="text-rgray-11/70 ml-auto mt-auto flex h-full w-min items-center justify-center pb-3 pr-2">
              <button
                onClick={askQuestion}
                disabled={value.trim().length < 1}
                className="text-rgray-11/70 bg-rgray-3 focus-visible:ring-rgray-8 hover:bg-rgray-4 mt-auto flex items-center justify-center rounded-full p-2 ring-2 ring-transparent transition-[filter] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </Textarea2>
        </div>
      </div>
    </main>
  );
}
