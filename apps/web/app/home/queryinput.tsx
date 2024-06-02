"use client";

import { ArrowRightIcon } from "@repo/ui/icons";
import Image from "next/image";
import React, { useCallback, useState } from "react";
import Divider from "@repo/ui/shadcn/divider";
import { MultipleSelector, Option } from "@repo/ui/shadcn/combobox";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const OPTIONS: Option[] = [
  { label: "nextjs", value: "0" },
  { label: "React", value: "1" },
  { label: "Remix", value: "2" },
  { label: "Vite", value: "3" },
  { label: "Nuxt", value: "4" },
  { label: "Vue", value: "5" },
  { label: "Svelte", value: "6" },
  { label: "Angular", value: "7" },
  { label: "Ember", value: "8" },
  { label: "Gatsby", value: "9" },
];

function QueryInput({
  initialQuery = "",
  initialSpaces = [],
  disabled = false,
}: {
  initialQuery?: string;
  initialSpaces?: number[];
  disabled?: boolean;
}) {
  const [q, setQ] = useState(initialQuery);

  const [selectedSpaces, setSelectedSpaces] = useState<number[]>(initialSpaces);

  const { push } = useRouter();

  const parseQ = () => {
    const newQ =
      "/chat?q=" +
      encodeURI(q) +
      (selectedSpaces ? "&spaces=" + selectedSpaces.join(",") : "");

    return newQ;
  };

  return (
    <div>
      <div className="bg-secondary rounded-t-[24px] w-full mt-40">
        {/* input and action button */}
        <form action={async () => push(parseQ())} className="flex gap-4 p-3">
          <textarea
            name="q"
            cols={30}
            rows={4}
            className="bg-transparent pt-2.5 text-base text-[#989EA4] focus:text-foreground duration-200 tracking-[3%] outline-none resize-none w-full p-4"
            placeholder="Ask your second brain..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!e.shiftKey) push(parseQ());
              }
            }}
            onChange={(e) => setQ(e.target.value)}
            value={q}
            disabled={disabled}
          />

          <button
            type="submit"
            disabled={disabled}
            className="h-12 w-12 rounded-[14px] bg-[#21303D] all-center shrink-0 hover:brightness-125 duration-200 outline-none focus:outline focus:outline-primary active:scale-90"
          >
            <Image src={ArrowRightIcon} alt="Right arrow icon" />
          </button>
        </form>

        <Divider />
      </div>
      {/* selected sources */}
      <div className="flex items-center gap-6 p-2 h-auto bg-secondary rounded-b-[24px]">
        <MultipleSelector
          disabled={disabled}
          defaultOptions={OPTIONS}
          onChange={(e) => setSelectedSpaces(e.map((x) => parseInt(x.value)))}
          placeholder="Focus on specific spaces..."
          emptyIndicator={
            <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
              no results found.
            </p>
          }
        />
      </div>
    </div>
  );
}

export default QueryInput;
