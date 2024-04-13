import * as React from "react";
import { PlusCircleIcon, X } from "lucide-react";
import { Space } from "../types/memory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selectedSpaces: number[];
  setSelectedSpaces: (
    spaces: number[] | ((prev: number[]) => number[]),
  ) => void;
  name: string;
  spaces: Space[];
  loading: boolean;
}

export function FilterSpaces({
  loading,
  selectedSpaces,
  setSelectedSpaces,
  spaces,
}: Props) {
  console.log(selectedSpaces, spaces);

  const filteredSpaces = spaces.filter((space) =>
    selectedSpaces.includes(space.id),
  );
  const leftSpaces = spaces.filter(
    (space) => !selectedSpaces.includes(space.id),
  );

  if (loading) {
    return "Loading...";
  }

  return (
    <div className="anycontext-flex anycontext-flex-wrap anycontext-gap-1 anycontext-text-sm anycontext-">
      {filteredSpaces.length < 1 && "Add to a space"}
      {filteredSpaces.map((space) => (
        <SpaceItem
          {...space}
          key={space.id}
          onRemove={() =>
            setSelectedSpaces((prev) => prev.filter((s) => s !== space.id))
          }
        />
      ))}
      {leftSpaces.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger className="anycontext-rounded-full">
            <PlusCircleIcon
              className="anycontext-w-5 anycontext-h-5 [--anycontext-icon-stroke:white] dark:[--anycontext-icon-stroke:black]"
              stroke="var(--anycontext-icon-stroke)"
              fill="currentColor"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {leftSpaces.map((space) => (
              <>
                {loading && "Loading..."}
                <DropdownMenuItem
                  onClick={() =>
                    setSelectedSpaces((prev) => [...prev, space.id])
                  }
                >
                  {space.name}
                </DropdownMenuItem>
              </>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function SpaceItem({ name, onRemove }: Space & { onRemove: () => void }) {
  return (
    <div className="anycontext-flex anycontext-justify-center anycontext-items-center anycontext-gap-2 anycontext-p-1 anycontext-pl-2 anycontext-pr-3 anycontext-rounded-full anycontext-bg-black/5 dark:anycontext-bg-white/5 anycontext-border-white/20 dark:anycontext-border-black/20 border">
      <button
        onClick={onRemove}
        className="anycontext-flex hover:anycontext-bg-transparent anycontext-justify-center anycontext-scale-110 anycontext-items-center focus-visible:anycontext-outline-none anycontext-rounded-full anycontext-w-3 anycontext-bg-black/5 dark:anycontext-bg-white/5 anycontext-h-3 anycontext-text-transparent hover:anycontext-text-black dark:hover:anycontext-text-white"
      >
        <X className="anycontext-w-3 anycontext-h-3" />
      </button>
      {name}
    </div>
  );
}
