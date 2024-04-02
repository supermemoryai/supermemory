"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SpaceIcon } from "@/assets/Memories";

const spaces = [
  {
    value: "1",
    label: "Cool Tech",
  },
  {
    value: "2",
    label: "Cool Courses",
  },
  {
    value: "3",
    label: "Cool Libraries",
  },
];

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function FilterCombobox({ className, ...props }: Props) {
  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState<string[]>([]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-state-on={open}
          className={cn(
            "text-rgray-11/70 on:bg-rgray-3 focus-visible:ring-rgray-8 hover:bg-rgray-3 relative flex items-center justify-center gap-1 rounded-md px-3 py-1.5 ring-2 ring-transparent focus-visible:outline-none",
            className,
          )}
          {...props}
        >
          <SpaceIcon className="mr-1 h-5 w-5" />
          Filter
          <ChevronsUpDown className="h-4 w-4" />
          <div
            data-state-on={values.length > 0}
            className="on:flex text-rgray-11 border-rgray-6 bg-rgray-2 absolute left-0 top-0 hidden aspect-[1] h-4 w-4 -translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full border text-center text-[9px]"
          >
            {values.length}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command
          filter={(val, search) =>
            spaces
              .find((s) => s.value === val)
              ?.label.toLowerCase()
              .includes(search.toLowerCase().trim())
              ? 1
              : 0
          }
        >
          <CommandInput placeholder="Filter spaces..." />
          <CommandList>
            <CommandEmpty>Nothing found</CommandEmpty>
            {/* bug: doesn't work on clicking with mouse only keyboard, weird */}
            <CommandGroup>
              {spaces.map((space) => (
                <CommandItem
                  key={space.value}
                  value={space.value}
                  onSelect={(val) => {
                    setValues((prev) =>
                      prev.includes(val)
                        ? prev.filter((v) => v !== val)
                        : [...prev, val],
                    );
                  }}
                >
                  <SpaceIcon className="mr-2 h-4 w-4" />
                  {space.label}
                  {values.includes(space.value)}
                  <Check
                    data-state-on={values.includes(space.value)}
                    className={cn("on:opacity-100 ml-auto h-4 w-4 opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
