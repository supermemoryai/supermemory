import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "anycontext-inline-flex anycontext-items-center anycontext-justify-center anycontext-whitespace-nowrap anycontext-rounded-md anycontext-text-sm anycontext-font-medium anycontext-ring-offset-white anycontext-transition-colors focus-visible:anycontext-outline-none focus-visible:anycontext-ring-2 focus-visible:anycontext-ring-stone-950 focus-visible:anycontext-ring-offset-2 disabled:anycontext-pointer-events-none disabled:anycontext-opacity-50 dark:anycontext-ring-offset-stone-950 dark:focus-visible:anycontext-ring-stone-300",
  {
    variants: {
      variant: {
        default:
          "anycontext-bg-stone-900 anycontext-text-stone-50 hover:anycontext-bg-stone-900/90 dark:anycontext-bg-stone-50 dark:anycontext-text-stone-900 dark:hover:anycontext-bg-stone-50/90",
        destructive:
          "anycontext-bg-red-500 anycontext-text-stone-50 hover:anycontext-bg-red-500/90 dark:anycontext-bg-red-900 dark:anycontext-text-stone-50 dark:hover:anycontext-bg-red-900/90",
        outline:
          "anycontext-border anycontext-border-stone-200 anycontext-bg-white hover:anycontext-bg-stone-100 hover:anycontext-text-stone-900 dark:anycontext-border-stone-800 dark:anycontext-bg-stone-950 dark:hover:anycontext-bg-stone-800 dark:hover:anycontext-text-stone-50",
        secondary:
          "anycontext-bg-stone-100 anycontext-text-stone-900 hover:anycontext-bg-stone-100/80 dark:anycontext-bg-stone-800 dark:anycontext-text-stone-50 dark:hover:anycontext-bg-stone-800/80",
        ghost:
          "hover:anycontext-bg-stone-100 hover:anycontext-text-stone-900 dark:hover:anycontext-bg-stone-800 dark:hover:anycontext-text-stone-50",
        link: "anycontext-text-stone-900 anycontext-underline-offset-4 hover:anycontext-underline dark:anycontext-text-stone-50",
      },
      size: {
        default: "anycontext-h-10 anycontext-px-4 anycontext-py-2",
        sm: "anycontext-h-9 anycontext-rounded-md anycontext-px-3",
        lg: "anycontext-h-11 anycontext-rounded-md anycontext-px-8",
        icon: "anycontext-h-10 anycontext-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
