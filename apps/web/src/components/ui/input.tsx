import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "border-rgray-6 text-rgray-11 placeholder:text-rgray-11 focus-visible:ring-rgray-7 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm font-normal transition file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

export interface InputWithIconProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
}

const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div
        className={cn(
          "border-rgray-6 text-rgray-11 focus-within:ring-rgray-7 flex h-10 w-full items-center justify-center gap-2 rounded-md border bg-transparent px-3 py-2 text-sm font-normal transition focus-within:outline-none focus-within:ring-2 ",
          className,
        )}
      >
        {icon}
        <input
          type={type}
          className={
            "placeholder:text-rgray-11/50 w-full bg-transparent font-normal file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          }
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);
InputWithIcon.displayName = "Input";

export { Input, InputWithIcon };
