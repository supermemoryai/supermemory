"use client";

import { ArrowRightIcon, MemoriesIcon, SelectIcon } from "@repo/ui/icons";
import Image from "next/image";
import React from "react";
import Divider from "@repo/ui/shadcn/divider";
import { redirect } from "next/navigation";
import { navigate } from "./actions";
import { FilterSpaces } from "@repo/ui/components/filterSpaces";

function QueryInput() {
  const [q, setQ] = React.useState("");

  const parseQ = React.useCallback(() => {
    const newQ = q.replace(/\n/g, "\\n");
    return newQ;
  }, [q]);

  const [selectedSpaces, setSelectedSpaces] = React.useState<number[]>([]);

  return (
    <div className="bg-secondary rounded-[24px] w-full mt-40">
      {/* input and action button */}
      <form action={async () => navigate(parseQ())} className="flex gap-4 p-3">
        <textarea
          name="q"
          cols={30}
          rows={4}
          className="bg-transparent pt-2.5 text-base text-[#989EA4] focus:text-foreground duration-200 tracking-[3%] outline-none resize-none w-full p-4"
          placeholder="Ask your second brain..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!e.shiftKey) navigate(parseQ());
            }
          }}
          onChange={(e) => setQ(e.target.value)}
          value={q}
        />

        <button
          type="submit"
          className="h-12 w-12 rounded-[14px] bg-[#21303D] all-center shrink-0 hover:brightness-125 duration-200 outline-none focus:outline focus:outline-primary active:scale-90"
        >
          <Image src={ArrowRightIcon} alt="Right arrow icon" />
        </button>
      </form>

      <Divider />

      {/* selected sources */}
      <div className="flex items-center gap-6 p-2">
        {/* <button className="bg-[#2B3237] h-9 p-2 px-3 flex items-center gap-2 rounded-full">
          <Image src={MemoriesIcon} alt="Memories icon" className="w-5" />
          <span className="pr-3">Filters</span>
          <Image src={SelectIcon} alt="Select icon" className="w-4" />
        </button> */}
        <FilterSpaces
          name="Filters"
          selectedSpaces={selectedSpaces}
          setSelectedSpaces={setSelectedSpaces}
          //   side="top"
          //   align="start"
          //   className="mr-auto bg-[#252525] md:hidden"
          spaces={[
            {
              name: "Nvidia",
              id: 2,
            },
            {
              name: "Open-source",
              id: 3,
            },
            {
              name: "Artificial Intelligence",
              id: 4,
            },
          ]}
        />

        <div className="flex gap-6 brightness-75">
          <p>Nvidia</p>
          <p>Open-source</p>
          <p>Artificial Intelligence</p>
        </div>
      </div>
    </div>
  );
}

export default QueryInput;
