import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";

const SlotComp = Slot as React.ComponentType<React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>;

export function Label3Regular({
	className,
	asChild,
	...props
}: Omit<React.ComponentProps<"p">, "ref"> & { asChild?: boolean }) {
	if (asChild) {
		return <SlotComp className={cn("text-[0.125rem] sm:text-[0.25rem] md:text-[0.375rem] lg:text-[0.5rem] font-normal leading-[16px] tracking-[-0.2px] text-muted-foreground", className)} {...props} />;
	}
	return <p className={cn("text-[0.125rem] sm:text-[0.25rem] md:text-[0.375rem] lg:text-[0.5rem] font-normal leading-[16px] tracking-[-0.2px] text-muted-foreground", className)} {...props} />;
}
