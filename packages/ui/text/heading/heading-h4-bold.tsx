import { cn } from "@lib/utils";
import { Root } from "@radix-ui/react-slot";

export function HeadingH4Bold({
	className,
	asChild,
	...props
}: React.ComponentProps<"h4"> & { asChild?: boolean }) {
	const Comp = asChild ? Root : "h4";
	return (
		<Comp
			className={cn(
				"text-[0.5rem] sm:text-[0.625rem] md:text-xs lg:text-sm font-bold leading-[24px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
