import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";

const SlotComp = Slot as React.ComponentType<React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>;

export function Label1Regular({
	className,
	asChild,
	...props
}: Omit<React.ComponentProps<"p">, "ref"> & { asChild?: boolean }) {
	if (asChild) {
		return <SlotComp className={cn("text-[0.875rem] md:text-[1rem] font-normal leading-[1.5rem] tracking-[-0.4px]", className)} {...props} />;
	}
	return <p className={cn("text-[0.875rem] md:text-[1rem] font-normal leading-[1.5rem] tracking-[-0.4px]", className)} {...props} />;
}
