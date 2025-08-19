import { cn } from "@lib/utils";
import { Root } from "@radix-ui/react-slot";

export function HeadingH1Medium({
	className,
	asChild,
	...props
}: React.ComponentProps<"h1"> & { asChild?: boolean }) {
	const Comp = asChild ? Root : "h1";
	return (
		<Comp
			className={cn(
				"text-sm sm:text-base md:text-lg lg:text-xl font-medium leading-[32px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
