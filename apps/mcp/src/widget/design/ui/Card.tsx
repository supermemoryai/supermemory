import { cva, type VariantProps } from "class-variance-authority"
import {
	type ButtonHTMLAttributes,
	forwardRef,
	type HTMLAttributes,
} from "react"
import { cn } from "../lib/cn"

const cardStyles = cva(
	[
		"group relative overflow-hidden text-left",
		"rounded-lg border border-[#0D121A] bg-bg-elevated p-4",
		"transition-all duration-200",
	].join(" "),
	{
		variants: {
			variant: {
				default: "",
				interactive:
					"cursor-pointer hover:border-[#3374FF]/50 hover:bg-bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
				active:
					"cursor-pointer border-[#2261CA]/70 bg-[#00173C] shadow-[0_0_28px_rgba(75,160,250,0.18)]",
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
