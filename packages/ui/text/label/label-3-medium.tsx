import { cn } from "@lib/utils";
import { Root } from "@radix-ui/react-slot";

export function Label3Medium({
	className,
	asChild,
	...props
}: React.ComponentProps<"p"> & { asChild?: boolean }) {
	const Comp = asChild ? Root : "p";
	return (
		<Comp
			className={cn(
				"text-[0.125rem] sm:text-[0.25rem] md:text-[0.375rem] lg:text-[0.5rem] font-medium leading-[16px] tracking-[-0.2px] text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}
