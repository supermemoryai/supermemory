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
  {
    value: "4",
    label: "Cool People",
  },
  {
    value: "5",
    label: "Cool Projects",
  },
  {
    value: "6",
    label: "Cool Tools",
  },
  {
    value: "7",
    label: "Cool Websites",
  },
  {
    value: "8",
    label: "Cool Books",
  },
  {
    value: "9",
    label: "Cool Videos",
  },
  {
    value: "10",
    label: "Cool Podcasts",
  },
  {
    value: "11",
    label: "Cool Articles",
  },
  {
    value: "12",
    label: "Cool Blogs",
  },
  {
    value: "13",
    label: "Cool News",
  },
  {
    value: "14",
    label: "Cool Forums",
  },
  {
    value: "15",
    label: "Cool Communities",
  },
  {
    value: "16",
    label: "Cool Events",
  },
  {
    value: "17",
    label: "Cool Jobs",
  },
  {
    value: "18",
    label: "Cool Companies",
  },
  {
    value: "19",
    label: "Cool Startups",
  },
  {
    value: "20",
    label: "Cool Investors",
  },
  {
    value: "21",
    label: "Cool Funds",
  },
  {
    value: "22",
    label: "Cool Incubators",
  },
  {
    value: "23",
    label: "Cool Accelerators",
  },
  {
    value: "24",
    label: "Cool Hackathons",
  },
  {
    value: "25",
    label: "Cool Conferences",
  },
  {
    value: "26",
    label: "Cool Workshops",
  },
  {
    value: "27",
    label: "Cool Seminars",
  },
  {
    value: "28",
    label: "Cool Webinars",
  },
  {
    value: "29",
    label: "Cool Courses",
  },
  {
    value: "30",
    label: "Cool Bootcamps",
  },
  {
    value: "31",
    label: "Cool Certifications",
  },
];

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function FilterCombobox({ className, ...props }: Props) {
  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState<string[]>([]);

  const sortedSpaces = spaces.sort(({ value: a }, { value: b }) =>
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
                  .find((s) => s.value === val)
                  ?.label.toLowerCase()
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
                        key={space.value}
                        value={space.value}
                        onSelect={(val) => {
                          setValues((prev) =>
                            prev.includes(val)
                              ? prev.filter((v) => v !== val)
                              : [...prev, val],
                          );
                        }}
                        asChild
                      >
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, transition: { delay: 0.05 } }}
                          transition={{ duration: 0.15 }}
                          layout
                          layoutId={`space-combobox-${space.value}`}
                          className="text-rgray-11"
                        >
                          <SpaceIcon className="mr-2 h-4 w-4" />
                          {space.label}
                          {values.includes(space.value)}
                          <Check
                            data-state-on={values.includes(space.value)}
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
