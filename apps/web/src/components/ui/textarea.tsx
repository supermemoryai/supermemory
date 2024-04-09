import * as React from "react";

import { cn } from "@/lib/utils";
import { HTMLMotionProps, motion } from "framer-motion";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "border-rgray-6 text-rgray-11 placeholder:text-rgray-11/70 focus-within:ring-rgray-7 flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm font-normal transition focus-within:outline-none focus-within:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export interface Textarea2Props extends HTMLMotionProps<"div"> {
  textAreaProps?: TextareaProps;
  children: React.ReactNode | React.ReactNode[];
}

const Textarea2 = React.forwardRef<HTMLDivElement, Textarea2Props>(
  ({ className, children, textAreaProps: _textAreaProps, ...props }, ref) => {
    const { className: textAreaClassName, ...textAreaProps } =
      _textAreaProps || {};
    return (
      <motion.div
        ref={ref}
        className={cn(
          "border-rgray-6 text-rgray-11 has-[textarea:focus-visible]:ring-rgray-7 flex h-auto min-h-[80px] w-full flex-col items-start justify-center rounded-md border bg-transparent px-3 py-2 text-sm transition has-[textarea:focus-visible]:ring-2",
          className,
        )}
        {...props}
      >
        <textarea
          className={cn(
            "text-rgray-11 h-full w-full resize-none bg-transparent placeholder:text-white/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            textAreaClassName,
          )}
          {...textAreaProps}
        />
        {children}
      </motion.div>
    );
  },
);
Textarea2.displayName = "Textarea2";

export { Textarea, Textarea2 };
