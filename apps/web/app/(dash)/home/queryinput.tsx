"use client";

import { ArrowRightIcon } from "@repo/ui/icons";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import Divider from "@repo/ui/shadcn/divider";
import { MultipleSelector, Option } from "@repo/ui/shadcn/combobox";
import { useRouter } from "next/navigation";
import { getSpaces } from "@/app/actions/fetchers";

function QueryInput({
  initialQuery = "",
  initialSpaces = [],
  disabled = false,
  className,
  mini = false,
  handleSubmit,
}: {
  initialQuery?: string;
  initialSpaces?: {
    id: number;
    name: string;
  }[];
  disabled?: boolean;
  className?: string;
  mini?: boolean;
  handleSubmit: (q: string, spaces: { id: number; name: string }[]) => void;
}) {
  const [q, setQ] = useState(initialQuery);

  const [selectedSpaces, setSelectedSpaces] = useState<number[]>([]);

  const options = useMemo(
    () =>
      initialSpaces.map((x) => ({
        label: x.name,
        value: x.id.toString(),
      })),
    [initialSpaces],
  );

  const preparedSpaces = useMemo(
    () =>
      initialSpaces
        .filter((x) => selectedSpaces.includes(x.id))
        .map((x) => {
          return {
            id: x.id,
            name: x.name,
          };
        }),
    [selectedSpaces, initialSpaces],
  );

  return (
    <div className={className}>
      <div
        className={`bg-secondary ${!mini ? "rounded-t-3xl" : "rounded-3xl"}`}
      >
        {/* input and action button */}
        <form
          action={async () => {
            handleSubmit(q, preparedSpaces);
            setQ("");
          }}
          className="flex gap-4 p-3"
        >
          <textarea
            name="q"
            cols={30}
            rows={mini ? 2 : 4}
            className="bg-transparent pt-2.5 text-base placeholder:text-[#5D6165] text-[#9DA0A4] focus:text-white duration-200 tracking-[3%] outline-none resize-none w-full p-4"
            placeholder="Ask your second brain..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit(q, preparedSpaces);
                setQ("");
              }
            }}
            onChange={(e) => setQ(e.target.value)}
            value={q}
            disabled={disabled}
          />

          <button
            type="submit"
            onClick={e => e.preventDefault()}
            disabled={disabled}
            className="h-12 w-12 rounded-[14px] bg-[#21303D] all-center shrink-0 hover:brightness-125 duration-200 outline-none focus:outline focus:outline-primary active:scale-90"
          >
            <Image src={ArrowRightIcon} alt="Right arrow icon" />
          </button>
        </form>
      </div>
      {/* selected sources */}
      {!mini && (
        <>
          <Divider />
          <div className="flex items-center gap-6 p-2 h-auto bg-secondary rounded-b-3xl">
            <MultipleSelector
              key={options.length}
              disabled={disabled}
              defaultOptions={options}
              onChange={(e) =>
                setSelectedSpaces(e.map((x) => parseInt(x.value)))
              }
              placeholder="Focus on specific spaces..."
              emptyIndicator={
                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                  no results found.
                </p>
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

export default QueryInput;
