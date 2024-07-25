import { Check, ChevronDown } from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";

import { Button } from "../ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "../ui/popover"
export interface bubbleColorMenuItem {
  name: string;
}

const alignments: bubbleColorMenuItem[] = [
  {name: "left",},
  {name: "center",},
  {name: "right",},
  {name: "justify",},
];

interface AlignSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AlignmentSelector = ({ open, onOpenChange }: AlignSelectorProps) => {
  const { editor } = useEditor();

  if (!editor) return null;

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" className="gap-2 rounded-none" variant="ghost">
          <span
            className="rounded-sm px-1"
          >
            Alignment
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        sideOffset={5}
        className="my-1 flex max-h-80 w-48 flex-col overflow-hidden overflow-y-auto rounded border p-1 shadow-xl "
        align="start"
      >
        <div className="flex flex-col">
          <div className="my-1 px-2 text-sm font-semibold text-muted-foreground">Color</div>
          {alignments.map(({ name}) => (
            <EditorBubbleItem
              key={name}
              onSelect={() => {
                editor.commands.setTextAlign(name)
              }}
              className="flex cursor-pointer items-center justify-between px-2 py-1 text-sm hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <span>{name}</span>
              </div>
            </EditorBubbleItem>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
