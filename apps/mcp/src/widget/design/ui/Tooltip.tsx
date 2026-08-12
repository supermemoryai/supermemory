import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { type ComponentPropsWithoutRef, forwardRef } from "react"
import { cn } from "../lib/cn"

// Ported from console-v2 shared/tooltip.tsx.
const TooltipProvider = TooltipPrimitive.Provider

function Tooltip({
	delayDuration = 300,
	...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> & {
	delayDuration?: number
}) {
	return (
		<TooltipProvider delayDuration={delayDuration}>
			<TooltipPrimitive.Root {...props} />
		</TooltipProvider>
	)
}

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
	<TooltipPrimitive.Portal>
		<TooltipPrimitive.Content
			className={cn(
				"z-50 px-(--space-2) py-(--space-1)",
				"text-(length:--text-xs)",
				"bg-text-primary text-bg-elevated",
				"rounded-(--radius-md)",
				"shadow-md",
				className,
			)}
			data-slot="tooltip-content"
			ref={ref}
			sideOffset={sideOffset}
			{...props}
		/>
	</TooltipPrimitive.Portal>
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
