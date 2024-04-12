import * as React from "react";
import { type DialogProps } from "@radix-ui/react-dialog";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";

import { cn } from "../../lib/utils";
import { Dialog, DialogContent } from "../../components/ui/dialog";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "anycontext-flex anycontext-h-full anycontext-w-full anycontext-flex-col anycontext-overflow-hidden anycontext-rounded-md anycontext-bg-white anycontext-text-stone-950 dark:anycontext-bg-stone-950 dark:anycontext-text-stone-50",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

interface CommandDialogProps extends DialogProps {}

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="anycontext-overflow-hidden anycontext-p-0 anycontext-shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:anycontext-px-2 [&_[cmdk-group-heading]]:anycontext-font-medium [&_[cmdk-group-heading]]:anycontext-text-stone-500 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:anycontext-pt-0 [&_[cmdk-group]]:anycontext-px-2 [&_[cmdk-input-wrapper]_svg]:anycontext-h-5 [&_[cmdk-input-wrapper]_svg]:anycontext-w-5 [&_[cmdk-input]]:anycontext-h-12 [&_[cmdk-item]]:anycontext-px-2 [&_[cmdk-item]]:anycontext-py-3 [&_[cmdk-item]_svg]:anycontext-h-5 [&_[cmdk-item]_svg]:anycontext-w-5 dark:[&_[cmdk-group-heading]]:anycontext-text-stone-400">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div
    className="anycontext-flex anycontext-items-center anycontext-border-b anycontext-px-3"
    cmdk-input-wrapper=""
  >
    <Search className="anycontext-mr-2 anycontext-h-4 anycontext-w-4 anycontext-shrink-0 anycontext-opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "anycontext-flex anycontext-h-11 anycontext-w-full anycontext-rounded-md anycontext-bg-transparent anycontext-py-3 anycontext-text-sm anycontext-outline-none placeholder:anycontext-text-stone-500 disabled:anycontext-cursor-not-allowed disabled:anycontext-opacity-50 dark:placeholder:anycontext-text-stone-400",
        className,
      )}
      {...props}
    />
  </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "anycontext-max-h-[300px] anycontext-overflow-y-auto anycontext-overflow-x-hidden",
      className,
    )}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="anycontext-py-6 anycontext-text-center anycontext-text-sm"
    {...props}
  />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "anycontext-overflow-hidden anycontext-p-1 anycontext-text-stone-950 [&_[cmdk-group-heading]]:anycontext-px-2 [&_[cmdk-group-heading]]:anycontext-py-1.5 [&_[cmdk-group-heading]]:anycontext-text-xs [&_[cmdk-group-heading]]:anycontext-font-medium [&_[cmdk-group-heading]]:anycontext-text-stone-500 dark:anycontext-text-stone-50 dark:[&_[cmdk-group-heading]]:anycontext-text-stone-400",
      className,
    )}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn(
      "anycontext--mx-1 anycontext-h-px anycontext-bg-stone-200 dark:anycontext-bg-stone-800",
      className,
    )}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "anycontext-relative anycontext-flex anycontext-cursor-default anycontext-select-none anycontext-items-center anycontext-rounded-sm anycontext-px-2 anycontext-py-1.5 anycontext-text-sm anycontext-outline-none aria-selected:anycontext-bg-stone-100 aria-selected:anycontext-text-stone-900 data-[disabled]:anycontext-pointer-events-none data-[disabled]:anycontext-opacity-50 dark:aria-selected:anycontext-bg-stone-800 dark:aria-selected:anycontext-text-stone-50",
      className,
    )}
    {...props}
  />
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "anycontext-ml-auto anycontext-text-xs anycontext-tracking-widest anycontext-text-stone-500 dark:anycontext-text-stone-400",
        className,
      )}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
