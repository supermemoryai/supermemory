'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SpaceIcon } from '@/assets/Memories';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useMemory } from '@/contexts/MemoryContext';

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  side?: 'top' | 'bottom';
  align?: 'end' | 'start' | 'center';
  onClose?: () => void;
  selectedSpaces: number[];
  setSelectedSpaces: (spaces: number[] | ((prev: number[]) => number[])) => void;
}

export function FilterCombobox({
  className,
  side = 'bottom',
  align = 'center',
  onClose,
  selectedSpaces,
  setSelectedSpaces,
  ...props
}: Props) {
  const { spaces, addSpace } = useMemory();

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
              data-state-on={open}
              className={cn(
                'text-rgray-11/70 on:bg-rgray-3 focus-visible:ring-rgray-8 hover:bg-rgray-3 relative flex items-center justify-center gap-1 rounded-md px-3 py-1.5 ring-2 ring-transparent focus-visible:outline-none',
                className,
              )}
              {...props}
            >
              <SpaceIcon className="mr-1 h-5 w-5" />
              Filter
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
                          {space.title}
                          {selectedSpaces.includes(space.id)}
                          <Check
                            data-state-on={selectedSpaces.includes(space.id)}
                            className={cn(
                              'on:opacity-100 ml-auto h-4 w-4 opacity-0',
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
