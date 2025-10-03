import { cn } from "@lib/utils";
import { Root } from "@radix-ui/react-slot";

export function Label2Regular({
	className,
	asChild,
	...props
}: React.ComponentProps<"p"> & { asChild?: boolean }) {
	const Comp = asChild ? Root : "p";
	return (
		<Comp
			className={cn(
				"text-[0.25rem] sm:text-[0.375rem] md:text-[0.5rem] lg:text-[0.625rem] font-normal leading-[18px] tracking-[-0.4px] text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}
