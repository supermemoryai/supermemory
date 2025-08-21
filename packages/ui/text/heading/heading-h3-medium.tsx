import { cn } from "@lib/utils";
import { Root } from "@radix-ui/react-slot";

export function HeadingH3Medium({
	className,
	asChild,
	...props
}: React.ComponentProps<"h3"> & { asChild?: boolean }) {
	const Comp = asChild ? Root : "h3";
	return (
		<Comp
			className={cn(
				"text-[0.625rem] sm:text-xs md:text-sm lg:text-base font-medium leading-[28px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
