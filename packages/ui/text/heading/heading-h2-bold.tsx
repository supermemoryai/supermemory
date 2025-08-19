import { cn } from "@lib/utils";
import { Root } from "@radix-ui/react-slot";

export function HeadingH2Bold({
	className,
	asChild,
	...props
}: React.ComponentProps<"h2"> & { asChild?: boolean }) {
	const Comp = asChild ? Root : "h2";
	return (
		<Comp
			className={cn(
				"text-xs sm:text-sm md:text-base lg:text-lg font-bold leading-[30px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
