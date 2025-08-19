"use client";

import { cn } from "@lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import type * as React from "react";

function ScrollArea({
	className,
	children,
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
	return (
		<ScrollAreaPrimitive.Root
			className={cn("relative overflow-hidden", className)}
			data-slot="scroll-area"
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:outline-1"
				data-slot="scroll-area-viewport"
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			<ScrollBar />
			<ScrollAreaPrimitive.Corner />
		</ScrollAreaPrimitive.Root>
	);
}

function ScrollBar({
	className,
	orientation = "vertical",
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
	return (
		<ScrollAreaPrimitive.ScrollAreaScrollbar
			className={cn(
				"flex touch-none p-px transition-colors select-none",
				orientation === "vertical" &&
					"h-full w-2.5 border-l border-l-transparent",
				orientation === "horizontal" &&
					"h-2.5 flex-col border-t border-t-transparent",
				className,
			)}
			data-slot="scroll-area-scrollbar"
			orientation={orientation}
			{...props}
		>
			<ScrollAreaPrimitive.ScrollAreaThumb
				className="bg-border relative flex-1 rounded-full"
				data-slot="scroll-area-thumb"
			/>
		</ScrollAreaPrimitive.ScrollAreaScrollbar>
	);
}

export { ScrollArea, ScrollBar };
