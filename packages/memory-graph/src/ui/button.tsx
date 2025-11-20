import { Slot } from "@radix-ui/react-slot";
import type * as React from "react";
import { button, type ButtonVariants } from "./button.css";

function Button({
	className,
	variant,
	size,
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	ButtonVariants & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : "button";

	const combinedClassName = className
		? `${button({ variant, size })} ${className}`
		: button({ variant, size });

	return (
		<Comp
			className={combinedClassName}
			data-slot="button"
			{...props}
		/>
	);
}

export { Button, button as buttonVariants };
