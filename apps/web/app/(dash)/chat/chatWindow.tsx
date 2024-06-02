"use client";

import { AnimatePresence } from "framer-motion";
import React, { useEffect, useState } from "react";
import QueryInput from "../home/queryinput";
import { cn } from "@repo/ui/lib/utils";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

function ChatWindow({ q }: { q: string }) {
  const [layout, setLayout] = useState<"chat" | "initial">("initial");

  const router = useRouter();

  useEffect(() => {
    if (q !== "") {
      setTimeout(() => {
        setLayout("chat");
      }, 300);
    } else {
      router.push("/home");
    }
  }, [q]);
  return (
    <div>
      <AnimatePresence mode="popLayout">
        {layout === "initial" ? (
          <motion.div
            exit={{ opacity: 0 }}
            key="initial"
            className="max-w-3xl flex mx-auto w-full flex-col"
          >
            <div className="w-full h-96">
              <QueryInput initialQuery={q} initialSpaces={[]} disabled />
            </div>
          </motion.div>
        ) : (
          <div
            className="max-w-3xl flex mx-auto w-full flex-col mt-8"
            key="chat"
          >
            <h2
              className={cn(
                "transition-all transform translate-y-0 opacity-100 duration-500 ease-in-out font-semibold text-2xl",
              )}
            >
              {q}
            </h2>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChatWindow;
