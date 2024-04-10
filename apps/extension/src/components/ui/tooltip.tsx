import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "../../lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "anycontext-z-50 anycontext-overflow-hidden anycontext-rounded-md anycontext-border anycontext-border-stone-200 anycontext-bg-white anycontext-px-3 anycontext-py-1.5 anycontext-text-sm anycontext-text-stone-950 anycontext-shadow-md anycontext-animate-in anycontext-fade-in-0 anycontext-zoom-in-95 data-[state=closed]:anycontext-animate-out data-[state=closed]:anycontext-fade-out-0 data-[state=closed]:anycontext-zoom-out-95 data-[side=bottom]:anycontext-slide-in-from-top-2 data-[side=left]:anycontext-slide-in-from-right-2 data-[side=right]:anycontext-slide-in-from-left-2 data-[side=top]:anycontext-slide-in-from-bottom-2 dark:anycontext-border-stone-800 dark:anycontext-bg-stone-950 dark:anycontext-text-stone-50",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
