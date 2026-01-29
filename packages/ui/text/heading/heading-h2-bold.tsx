import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";
import type * as React from "react";

const SlotComp = Slot as React.ComponentType<React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>;

export function HeadingH2Bold({
	className,
	asChild,
	...props
}: Omit<React.ComponentProps<"h2">, "ref"> & { asChild?: boolean }) {
	if (asChild) {
		return <SlotComp className={cn("text-xs sm:text-sm md:text-base lg:text-lg font-bold leading-[30px] tracking-[-0.4px]", className)} {...props} />;
	}
	return (
		<h2
			className={cn(
				"text-xs sm:text-sm md:text-base lg:text-lg font-bold leading-[30px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
