import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef, type HTMLAttributes } from "react"
import { cn } from "../lib/cn"

const cardStyles = cva(
	[
		"group relative text-left",
		"rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--card-shadow)]",
		"transition-colors duration-150",
	].join(" "),
	{
		variants: {
			variant: {
				default: "",
				interactive:
					"cursor-pointer hover:border-[var(--card-border-hover)] hover:bg-[var(--card-bg-hover)] hover:shadow-[var(--card-shadow-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
				active:
					"cursor-pointer border-[var(--card-active-border)] bg-[var(--card-active-bg)] hover:border-[var(--card-active-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
			},
		},
		defaultVariants: { variant: "default" },
	},
)

type CardVariantProps = VariantProps<typeof cardStyles>

export type CardProps = HTMLAttributes<HTMLDivElement> & CardVariantProps

export const Card = forwardRef<HTMLDivElement, CardProps>(
	({ className, variant, ...props }, ref) => (
		<div
			className={cn(cardStyles({ variant }), className)}
			ref={ref}
			{...props}
		/>
	),
)
Card.displayName = "Card"
