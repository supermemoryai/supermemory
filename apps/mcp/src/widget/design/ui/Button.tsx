import { cva, type VariantProps } from "class-variance-authority"
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react"
import { Loader2 } from "../../lib/icons"
import { cn } from "../lib/cn"

// Mirrors apps/web's pill-shaped inside-out controls while keeping the widget
// variants small and dependency-free for MCP iframes.
const buttonVariants = cva(
	[
		"inline-flex items-center justify-center gap-2",
		"font-semibold",
		"rounded-full",
		"transition-all cursor-pointer",
		"disabled:pointer-events-none disabled:opacity-50",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 focus-visible:ring-offset-0",
		"[&_svg:not([class*='size-'])]:size-4 shrink-0",
	].join(" "),
	{
		variants: {
			variant: {
				primary: [
					"bg-[#0D121A] text-[#FAFAFA] shadow-inside-out",
					"hover:bg-[#121820] active:bg-[#080B0F]",
				].join(" "),
				secondary: [
					"bg-[#0D121A] text-[#FAFAFA] shadow-inside-out",
					"hover:bg-[#121820]",
				].join(" "),
				ghost: [
					"text-[#737373]",
					"hover:bg-white/5 hover:text-[#FAFAFA]",
				].join(" "),
				danger: [
					"bg-[#EF4444]/15 text-[#EF4444]",
					"hover:bg-[#EF4444]/25",
				].join(" "),
			},
			size: {
				sm: "h-9 px-4 text-[13px]",
				icon: "size-8 p-0",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "sm",
		},
	},
)

export interface ButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	shortcut?: ReactNode
	brandFont?: boolean
	iconLeft?: ReactNode
	iconRight?: ReactNode
	loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			shortcut,
			brandFont = true,
			iconLeft,
			iconRight,
			loading = false,
			disabled,
			children,
			...props
		},
		ref,
	) => {
		const isDisabled = disabled || loading

		return (
			<button
				className={cn(buttonVariants({ variant, size, className }))}
				data-slot="button"
				disabled={isDisabled}
				ref={ref}
				style={brandFont ? { fontFamily: "var(--font-brand)" } : undefined}
				type="button"
				{...props}
			>
				{loading ? <Loader2 className="size-4 animate-spin" /> : iconLeft}
				{children}
				{shortcut && !loading ? (
					<span
						className={cn(
							"text-[0.8em]",
							variant === "primary" || variant === "danger"
								? "opacity-60"
								: variant === "ghost"
									? "text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-[var(--radius-sm)] px-1"
									: "text-[var(--text-muted)]",
						)}
					>
						{shortcut}
					</span>
				) : null}
				{!loading && iconRight}
			</button>
		)
	},
)
Button.displayName = "Button"

export { buttonVariants }
