"use client";

import { ArrowRightIcon } from "@repo/ui/icons";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import Divider from "@repo/ui/shadcn/divider";
import { useRouter } from "next/navigation";
import { getSpaces } from "@/app/actions/fetchers";
import Combobox from "@repo/ui/shadcn/combobox";
import { MinusIcon } from "lucide-react";

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
    <div className={`${className}`}>
      <div
        className={`bg-secondary border-2 border-b-0 border-border ${!mini ? "rounded-t-3xl" : "rounded-3xl"}`}
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
            className="bg-transparent pt-2.5 text-base placeholder:text-[#9B9B9B] focus:text-gray-200 duration-200 tracking-[3%] outline-none resize-none w-full p-4"
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
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(q, preparedSpaces);
            }}
            disabled={disabled}
            className="h-12 w-12 rounded-[14px] bg-border all-center shrink-0 hover:brightness-125 duration-200 outline-none focus:outline focus:outline-primary active:scale-90"
          >
            <Image src={ArrowRightIcon} alt="Right arrow icon" />
          </button>
        </form>
      </div>
      {/* selected sources */}
      {!mini && (
        <>
          <Divider />
          <div className="flex justify-between items-center gap-6 h-auto bg-secondary rounded-b-3xl border-2 border-border">
            <Combobox
              options={options}
              onSelect={(v) =>
                setSelectedSpaces((prev) => {
                  if (v === "") {
                    return [];
                  }
                  return [...prev, parseInt(v)];
                })
              }
              onSubmit={() => {}}
              placeholder="Filter spaces..."
            />

            <div className="flex flex-row gap-0.5 h-full">
              {preparedSpaces.map((x, idx) => (
                <button
                  key={x.id}
                  onClick={() =>
                    setSelectedSpaces((prev) => prev.filter((y) => y !== x.id))
                  }
                  className={`relative group p-2 py-3 bg-[#3C464D] max-w-32 ${idx === preparedSpaces.length - 1 ? "rounded-br-xl" : ""}`}
                >
                  <p className="line-clamp-1">{x.name}</p>
                  <div className="absolute h-full right-0 top-0 p-1 opacity-0 group-hover:opacity-100 items-center">
                    <MinusIcon className="w-6 h-6 rounded-full bg-secondary" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default QueryInput;
