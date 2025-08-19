import { cn } from "@lib/utils";
import { Root } from "@radix-ui/react-slot";

export function Title2Bold({
	className,
	asChild,
	...props
}: React.ComponentProps<"h2"> & { asChild?: boolean }) {
	const Comp = asChild ? Root : "h2";
	return (
		<Comp
			className={cn(
				"text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-[48px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
