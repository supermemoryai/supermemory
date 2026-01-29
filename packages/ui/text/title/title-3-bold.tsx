import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";

const SlotComp = Slot as React.ComponentType<React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>;

export function Title3Bold({
	className,
	asChild,
	...props
}: Omit<React.ComponentProps<"h3">, "ref"> & { asChild?: boolean }) {
	if (asChild) {
		return (
			<SlotComp
				className={cn(
					"text-base sm:text-lg md:text-xl lg:text-2xl font-bold leading-[40px] tracking-[-0.4px]",
					className,
				)}
				{...props}
			/>
		);
	}
	return (
		<h3
			className={cn(
				"text-base sm:text-lg md:text-xl lg:text-2xl font-bold leading-[40px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
