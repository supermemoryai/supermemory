import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "../lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Space } from "../types/memory";

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  side?: "top" | "bottom";
  align?: "end" | "start" | "center";
  onClose?: () => void;
  selectedSpaces: number[];
  setSelectedSpaces: (
    spaces: number[] | ((prev: number[]) => number[]),
  ) => void;
  name: string;
  spaces: Space[];
}

export function FilterSpaces({
  className,
  side = "bottom",
  align = "center",
  onClose,
  selectedSpaces,
  setSelectedSpaces,
  name,
  spaces,
  ...props
}: Props) {
  const [open, setOpen] = React.useState(false);

  console.log(selectedSpaces, spaces);

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
    <div className="anycontext-flex anycontext-flex-wrap anycontext-gap-1 anycontext-text-sm anycontext-">
      {selectedSpaces.map((spaceid) => {
        const space = spaces.find((s) => s.id === spaceid)!;
        return <SpaceItem {...space} key={spaceid} onRemove={() => {}} />;
      })}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type={undefined}
          data-state-on={open}
          className={cn(
            "anycontext-combobox-button anycontext-w-fit",
            className,
          )}
          {...props}
        >
          {name}
          <ChevronsUpDown className="anycontext-h-4 anycontext-w-4" />
          <div
            data-state-on={selectedSpaces.length > 0}
            className="on:anycontext-flex anycontext-text-rgray-11 anycontext-border-rgray-6 anycontext-bg-rgray-2 anycontext-absolute anycontext-left-0 anycontext-top-0 anycontext-hidden anycontext-aspect-[1] anycontext-h-4 anycontext-w-4 anycontext--translate-x-1/3 anycontext--translate-y-1/3 anycontext-items-center anycontext-justify-center anycontext-rounded-full anycontext-border anycontext-text-center anycontext-text-[9px]"
          >
            {selectedSpaces.length}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        onCloseAutoFocus={(e) => e.preventDefault()}
        align={align}
        side={side}
        className="anycontext-w-[200px] anycontext-p-0"
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
            <div>
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
                    <div className="anycontext-text-black/90 dark:anycontext-text-white/90">
                      {space.name}
                      <Check
                        data-state-on={selectedSpaces.includes(space.id)}
                        className={cn(
                          "on:anycontext-opacity-100 anycontext-ml-auto anycontext-h-4 anycontext-w-4 anycontext-opacity-0",
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SpaceItem({ name, onRemove }: { onRemove: () => void } & Space) {
  return (
    <div className="anycontext-flex anycontext-justify-center anycontext-items-center anycontext-gap-2 anycontext-p-1 anycontext-pl-2 anycontext-pr-3 anycontext-rounded-full anycontext-bg-black/5 dark:anycontext-bg-white/5 anycontext-border-white/20 dark:anycontext-border-black/20 border">
      <button className="anycontext-flex hover:anycontext-bg-transparent anycontext-justify-center anycontext-scale-110 anycontext-items-center focus-visible:anycontext-outline-none anycontext-rounded-full anycontext-w-3 anycontext-bg-black/5 dark:anycontext-bg-white/5 anycontext-h-3 anycontext-text-transparent hover:anycontext-text-black dark:hover:anycontext-text-white">
        <X className="anycontext-w-3 anycontext-h-3" />
      </button>
      {name}
    </div>
  );
}
