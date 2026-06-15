import { cva, type VariantProps } from "class-variance-authority"
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react"
import { Loader2 } from "../../lib/icons"
import { cn } from "../lib/cn"

// Mirrors console-v2's button: uppercase + tracked, brand-font by default,
// CVA primary/secondary/ghost/danger × sm/icon. We skip `asChild` because the
// widget has no router links and dropping it saves a @radix-ui/react-slot dep.
const buttonVariants = cva(
	[
		"inline-flex items-center justify-center gap-2",
		"uppercase tracking-[0.075em]",
		"rounded-[var(--radius-md)]",
		"transition-colors cursor-pointer",
		"disabled:pointer-events-none disabled:opacity-50",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]",
		"[&_svg:not([class*='size-'])]:size-4 shrink-0",
	].join(" "),
	{
		variants: {
			variant: {
				primary: [
					"bg-[var(--accent)] text-[var(--accent-foreground)]",
					"hover:bg-[var(--accent)]/90",
				].join(" "),
				secondary: [
					"bg-transparent text-[var(--text-primary)]",
					"border border-[var(--border)]",
					"hover:bg-[var(--bg-muted)]",
				].join(" "),
				ghost: [
					"text-[var(--text-primary)]",
					"hover:bg-[var(--bg-muted)]",
				].join(" "),
				danger: [
					"bg-[var(--danger)] text-[var(--text-inverse)]",
					"hover:bg-[var(--danger)]/90",
				].join(" "),
			},
			size: {
				sm: "h-[var(--height-sm)] px-[var(--space-4)] text-[length:var(--text-xs)]",
				icon: "size-[var(--height-sm)] p-0",
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
							"text-[0.8em] tracking-[0.1em]",
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
