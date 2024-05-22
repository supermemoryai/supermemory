import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Globe, Text } from "lucide-react";
import { convertRemToPixels } from "@/lib/utils";
import { SpaceIcon } from "@/assets/Memories";
import Markdown from "react-markdown";
import { ChatHistory } from "../../types/memory";

export function ChatAnswer({
  children: message,
  sources,
  loading = false,
}: {
  children: string;
  sources?: ChatHistory["answer"]["sources"];
  loading?: boolean;
}) {
  return (
    <div className="flex h-max w-full flex-col items-start gap-5">
      {loading ? (
        <MessageSkeleton />
      ) : (
        <div className="chat-answer h-full w-full text-lg text-white/60">
          <Markdown>{message}</Markdown>
        </div>
      )}
      {!loading && sources && sources?.length > 0 && (
        <>
          <h1 className="animate-fade-in text-rgray-12 text-md flex items-center justify-center gap-2 opacity-0 [animation-duration:1s]">
            <SpaceIcon className="h-6 w-6 -translate-y-[2px]" />
            Related Memories
          </h1>
          <div className="animate-fade-in -mt-3 flex items-center justify-start gap-1 opacity-0 [animation-duration:1s]">
            {sources?.map((source) =>
              source.isNote ? (
                <button className="bg-rgray-3 flex items-center justify-center gap-2 rounded-full py-1 pl-2 pr-3 text-sm">
                  <Text className="h-4 w-4" />
                  {source.source}
                </button>
              ) : (
                <a
                  className="bg-rgray-3 flex items-center justify-center gap-2 rounded-full py-1 pl-2 pr-3 text-sm"
                  key={source.source}
                  href={source.source}
                  target="_blank"
                >
                  <Globe className="h-4 w-4" />
                  {cleanUrl(source.source)}
                </a>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ChatQuestion({ children }: { children: string }) {
  return (
    <div
      className={`text-rgray-12 h-max w-full text-left ${children.length > 200 ? "text-xl" : "text-2xl"}`}
    >
      {children}
    </div>
  );
}

export function ChatMessage({
  children,
  isLast = false,
  index,
}: {
  children: React.ReactNode | React.ReactNode[];
  isLast?: boolean;
  index: number;
}) {
  const messageRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLast) return;
    messageRef.current?.parentElement?.scrollTo({
      top: messageRef.current?.offsetTop,
      behavior: "smooth",
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "tween",
        duration: 0.5,
      }}
      ref={messageRef}
      className={`${index === 0 ? "pt-16" : "pt-28"} flex h-max w-full resize-y flex-col items-start justify-start gap-5 transition-[height] ${isLast ? "min-h-screen pb-[40vh]" : "h-max"}`}
    >
      {children}
    </motion.div>
  );
}

function MessageSkeleton() {
  return (
    <div className="animate-fade-in flex w-full flex-col items-start gap-3 opacity-0 [animation-delay:0.5s] [animation-duration:1s]">
      <div className="bg-rgray-5 h-6 w-full animate-pulse rounded-md text-lg"></div>
      <div className="bg-rgray-5 h-6 w-full animate-pulse rounded-md text-lg"></div>
      <div className="bg-rgray-5 h-6 w-full animate-pulse rounded-md text-lg"></div>
      <div className="bg-rgray-5 h-6 w-full animate-pulse rounded-md text-lg"></div>
      <div className="bg-rgray-5 h-6 w-[70%] animate-pulse rounded-md text-lg"></div>
    </div>
  );
}

function cleanUrl(url: string) {
  if (url.startsWith("https://")) {
    url = url.slice(8);
  } else if (url.startsWith("http://")) {
    url = url.slice(7);
  }

  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }

  return url;
}
