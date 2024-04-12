import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "../../lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "anycontext-fixed anycontext-inset-0 anycontext-z-50 anycontext-bg-black/80 anycontext- data-[state=open]:anycontext-animate-in data-[state=closed]:anycontext-animate-out data-[state=closed]:anycontext-fade-out-0 data-[state=open]:anycontext-fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "anycontext-text-black dark:anycontext-text-white anycontext-fixed anycontext-left-[50%] anycontext-top-[50%] anycontext-z-50 anycontext-grid anycontext-w-full anycontext-max-w-lg anycontext-translate-x-[-50%] anycontext-translate-y-[-50%] anycontext-gap-4 anycontext-border anycontext-border-stone-200 anycontext-bg-white anycontext-p-6 anycontext-shadow-lg anycontext-duration-200 data-[state=open]:anycontext-animate-in data-[state=closed]:anycontext-animate-out data-[state=closed]:anycontext-fade-out-0 data-[state=open]:anycontext-fade-in-0 data-[state=closed]:anycontext-zoom-out-95 data-[state=open]:anycontext-zoom-in-95 data-[state=closed]:anycontext-slide-out-to-left-1/2 data-[state=closed]:anycontext-slide-out-to-top-[48%] data-[state=open]:anycontext-slide-in-from-left-1/2 data-[state=open]:anycontext-slide-in-from-top-[48%] sm:anycontext-rounded-lg dark:anycontext-border-stone-800 dark:anycontext-bg-stone-950",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="anycontext-absolute anycontext-right-4 anycontext-top-4 anycontext-rounded-sm anycontext-opacity-70 anycontext-ring-offset-white anycontext-transition-opacity hover:anycontext-opacity-100 focus:anycontext-outline-none focus:anycontext-ring-2 focus:anycontext-ring-stone-950 focus:anycontext-ring-offset-2 disabled:anycontext-pointer-events-none data-[state=open]:anycontext-bg-stone-100 data-[state=open]:anycontext-text-stone-500 dark:anycontext-ring-offset-stone-950 dark:focus:anycontext-ring-stone-300 dark:data-[state=open]:anycontext-bg-stone-800 dark:data-[state=open]:anycontext-text-stone-400">
        <X className="anycontext-h-4 anycontext-w-4" />
        <span className="anycontext-sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "anycontext-flex anycontext-flex-col anycontext-space-y-1.5 anycontext-text-center sm:anycontext-text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "anycontext-flex anycontext-flex-col-reverse sm:anycontext-flex-row sm:anycontext-justify-end sm:anycontext-space-x-2",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "anycontext-text-lg anycontext-font-semibold anycontext-leading-none anycontext-tracking-tight",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      "anycontext-text-sm anycontext-text-stone-500 dark:anycontext-text-stone-400",
      className,
    )}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
