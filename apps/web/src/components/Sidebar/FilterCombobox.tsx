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
import { SearchResult, useMemory } from "@/contexts/MemoryContext";
import { useDebounce } from "@/hooks/useDebounce";
import { StoredContent } from "@/server/db/schema";

export interface FilterSpacesProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  side?: "top" | "bottom";
  align?: "end" | "start" | "center";
  onClose?: () => void;
  selectedSpaces: number[];
  setSelectedSpaces: (
    spaces: number[] | ((prev: number[]) => number[]),
  ) => void;
  name: string;
}

export function FilterSpaces({
  className,
  side = "bottom",
  align = "center",
  onClose,
  selectedSpaces,
  setSelectedSpaces,
  name,
  ...props
}: FilterSpacesProps) {
  const { spaces } = useMemory();
  const [open, setOpen] = React.useState(false);

  const sortedSpaces = spaces.sort(({ id: a }, { id: b }) =>
    selectedSpaces.includes(a) && !selectedSpaces.includes(b)
      ? -1
      : selectedSpaces.includes(b) && !selectedSpaces.includes(a)
        ? 1
        : 0,
  );

  React.useEffect(() => {
    if (!open) {
      onClose?.();
    }
  }, [open]);

  return (
    <AnimatePresence mode="popLayout">
      <LayoutGroup>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type={undefined}
              data-state-on={open}
              className={cn(
                "text-rgray-11/70 on:bg-rgray-3 focus-visible:ring-rgray-8 hover:bg-rgray-3 relative flex items-center justify-center gap-1 rounded-md px-3 py-1.5 ring-2 ring-transparent focus-visible:outline-none",
                className,
              )}
              {...props}
            >
              <SpaceIcon className="mr-1 h-5 w-5" />
              {name}
              <ChevronsUpDown className="h-4 w-4" />
              <div
                data-state-on={selectedSpaces.length > 0}
                className="on:flex text-rgray-11 border-rgray-6 bg-rgray-2 absolute left-0 top-0 hidden aspect-[1] h-4 w-4 -translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full border text-center text-[9px]"
              >
                {selectedSpaces.length}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent
            onCloseAutoFocus={(e) => e.preventDefault()}
            align={align}
            side={side}
            className="w-[200px] p-0"
          >
            <Command
              filter={(val, search) =>
                spaces
                  .find((s) => s.id.toString() === val)
                  ?.name.toLowerCase()
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
                          setSelectedSpaces((prev: number[]) =>
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
                          {space.name}
                          {selectedSpaces.includes(space.id)}
                          <Check
                            data-state-on={selectedSpaces.includes(space.id)}
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

export type FilterMemoriesProps = {
  side?: "top" | "bottom";
  align?: "end" | "start" | "center";
  onClose?: () => void;
  selected: StoredContent[];
  setSelected: React.Dispatch<React.SetStateAction<StoredContent[]>>;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function FilterMemories({
  className,
  side = "bottom",
  align = "center",
  onClose,
  selected,
  setSelected,
  ...props
}: FilterMemoriesProps) {
  const { search } = useMemory();

  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const query = useDebounce(searchQuery, 500);

  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  const results = React.useMemo(() => {
    return searchResults.map((r) => r.memory);
  }, [searchResults]);

  console.log("memoized", results);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length > 0) {
      setIsSearching(true);
      (async () => {
        const results = await search(q, {
          filter: {
            memories: true,
            spaces: false,
          },
        });
        setSearchResults(results);
        setIsSearching(false);
      })();
    } else {
      setSearchResults([]);
    }
  }, [query]);

  React.useEffect(() => {
    if (!open) {
      onClose?.();
    }
  }, [open]);

  console.log(searchResults);
  return (
    <AnimatePresence mode="popLayout">
      <LayoutGroup>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type={undefined}
              data-state-on={open}
              className={cn(
                "text-rgray-11/70 on:bg-rgray-3 focus-visible:ring-rgray-8 hover:bg-rgray-3 relative flex items-center justify-center gap-1 rounded-md px-3 py-1.5 ring-2 ring-transparent focus-visible:outline-none",
                className,
              )}
              {...props}
            >
              {props.children}
            </button>
          </PopoverTrigger>
          <PopoverContent
            onCloseAutoFocus={(e) => e.preventDefault()}
            align={align}
            side={side}
            className="w-[200px] p-0"
          >
            <Command shouldFilter={false}>
              <CommandInput
                isSearching={isSearching}
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder="Filter memories..."
              />
              <CommandList>
                <CommandGroup>
                  <CommandEmpty className="text-rgray-11 py-5 text-center text-sm">
                    {isSearching
                      ? "Searching..."
                      : query.trim().length > 0
                        ? "Nothing Found"
                        : "Search something"}
                  </CommandEmpty>
                  {results.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={m.id.toString()}
                      onSelect={(val) => {
                        setSelected((prev) =>
                          prev.find((p) => p.id === parseInt(val))
                            ? prev.filter((v) => v.id !== parseInt(val))
                            : [...prev, m],
                        );
                      }}
                      asChild
                    >
                      <div className="text-rgray-11">
                        <img
                          src={
                            m.type === "note"
                              ? "/note.svg"
                              : m.image ?? "/icons/logo_without_bg.png"
                          }
                          className="mr-2 h-4 w-4"
                        />
                        {m.title}
                        <Check
                          data-state-on={
                            selected.find((i) => i.id === m.id) !== undefined
                          }
                          className={cn(
                            "on:opacity-100 ml-auto h-4 w-4 opacity-0",
                          )}
                        />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </LayoutGroup>
    </AnimatePresence>
  );
}
