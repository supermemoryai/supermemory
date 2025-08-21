"use client";

import { cn } from "@lib/utils";
import * as LabelPrimitive from "@radix-ui/react-label";
import type * as React from "react";

function Label({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			className={cn(
				"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
				className,
			)}
			data-slot="label"
			{...props}
		/>
	);
}

export { Label };
