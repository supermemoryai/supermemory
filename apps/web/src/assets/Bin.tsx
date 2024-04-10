import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export const Bin: React.FC<React.HTMLAttributes<HTMLDivElement> & {}> = ({
  className,
  ...props
}) => {
  const icon = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-open" &&
          (mutation.oldValue === "false" || mutation.oldValue === null) &&
          icon.current?.dataset["open"] === "true"
        ) {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            icon.current!.dataset["open"] = "false";
          }, 2000);
        }
      });
    });

    observer.observe(icon.current!, {
      attributes: true, //configure it to listen to attribute changes
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={icon}
      data-open="false"
      className={cn(
        "relative z-[100] flex w-full origin-bottom flex-col items-center justify-center transition-transform delay-500 duration-500 data-[open='true']:-translate-y-2 data-[open='true']:scale-150 data-[open='true']:delay-0 [&[data-open='true']>[data-lid]]:rotate-[150deg] [&[data-open='true']>[data-lid]]:delay-0",
        className,
      )}
      {...props}
    >
      <svg
        data-lid
        className="w-full origin-[90%_80%] transition-transform delay-500 duration-500 ease-in-out"
        viewBox="0 0 24 7"
        fill="none"
        strokeWidth={1}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 6H21"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <svg
        className="-mt-[1px] w-full"
        viewBox="0 0 24 19"
        fill="none"
        strokeWidth={1}
        data-trash-bin
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19 1V15C19 16 18 17 17 17H7C6 17 5 16 5 15V1"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 6V12"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 6V12"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
