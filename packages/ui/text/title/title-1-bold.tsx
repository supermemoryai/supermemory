import { cn } from "@lib/utils";
import { Root } from "@radix-ui/react-slot";

export function Title1Bold({
	className,
	asChild,
	...props
}: React.ComponentProps<"h1"> & { asChild?: boolean }) {
	const Comp = asChild ? Root : "h1";
	return (
		<Comp
			className={cn(
				"text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-[70px] tracking-[-0.8px]",
				className,
			)}
			{...props}
		/>
	);
}
