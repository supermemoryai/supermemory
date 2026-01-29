import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";
import type * as React from "react";

const SlotComp = Slot as React.ComponentType<React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>;

export function HeadingH3Medium({
	className,
	asChild,
	...props
}: Omit<React.ComponentProps<"h3">, "ref"> & { asChild?: boolean }) {
	if (asChild) {
		return <SlotComp className={cn("text-[0.625rem] sm:text-xs md:text-sm lg:text-base font-medium leading-[28px] tracking-[-0.4px]", className)} {...props} />;
	}
	return (
		<h3
			className={cn(
				"text-[0.625rem] sm:text-xs md:text-sm lg:text-base font-medium leading-[28px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
