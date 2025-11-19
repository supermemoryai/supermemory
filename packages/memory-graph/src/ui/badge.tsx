import { Slot } from "@radix-ui/react-slot";
import type * as React from "react";
import { badge, type BadgeVariants } from "./badge.css";

function Badge({
	className,
	variant,
	asChild = false,
	...props
}: React.ComponentProps<"span"> &
	BadgeVariants & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "span";

	const combinedClassName = className
		? `${badge({ variant })} ${className}`
		: badge({ variant });

	return (
		<Comp
			className={combinedClassName}
			data-slot="badge"
			{...props}
		/>
	);
}

export { Badge, badge as badgeVariants };
