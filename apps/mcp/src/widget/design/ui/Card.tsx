import { cva, type VariantProps } from "class-variance-authority"
import {
	type ButtonHTMLAttributes,
	forwardRef,
	type HTMLAttributes,
} from "react"
import { cn } from "../lib/cn"

const cardStyles = cva(
	"text-left bg-bg-elevated border border-border rounded-lg p-4 transition-colors duration-150",
	{
		variants: {
			variant: {
				default: "",
				interactive:
					"cursor-pointer hover:bg-bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
				active: "cursor-pointer border-accent bg-accent-muted",
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
	({ className, variant, as = "div", ...props }, ref) => {
		const cls = cn(cardStyles({ variant }), className)
		if (as === "button") {
			return (
				<button
					className={cls}
					ref={ref as React.Ref<HTMLButtonElement>}
					type="button"
					{...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
				/>
			)
		}
		return (
			<div
				className={cls}
				ref={ref as React.Ref<HTMLDivElement>}
				{...(props as HTMLAttributes<HTMLDivElement>)}
			/>
		)
	},
)
Card.displayName = "Card"
