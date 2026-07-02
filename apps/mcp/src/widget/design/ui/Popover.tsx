import * as PopoverPrimitive from "@radix-ui/react-popover"
import { type ComponentPropsWithoutRef, forwardRef } from "react"
import { cn } from "../lib/cn"

// Ported from console-v2 shared/popover.tsx — same surface treatment.
const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Content
			align={align}
			className={cn(
				"z-50 w-72 p-(--space-4)",
				"bg-bg-elevated border border-border",
				"rounded-(--radius-lg)",
				"shadow-lg",
				"data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
				"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
				className,
			)}
			data-slot="popover-content"
			ref={ref}
			sideOffset={sideOffset}
			{...props}
		/>
	</PopoverPrimitive.Portal>
))
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
