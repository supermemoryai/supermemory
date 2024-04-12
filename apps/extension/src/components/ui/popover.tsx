import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "../../lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "anycontext-z-50 anycontext-w-72 anycontext-rounded-md anycontext-border anycontext-border-stone-200 anycontext-bg-white anycontext-p-4 anycontext-text-stone-950 anycontext-shadow-md anycontext-outline-none data-[state=open]:anycontext-animate-in data-[state=closed]:anycontext-animate-out data-[state=closed]:anycontext-fade-out-0 data-[state=open]:anycontext-fade-in-0 data-[state=closed]:anycontext-zoom-out-95 data-[state=open]:anycontext-zoom-in-95 data-[side=bottom]:anycontext-slide-in-from-top-2 data-[side=left]:anycontext-slide-in-from-right-2 data-[side=right]:anycontext-slide-in-from-left-2 data-[side=top]:anycontext-slide-in-from-bottom-2 dark:anycontext-border-stone-800 dark:anycontext-bg-stone-950 dark:anycontext-text-stone-50",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
