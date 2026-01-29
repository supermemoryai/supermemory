import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";
import type * as React from "react";

const SlotComp = Slot as React.ComponentType<React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>;

export function HeadingH1Bold({
	className,
	asChild,
	...props
}: Omit<React.ComponentProps<"h1">, "ref"> & { asChild?: boolean }) {
	if (asChild) {
		return <SlotComp className={cn("text-sm sm:text-base md:text-lg lg:text-xl font-bold leading-[32px] tracking-[-0.4px]", className)} {...props} />;
	}
	return (
		<h1
			className={cn(
				"text-sm sm:text-base md:text-lg lg:text-xl font-bold leading-[32px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
