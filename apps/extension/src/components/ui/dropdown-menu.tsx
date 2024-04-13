import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "../../lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "anycontext-flex anycontext-cursor-default anycontext-select-none anycontext-items-center anycontext-rounded-sm anycontext-px-2 anycontext-py-1.5 anycontext-text-sm anycontext-outline-none focus:anycontext-bg-stone-100 data-[state=open]:anycontext-bg-stone-100 dark:focus:anycontext-bg-stone-800 dark:data-[state=open]:anycontext-bg-stone-800",
      inset && "anycontext-pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="anycontext-ml-auto anycontext-h-4 anycontext-w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "anycontext-z-50 anycontext-min-w-[8rem] anycontext-overflow-hidden anycontext-rounded-md anycontext-border anycontext-border-stone-200 anycontext-bg-white anycontext-p-1 anycontext-text-stone-950 anycontext-shadow-lg data-[state=open]:anycontext-animate-in data-[state=closed]:anycontext-animate-out data-[state=closed]:anycontext-fade-out-0 data-[state=open]:anycontext-fade-in-0 data-[state=closed]:anycontext-zoom-out-95 data-[state=open]:anycontext-zoom-in-95 data-[side=bottom]:anycontext-slide-in-from-top-2 data-[side=left]:anycontext-slide-in-from-right-2 data-[side=right]:anycontext-slide-in-from-left-2 data-[side=top]:anycontext-slide-in-from-bottom-2 dark:anycontext-border-stone-800 dark:anycontext-bg-stone-950 dark:anycontext-text-stone-50",
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "anycontext-z-50 anycontext-min-w-[8rem] anycontext-overflow-hidden anycontext-rounded-md anycontext-border anycontext-border-stone-200 anycontext-bg-white anycontext-p-1 anycontext-text-stone-950 anycontext-shadow-md data-[state=open]:anycontext-animate-in data-[state=closed]:anycontext-animate-out data-[state=closed]:anycontext-fade-out-0 data-[state=open]:anycontext-fade-in-0 data-[state=closed]:anycontext-zoom-out-95 data-[state=open]:anycontext-zoom-in-95 data-[side=bottom]:anycontext-slide-in-from-top-2 data-[side=left]:anycontext-slide-in-from-right-2 data-[side=right]:anycontext-slide-in-from-left-2 data-[side=top]:anycontext-slide-in-from-bottom-2 dark:anycontext-border-stone-800 dark:anycontext-bg-stone-950 dark:anycontext-text-stone-50",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "anycontext-relative anycontext-flex anycontext-cursor-default anycontext-select-none anycontext-items-center anycontext-rounded-sm anycontext-px-2 anycontext-py-1.5 anycontext-text-sm anycontext-outline-none anycontext-transition-colors focus:anycontext-bg-stone-100 focus:anycontext-text-stone-900 data-[disabled]:anycontext-pointer-events-none data-[disabled]:anycontext-opacity-50 dark:focus:anycontext-bg-stone-800 dark:focus:anycontext-text-stone-50",
      inset && "anycontext-pl-8",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "anycontext-relative anycontext-flex anycontext-cursor-default anycontext-select-none anycontext-items-center anycontext-rounded-sm anycontext-py-1.5 anycontext-pl-8 anycontext-pr-2 anycontext-text-sm anycontext-outline-none anycontext-transition-colors focus:anycontext-bg-stone-100 focus:anycontext-text-stone-900 data-[disabled]:anycontext-pointer-events-none data-[disabled]:anycontext-opacity-50 dark:focus:anycontext-bg-stone-800 dark:focus:anycontext-text-stone-50",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="anycontext-absolute anycontext-left-2 anycontext-flex anycontext-h-3.5 anycontext-w-3.5 anycontext-items-center anycontext-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="anycontext-h-4 anycontext-w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "anycontext-relative anycontext-flex anycontext-cursor-default anycontext-select-none anycontext-items-center anycontext-rounded-sm anycontext-py-1.5 anycontext-pl-8 anycontext-pr-2 anycontext-text-sm anycontext-outline-none anycontext-transition-colors focus:anycontext-bg-stone-100 focus:anycontext-text-stone-900 data-[disabled]:anycontext-pointer-events-none data-[disabled]:anycontext-opacity-50 dark:focus:anycontext-bg-stone-800 dark:focus:anycontext-text-stone-50",
      className,
    )}
    {...props}
  >
    <span className="anycontext-absolute anycontext-left-2 anycontext-flex anycontext-h-3.5 anycontext-w-3.5 anycontext-items-center anycontext-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="anycontext-h-2 anycontext-w-2 anycontext-fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "anycontext-px-2 anycontext-py-1.5 anycontext-text-sm anycontext-font-semibold",
      inset && "anycontext-pl-8",
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn(
      "anycontext--mx-1 anycontext-my-1 anycontext-h-px anycontext-bg-stone-100 dark:anycontext-bg-stone-800",
      className,
    )}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "anycontext-ml-auto anycontext-text-xs anycontext-tracking-widest anycontext-opacity-60",
        className,
      )}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
