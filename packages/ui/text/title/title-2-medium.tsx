import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";

const SlotComp = Slot as React.ComponentType<React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>;

export function Title2Medium({
	className,
	asChild,
	...props
}: Omit<React.ComponentProps<"h2">, "ref"> & { asChild?: boolean }) {
	if (asChild) {
		return (
			<SlotComp
				className={cn(
					"text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium leading-[32px] md:leading-[48px] tracking-[-0.4px]",
					className,
				)}
				{...props}
			/>
		);
	}
	return (
		<h2
			className={cn(
				"text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium leading-[32px] md:leading-[48px] tracking-[-0.4px]",
				className,
			)}
			{...props}
		/>
	);
}
