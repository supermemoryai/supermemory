import { cva, type VariantProps } from "class-variance-authority"
import type { HTMLAttributes } from "react"
import { cn } from "../lib/cn"

// Mirrors console-v2's Badge: mono-font, soft pastel surfaces.
const badgeVariants = cva(
	[
		"inline-flex items-center px-[var(--space-2)] py-0.5",
		"text-[length:var(--text-xs)] font-medium font-[family-name:var(--font-mono)]",
		"rounded-[var(--radius-sm)]",
	].join(" "),
	{
		variants: {
			variant: {
				success: "bg-[var(--success-muted)] text-[var(--success)]",
				error: "bg-[var(--error-muted)] text-[var(--error)]",
				warning: "bg-[var(--warning-muted)] text-[var(--warning)]",
				info: "bg-[var(--info-muted)] text-[var(--info)]",
				neutral: "bg-[var(--bg-muted)] text-[var(--text-secondary)]",
				accent: "bg-[var(--accent-muted)] text-[var(--accent)]",
			},
		},
		defaultVariants: {
			variant: "neutral",
		},
	},
)

export interface BadgeProps
	extends HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<span
			className={cn(badgeVariants({ variant, className }))}
			data-slot="badge"
			{...props}
		/>
	)
}

export { badgeVariants }
