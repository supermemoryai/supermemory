"use client";
import { useEffect, useRef, useState } from "react";
import { FilterCombobox } from "./Sidebar/FilterCombobox";
import { Textarea2 } from "./ui/textarea";
import { ArrowRight } from "lucide-react";
import { MemoryDrawer } from "./MemoryDrawer";
import useViewport from "@/hooks/useViewport";
import { motion } from "framer-motion";

export default function Main({ sidebarOpen }: { sidebarOpen: boolean }) {
  const [value, setValue] = useState("");
  const { width } = useViewport();

  const textArea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function onResize() {
      if (!textArea.current || !window.visualViewport) return;

      const visualViewportHeight = window.visualViewport.height;
    }

    window.visualViewport?.addEventListener("resize", onResize);
    return () => window.visualViewport?.removeEventListener("resize", onResize);
  }, []);

  return (
    <motion.main
      data-sidebar-open={sidebarOpen}
      className="flex h-screen max-h-screen w-full flex-col items-end justify-center gap-5 px-5 pb-[20vh] pt-5 transition-[padding] delay-200 duration-200 md:items-center md:px-72 [&[data-sidebar-open='true']]:pl-[calc(2.5rem+30vw)] [&[data-sidebar-open='true']]:pr-10 [&[data-sidebar-open='true']]:delay-0 "
    >
      <h1 className="text-rgray-11 text-center text-3xl">
        Ask your Second brain
      </h1>
      <Textarea2
        ref={textArea}
        className="h-max max-h-[30em] min-h-[3em] resize-y flex-row items-start justify-center overflow-auto py-5 md:h-[20vh] md:resize-none md:flex-col md:items-center md:justify-center md:p-2 md:pb-2 md:pt-2"
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
            disabled={value.trim().length < 1}
            className="text-rgray-11/70 bg-rgray-3 focus-visible:ring-rgray-8 hover:bg-rgray-4 mt-auto flex items-center justify-center rounded-full p-2 ring-2 ring-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:ml-auto md:mt-0"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </Textarea2>
      {width <= 768 && <MemoryDrawer />}
    </motion.main>
  );
}
