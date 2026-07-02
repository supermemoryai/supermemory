import { cva, type VariantProps } from "class-variance-authority"
import { type ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "../lib/cn"

const chipStyles = cva(
	"inline-flex items-center px-[var(--space-3)] h-[var(--height-xs)] rounded-full text-[length:var(--text-xs)] font-medium border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
	{
		variants: {
			selected: {
				true: "bg-accent-muted border-accent text-accent",
				false:
					"bg-bg-elevated border-[#0D121A] text-text-secondary hover:border-[#3374FF]/50 hover:bg-bg-control-hover",
			},
		},
		defaultVariants: { selected: false },
	},
)

export interface ChipProps
	extends ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof chipStyles> {}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
	({ className, selected, children, ...props }, ref) => (
		<button
			className={cn(chipStyles({ selected }), className)}
			ref={ref}
			type="button"
			{...props}
		>
			{children}
		</button>
	),
)
Chip.displayName = "Chip"
