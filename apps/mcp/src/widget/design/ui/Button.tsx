import { cva, type VariantProps } from "class-variance-authority"
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react"
import { Loader2 } from "../../lib/icons"
import { cn } from "../lib/cn"

// Token-driven, theme-aware pill controls. Primary stays high contrast while
// matching each theme's surface family; secondary remains a neutral,
// input-like surface.
const buttonVariants = cva(
	[
		"inline-flex items-center justify-center gap-2",
		"font-semibold whitespace-nowrap",
		"rounded-full",
		"transition-colors duration-150 cursor-pointer",
		"disabled:pointer-events-none disabled:opacity-50",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-primary)]",
		"[&_svg:not([class*='size-'])]:size-4 shrink-0",
	].join(" "),
	{
		variants: {
			variant: {
				primary: [
					"bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]",
					"[background-image:var(--button-primary-texture)]",
					"shadow-[var(--button-primary-shadow)]",
					"hover:bg-[var(--button-primary-hover)] active:bg-[var(--button-primary-active)]",
				].join(" "),
				secondary: [
					"bg-[var(--bg-control)] text-[var(--text-primary)]",
					"border border-[var(--border-control)]",
					"hover:bg-[var(--bg-control-hover)] hover:border-[var(--card-border-hover)]",
				].join(" "),
				ghost: [
					"text-[var(--text-secondary)]",
					"hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
				].join(" "),
				danger: [
					"bg-[var(--error-muted)] text-[var(--error)]",
					"hover:bg-[var(--error-muted)] hover:brightness-95",
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
