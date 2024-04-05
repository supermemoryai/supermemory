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
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useMemory } from "@/contexts/MemoryContext";

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function FilterCombobox({ className, ...props }: Props) {
  const { spaces, addSpace } = useMemory();

  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState<number[]>([]);

  const sortedSpaces = spaces.sort(({ id: a }, { id: b }) =>
    values.includes(a) && !values.includes(b)
      ? -1
      : values.includes(b) && !values.includes(a)
        ? 1
        : 0,
  );

  console.log(sortedSpaces, values);

  return (
    <AnimatePresence mode="popLayout">
      <LayoutGroup>
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
                  .find((s) => s.id.toString() === val)
                  ?.title.toLowerCase()
                  .includes(search.toLowerCase().trim())
                  ? 1
                  : 0
              }
            >
              <CommandInput placeholder="Filter spaces..." />
              <CommandList asChild>
                <motion.div layoutScroll>
                  <CommandEmpty>Nothing found</CommandEmpty>
                  <CommandGroup>
                    {sortedSpaces.map((space) => (
                      <CommandItem
                        key={space.id}
                        value={space.id.toString()}
                        onSelect={(val) => {
                          setValues((prev) =>
                            prev.includes(parseInt(val))
                              ? prev.filter((v) => v !== parseInt(val))
                              : [...prev, parseInt(val)],
                          );
                        }}
                        asChild
                      >
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, transition: { delay: 0.05 } }}
                          transition={{ duration: 0.15 }}
                          layout
                          layoutId={`space-combobox-${space.id}`}
                          className="text-rgray-11"
                        >
                          <SpaceIcon className="mr-2 h-4 w-4" />
                          {space.title}
                          {values.includes(space.id)}
                          <Check
                            data-state-on={values.includes(space.id)}
                            className={cn(
                              "on:opacity-100 ml-auto h-4 w-4 opacity-0",
                            )}
                          />
                        </motion.div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </motion.div>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </LayoutGroup>
    </AnimatePresence>
  );
}
