import { cn } from "@lib/utils";
import { Root } from "@radix-ui/react-slot";

export function Label1Medium({
	className,
	asChild,
	...props
}: React.ComponentProps<"p"> & { asChild?: boolean }) {
	const Comp = asChild ? Root : "p";
	return (
		<Comp
			className={cn(
				"text-[0.875rem] md:text-[1rem] font-medium leading-[1.5rem] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
