import React from "react";
import Divider from "../shadcn/divider";
import { ArrowRightIcon } from "../icons";
import Image from "next/image";

function QueryInput() {
  return (
    <div>
      <div className="bg-secondary rounded-[20px] h-[68 px]">
        {/* input and action button */}
        <form className="flex gap-4 p-2.5">
          <textarea
            name="q"
            cols={30}
            rows={4}
            className="bg-transparent h-12 focus:h-[128px] no-scrollbar pt-3 px-2 text-base placeholder:text-[#5D6165] text-[#9DA0A4] focus:text-white duration-200 tracking-[3%] outline-none resize-none w-full"
            placeholder="Ask your second brain..."
            // onKeyDown={(e) => {
            //   if (e.key === "Enter") {
            //     e.preventDefault();
            //     if (!e.shiftKey) push(parseQ());
            //   }
            // }}
            // onChange={(e) => setQ(e.target.value)}
            // value={q}
            // disabled={disabled}
          />

          <button
            // type="submit"
            // onClick={e => e.preventDefault()}
            // disabled={disabled}
            className="h-12 w-12 rounded-[14px] bg-[#21303D] all-center shrink-0 hover:brightness-125 duration-200 outline-none focus:outline focus:outline-primary active:scale-90"
          >
            <Image src={ArrowRightIcon} alt="Right arrow icon" />
          </button>
        </form>

        {/* <Divider /> */}
      </div>
      {/* selected sources */}
      {/* <div className="flex items-center gap-6 p-2 h-auto bg-secondary"> */}
      {/* <MultipleSelector
            key={options.length}
            disabled={disabled}
            defaultOptions={options}
            onChange={(e) => setSelectedSpaces(e.map((x) => parseInt(x.value)))}
            placeholder="Focus on specific spaces..."
            emptyIndicator={
              <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                no results found.
              </p>
            }
          /> */}
      {/* </div> */}
    </div>
  );
}

export default QueryInput;
