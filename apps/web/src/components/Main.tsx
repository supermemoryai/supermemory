"use client";
import { useState } from "react";
import { FilterCombobox } from "./Sidebar/FilterCombobox";
import { Textarea2 } from "./ui/textarea";
import { ArrowRight } from "lucide-react";

export default function Main({ sidebarOpen }: { sidebarOpen: boolean }) {
  const [value, setValue] = useState("");

  return (
    <main
      data-sidebar-open={sidebarOpen}
      className="flex h-screen w-full items-center justify-center px-60 [&[data-sidebar-open='true']]:px-20"
    >
      <Textarea2
        className="h-[20vh]"
        textAreaProps={{
          placeholder: "Ask your SuperMemory...",
          className: "text-lg p-2 text-rgray-11",
          value,
          onChange: (e) => setValue(e.target.value),
        }}
      >
        <div className="text-rgray-11/70 flex w-full items-center justify-center p-2 pl-0">
          <FilterCombobox />
          <button
            disabled={value.trim().length < 1}
            className="text-rgray-11/70 bg-rgray-3 focus-visible:ring-rgray-8 hover:bg-rgray-4 ml-auto flex items-center justify-center rounded-full p-2 ring-2 ring-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </Textarea2>
    </main>
  );
}
