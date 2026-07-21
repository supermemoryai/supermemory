import { cva, type VariantProps } from "class-variance-authority"
import {
	type ButtonHTMLAttributes,
	forwardRef,
	type HTMLAttributes,
} from "react"
import { cn } from "../lib/cn"

const cardStyles = cva(
	[
		"group relative text-left",
		"rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4",
		"transition-colors duration-150",
	].join(" "),
	{
		variants: {
			variant: {
				default: "",
				interactive:
					"cursor-pointer hover:border-[var(--card-border-hover)] hover:bg-[var(--card-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
				active:
					"cursor-pointer border-[var(--card-active-border)] bg-[var(--card-active-bg)] hover:border-[var(--card-active-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
			},
		},
		defaultVariants: { variant: "default" },
	},
)

type CardVariantProps = VariantProps<typeof cardStyles>

type DivProps = HTMLAttributes<HTMLDivElement> &
	CardVariantProps & { as?: "div" }

type ButtonElementProps = ButtonHTMLAttributes<HTMLButtonElement> &
	CardVariantProps & { as: "button" }

export type CardProps = DivProps | ButtonElementProps

export const Card = forwardRef<HTMLElement, CardProps>(
	({ className, variant, as = "div", children, ...props }, ref) => {
		const cls = cn(cardStyles({ variant }), className)
		if (as === "button") {
			return (
				<button
					className={cls}
					ref={ref as React.Ref<HTMLButtonElement>}
					type="button"
					{...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
				>
					{children}
				</button>
			)
		}
		return (
			<div
				className={cls}
				ref={ref as React.Ref<HTMLDivElement>}
				{...(props as HTMLAttributes<HTMLDivElement>)}
			>
				{children}
			</div>
		)
	},
)
Card.displayName = "Card"
