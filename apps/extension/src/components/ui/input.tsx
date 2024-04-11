import * as React from "react";

import { cn } from "../../lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "anycontext-flex anycontext-h-10 anycontext-w-full anycontext-rounded-md anycontext-border anycontext-border-stone-200 anycontext-bg-white anycontext-px-3 anycontext-py-2 anycontext-text-sm anycontext-ring-offset-white file:anycontext-border-0 file:anycontext-bg-transparent file:anycontext-text-sm file:anycontext-font-medium placeholder:anycontext-text-stone-500 focus-visible:anycontext-outline-none focus-visible:anycontext-ring-2 focus-visible:anycontext-ring-stone-950 focus-visible:anycontext-ring-offset-2 disabled:anycontext-cursor-not-allowed disabled:anycontext-opacity-50 dark:anycontext-border-stone-800 dark:anycontext-bg-stone-950 dark:anycontext-ring-offset-stone-950 dark:placeholder:anycontext-text-stone-400 dark:focus-visible:anycontext-ring-stone-300",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
