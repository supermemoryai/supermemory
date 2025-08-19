import { cn } from "@lib/utils";
import { Root } from "@radix-ui/react-slot";

export function Title3Bold({
	className,
	asChild,
	...props
}: React.ComponentProps<"h3"> & { asChild?: boolean }) {
	const Comp = asChild ? Root : "h3";
	return (
		<Comp
			className={cn(
				"text-base sm:text-lg md:text-xl lg:text-2xl font-bold leading-[40px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
