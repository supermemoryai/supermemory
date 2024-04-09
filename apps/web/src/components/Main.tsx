"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FilterCombobox } from "./Sidebar/FilterCombobox";
import { Textarea2 } from "./ui/textarea";
import { ArrowRight } from "lucide-react";
import { MemoryDrawer } from "./MemoryDrawer";
import useViewport from "@/hooks/useViewport";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import SearchResults from "./SearchResults";
import { ChatHistory } from "../../types/memory";
import { ChatMessage } from "./ChatMessage";
import { useSession } from "next-auth/react";

function supportsDVH() {
  try {
    return CSS.supports("height: 100dvh");
  } catch {
    return false;
  }
}

export default function Main({ sidebarOpen }: { sidebarOpen: boolean }) {
  return <Chat sidebarOpen={sidebarOpen} />;

  const [hide, setHide] = useState(false);
  const [value, setValue] = useState("");
  const { width } = useViewport();
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { data: session } = useSession();

  // Variable to keep track of the chat history in this session
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);

  // TEMPORARY solution: Basically this is to just keep track of the sources used for each chat message
  // Not a great solution
  const [chatTextSourceDict, setChatTextSourceDict] = useState<
    Record<string, string>
  >({});

  // helper function to append a new msg
  const appendToChatHistory = useCallback(
    (role: "user" | "model", content: string) => {
      setChatHistory((prev) => [
        ...prev,
        {
          role,
          parts: [{ text: content }],
        },
      ]);
    },
    [],
  );

  // This is the streamed AI response we get from the server.
  const [aiResponse, setAIResponse] = useState("");

  const [toBeParsed, setToBeParsed] = useState("");

  const textArea = useRef<HTMLTextAreaElement>(null);
  const main = useRef<HTMLDivElement>(null);

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

  const handleStreamData = (newChunk: string) => {
    // Append the new chunk to the existing data to be parsed
    setToBeParsed((prev) => prev + newChunk);
  };

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
              // If the part is parsable and has the "response" field, update the AI response state
              setAIResponse((prev) => prev + parsedPart.response);
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

  const getSearchResults = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAiLoading(true);

    const sourcesResponse = await fetch(
      `/api/query?sourcesOnly=true&q=${value}`,
    );

    const sourcesInJson = (await sourcesResponse.json()) as {
      ids: string[];
    };

    setSearchResults(sourcesInJson.ids);

    const response = await fetch(`/api/query?q=${value}`);

    if (response.status !== 200) {
      setIsAiLoading(false);
      return;
    }

    if (response.body) {
      let reader = response.body.getReader();
      let decoder = new TextDecoder("utf-8");
      let result = "";

      // @ts-ignore
      reader.read().then(function processText({ done, value }) {
        if (done) {
          //   setSearchResults(JSON.parse(result.replace('data: ', '')));
          //   setIsAiLoading(false);
          return;
        }

        handleStreamData(decoder.decode(value));

        return reader.read().then(processText);
      });
    }
  };

  return (
    <main
      data-sidebar-open={sidebarOpen}
      ref={main}
      className={cn(
        "sidebar flex w-full flex-col items-end justify-center gap-5 px-5 pt-5 transition-[padding-left,padding-top,padding-right] delay-200 duration-200 md:items-center md:gap-10 md:px-72 [&[data-sidebar-open='true']]:pr-10 [&[data-sidebar-open='true']]:delay-0 md:[&[data-sidebar-open='true']]:pl-[calc(2.5rem+30vw)]",
        hide ? "" : "main-hidden",
      )}
    >
      <div className="flex w-full flex-col">
        {chatHistory.map((chat, index) => (
          <ChatMessage
            key={index}
            message={chat.parts[0].text}
            user={chat.role === "model" ? "ai" : session?.user!}
          />
        ))}
      </div>
      <h1 className="text-rgray-11 mt-auto w-full text-center text-3xl md:mt-0">
        Ask your Second brain
      </h1>

      <Textarea2
        ref={textArea}
        className="mt-auto h-max max-h-[30em] min-h-[3em] resize-y flex-row items-start justify-center overflow-auto py-5 md:mt-0 md:h-[20vh] md:resize-none md:flex-col md:items-center md:justify-center md:p-2 md:pb-2 md:pt-2"
        textAreaProps={{
          placeholder: "Ask your SuperMemory...",
          className:
            "h-auto overflow-auto md:h-full md:resize-none text-lg py-0 px-2 md:py-0 md:p-5 resize-y text-rgray-11 w-full min-h-[1em]",
          value,
          autoFocus: true,
          onChange: (e) => setValue(e.target.value),
        }}
      >
        <div className="text-rgray-11/70 flex h-full w-fit items-center justify-center pl-0 md:w-full md:p-2">
          <FilterCombobox className="hidden md:flex" />
          <button
            type="submit"
            disabled={value.trim().length < 1}
            className="text-rgray-11/70 bg-rgray-3 focus-visible:ring-rgray-8 hover:bg-rgray-4 mt-auto flex items-center justify-center rounded-full p-2 ring-2 ring-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:ml-auto md:mt-0"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </Textarea2>
      {/* {searchResults && (
        <SearchResults aiResponse={aiResponse} sources={searchResults} />
      )} */}
      {width <= 768 && <MemoryDrawer hide={hide} />}
    </main>
  );
}

export function Chat({ sidebarOpen }: { sidebarOpen: boolean }) {
  const [value, setValue] = useState("");

  return (
    <main
      data-sidebar-open={sidebarOpen}
      className={cn(
        "sidebar flex w-full flex-col items-end justify-center gap-5 px-5 pt-5 transition-[padding-left,padding-top,padding-right] delay-200 duration-200 md:items-center md:gap-10 md:px-72 [&[data-sidebar-open='true']]:pr-10 [&[data-sidebar-open='true']]:delay-0 md:[&[data-sidebar-open='true']]:pl-[calc(2.5rem+30vw)]",
      )}
    >
      <Textarea2
        // ref={textArea}
        className="mt-auto h-max max-h-[30em] min-h-[3em] resize-y flex-row items-start justify-center overflow-auto py-5 md:mt-0 md:h-[20vh] md:resize-none md:flex-col md:items-center md:justify-center md:p-2 md:pb-2 md:pt-2"
        textAreaProps={{
          placeholder: "Ask your SuperMemory...",
          className:
            "h-auto overflow-auto md:h-full md:resize-none text-lg py-0 px-2 md:py-0 md:p-5 resize-y text-rgray-11 w-full min-h-[1em]",
          value,
          autoFocus: true,
          onChange: (e) => setValue(e.target.value),
        }}
      >
        <div className="text-rgray-11/70 flex h-full w-fit items-center justify-center pl-0 md:w-full md:p-2">
          <FilterCombobox className="hidden md:flex" />
          <button
            type="submit"
            disabled={value.trim().length < 1}
            className="text-rgray-11/70 bg-rgray-3 focus-visible:ring-rgray-8 hover:bg-rgray-4 mt-auto flex items-center justify-center rounded-full p-2 ring-2 ring-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:ml-auto md:mt-0"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </Textarea2>
    </main>
  );
}
