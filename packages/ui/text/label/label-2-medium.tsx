import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";

const SlotComp = Slot as React.ComponentType<React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>;

export function Label2Medium({
	className,
	asChild,
	...props
}: Omit<React.ComponentProps<"p">, "ref"> & { asChild?: boolean }) {
	if (asChild) {
		return <SlotComp className={cn("text-[0.25rem] sm:text-[0.375rem] md:text-[0.5rem] lg:text-[0.625rem] font-medium leading-[18px] tracking-[-0.4px] text-muted-foreground", className)} {...props} />;
	}
	return <p className={cn("text-[0.25rem] sm:text-[0.375rem] md:text-[0.5rem] lg:text-[0.625rem] font-medium leading-[18px] tracking-[-0.4px] text-muted-foreground", className)} {...props} />;
}
