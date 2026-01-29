import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";

const SlotComp = Slot as React.ComponentType<React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>;

export function Title1Medium({
	className,
	asChild,
	...props
}: Omit<React.ComponentProps<"h1">, "ref"> & { asChild?: boolean }) {
	if (asChild) {
		return (
			<SlotComp
				className={cn(
					"text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium leading-[70px] tracking-[-0.8px]",
					className,
				)}
				{...props}
			/>
		);
	}
	return (
		<h1
			className={cn(
				"text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium leading-[70px] tracking-[-0.8px]",
				className,
			)}
			{...props}
		/>
	);
}
