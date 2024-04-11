"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FilterCombobox } from "./Sidebar/FilterCombobox";
import { Textarea2 } from "./ui/textarea";
import { ArrowRight, ArrowUp } from "lucide-react";
import { MemoryDrawer } from "./MemoryDrawer";
import useViewport from "@/hooks/useViewport";
import { AnimatePresence, motion } from "framer-motion";
import { cn, countLines } from "@/lib/utils";
import { ChatHistory } from "../../types/memory";
import { ChatAnswer, ChatMessage, ChatQuestion } from "./ChatMessage";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemory } from "@/contexts/MemoryContext";
import WordMark from "./WordMark";

function supportsDVH() {
  try {
    return CSS.supports("height: 100dvh");
  } catch {
    return false;
  }
}

const failResponse = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. In volutpat bibendum ligula, nec consectetur purus iaculis eu. Sed venenatis magna at lacus efficitur, vel faucibus sem lobortis. Sed sit amet imperdiet eros, nec vestibulum ante. Integer ut eros pulvinar, tempus augue a, blandit nisl. Nulla ut ligula molestie, tincidunt ligula vitae, rhoncus tellus. Vestibulum molestie, orci nec scelerisque finibus, mauris eros convallis urna, vitae vehicula metus nisi id urna. Phasellus non metus et lectus sollicitudin convallis a sit amet turpis. Donec id lacinia sapien.

Donec eget eros diam. Ut enim nunc, placerat vitae augue vel, rutrum dapibus felis. Nulla et ultrices ex. In sed arcu eget lectus scelerisque semper. Nullam aliquam luctus ultrices. Morbi finibus nec dolor vitae mattis. Quisque ligula dui, ullamcorper sed blandit et, maximus vel quam. Nunc id eros id sapien tempor feugiat sit amet sed mi. Quisque feugiat hendrerit libero non cursus. Praesent convallis, diam eget ullamcorper bibendum, est tellus blandit velit, vel cursus diam turpis sed nisi.

Cras dictum tortor ex, id ullamcorper nibh mollis quis. Fusce mollis, massa vel sodales consectetur, lorem mi vehicula erat, id tincidunt lorem libero at augue. Suspendisse vitae enim varius, molestie augue ut, lobortis ipsum. Nam lobortis leo eget velit auctor, ac consequat nisl malesuada. Donec sed dapibus nunc. Curabitur euismod erat a erat viverra vestibulum lacinia quis nisl. Aenean rhoncus suscipit maximus. Aliquam vitae lectus est.

Sed rhoncus sem sapien, at posuere libero imperdiet eget. Maecenas in egestas quam. Duis non faucibus eros, nec sodales sem. Proin felis urna, dapibus eget ante vitae, porttitor bibendum nunc. Integer nec augue eget diam pulvinar vestibulum. Nulla lobortis libero tellus, eu commodo elit ullamcorper in. Sed semper ultricies turpis ac dignissim. Morbi at ligula non urna mollis interdum vitae sed nisi. Quisque mattis arcu eu nisl placerat ullamcorper. Cras aliquet risus sed hendrerit faucibus. Donec vitae ex quis magna cursus ultricies ut nec urna.

Integer molestie nulla interdum enim suscipit malesuada. Nullam eget ipsum et elit sagittis imperdiet sed dignissim sem. Fusce vitae tellus ligula. Donec eget mi varius, consequat eros sed, consectetur urna. Suspendisse potenti. Praesent posuere ullamcorper tincidunt. Donec bibendum, magna nec mollis posuere, nisi risus dictum mauris, sed gravida metus sapien vel ipsum. Etiam ultrices nulla tincidunt erat lacinia, sit amet bibendum libero posuere. Vestibulum vehicula lectus dolor, sit amet vehicula arcu ultricies nec. Proin blandit risus diam, vel finibus erat efficitur in. Suspendisse lacinia eros luctus posuere fermentum. Etiam sed lacus aliquam, vulputate est sed, venenatis ex. Aenean at nulla rhoncus, sollicitudin elit quis, auctor tortor. Donec semper, augue lacinia pharetra imperdiet, metus purus bibendum ex, et venenatis enim purus vitae nulla. Duis eu felis porta ligula laoreet viverra.
Answer
It seems like you've used placeholder text commonly known as "Lorem Ipsum," which is often used in design and publishing to simulate the appearance of written text. If you have any specific questions or need assistance with something related to this text, feel free to ask!
what is its purpose?
Sources
solopress.com favicon
typingpal.com favicon
View 2 more
Answer
The purpose of Lorem Ipsum, a commonly used placeholder text in design and publishing, is to create a natural-looking block of text that doesn't distract from the layout. It allows designers to visualize how text will appear in a design without the need for actual content to be written and approved. Lorem Ipsum helps in planning out where the content will sit on a page, focusing on the design rather than the specific content. This practice is particularly useful when the main emphasis is on the visual layout, allowing designers and clients to review templates without being distracted by the actual copy on the page
4
5
.
hello
`;

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

    const sourcesInJson = (await sourcesResponse.json()) as {
      ids: string[];
    };

    setIsAiLoading(false);
    setChatHistory((prev) => {
      const lastMessage = prev[prev.length - 1];
      return [
        ...prev.slice(0, prev.length - 1),
        {
          ...lastMessage,
          answer: {
            parts: lastMessage.answer.parts,
            sources: sourcesInJson.ids ?? [],
          },
        },
      ];
    });

    const actualSelectedSpaces = selectedSpaces.map(
      (space) => spaces.find((s) => s.id === space)?.title ?? "",
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
              "sidebar flex w-full flex-col items-end justify-center gap-5 px-5 pt-5 transition-[padding-left,padding-top,padding-right] delay-200 duration-200 md:items-center md:gap-10 md:px-72 [&[data-sidebar-open='true']]:pr-10 [&[data-sidebar-open='true']]:delay-0 md:[&[data-sidebar-open='true']]:pl-[calc(2.5rem+30vw)]",
              hide ? "" : "main-hidden",
            )}
          >
            <h1 className="text-rgray-11 mt-auto w-full text-center text-3xl font-bold tracking-tight md:mt-0">
              Never forget anything. You are now{" "}
              <span className="text-[#C9AC3E]">Smort</span>er.
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
                <FilterCombobox
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
          <FilterCombobox
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
