import { ArrowRightIcon, MemoriesIcon, SelectIcon } from "@repo/ui/src/icons";
import Image from "next/image";
import React from "react";
import Divider from "@repo/ui/src/shadcn/divider";

function QueryInput() {
  return (
    <div className="bg-secondary h- [68px] rounded-[24px] w-full mt-40">
      {/* input and action button */}
      <div className="flex gap-4 p-3">
        <textarea
          name="query-input"
          cols={30}
          rows={7}
          className="bg-transparent pt-2.5 text-base text-[#989EA4] focus:text-foreground duration-200 tracking-[3%] outline-none resize-none w-full p-1"
          placeholder="Ask your second brain..."
        ></textarea>

        <button className="h-12 w-12 rounded-[14px] bg-[#21303D] all-center shrink-0 hover:brightness-125 duration-200 outline-none focus:outline focus:outline-primary active:scale-90">
          <Image src={ArrowRightIcon} alt="Right arrow icon" />
        </button>
      </div>

      <Divider />

      {/* suggestions */}
      <div className="flex items-center gap-6 p-2">
        <button className="bg-[#2B3237] h-9 p-2 px-3 flex items-center gap-2 rounded-full">
          <Image src={MemoriesIcon} alt="Memories icon" className="w-5" />
          <span className="pr-3">Filters</span>
          <Image src={SelectIcon} alt="Select icon" className="w-4" />
        </button>
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
