import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef, type HTMLAttributes } from "react"
import { cn } from "../lib/cn"

const stackStyles = cva("flex", {
	variants: {
		direction: {
			row: "flex-row",
			column: "flex-col",
			rowWrap: "flex-row flex-wrap",
		},
		gap: {
			none: "gap-0",
			xs: "gap-1",
			sm: "gap-2",
			md: "gap-3",
			lg: "gap-4",
			xl: "gap-6",
		},
		align: {
			start: "items-start",
			center: "items-center",
			end: "items-end",
			stretch: "items-stretch",
		},
		justify: {
			start: "justify-start",
			center: "justify-center",
			end: "justify-end",
			between: "justify-between",
			around: "justify-around",
		},
	},
	defaultVariants: { direction: "column", gap: "md", align: "stretch" },
})

export interface StackProps
	extends HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof stackStyles> {}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
	({ className, direction, gap, align, justify, ...props }, ref) => (
		<div
			className={cn(stackStyles({ direction, gap, align, justify }), className)}
			ref={ref}
			{...props}
		/>
	),
)
Stack.displayName = "Stack"
