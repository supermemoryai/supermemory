import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";
import type * as React from "react";

const SlotComp = Slot as React.ComponentType<React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>;

export function HeadingH4Medium({
	className,
	asChild,
	...props
}: Omit<React.ComponentProps<"h4">, "ref"> & { asChild?: boolean }) {
	if (asChild) {
		return <SlotComp className={cn("text-[0.5rem] sm:text-[0.625rem] md:text-xs lg:text-sm font-medium leading-[24px] tracking-[-0.4px]", className)} {...props} />;
	}
	return (
		<h4
			className={cn(
				"text-[0.5rem] sm:text-[0.625rem] md:text-xs lg:text-sm font-medium leading-[24px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
