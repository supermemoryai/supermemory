import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "../lib/cn"

// A recessed field: solid control surface, hairline border, and the console's
// signature inset shadow. Focus is a clean accent ring — no glow.
const inputVariants = cva(
	[
		"flex w-full",
		"bg-[var(--bg-control)] text-[var(--text-primary)]",
		"border border-[var(--border-control)]",
		"rounded-[var(--radius-lg)]",
		"shadow-[var(--shadow-inset)]",
		"placeholder:text-[var(--text-muted)]",
		"transition-colors",
		"hover:border-[var(--card-border-hover)]",
		"focus-visible:outline-none focus-visible:border-[var(--border-accent)] focus-visible:shadow-[var(--shadow-inset),0_0_0_2px_var(--accent-ring)]",
		"disabled:cursor-not-allowed disabled:opacity-50",
		"aria-invalid:border-[var(--error)]",
		"file:border-0 file:bg-transparent file:text-[length:var(--text-sm)] file:font-medium",
	].join(" "),
	{
		variants: {
			inputSize: {
				sm: "h-[var(--height-sm)] px-[var(--space-3)] text-[length:var(--text-xs)]",
				md: "h-[var(--height-md)] px-[var(--space-4)] text-[length:var(--text-sm)]",
				lg: "h-[var(--height-lg)] px-[var(--space-4)] text-[length:var(--text-base)]",
			},
		},
		defaultVariants: {
			inputSize: "md",
		},
	},
)

export interface InputProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
		VariantProps<typeof inputVariants> {
	size?: "sm" | "md" | "lg"
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, size, inputSize, type, ...props }, ref) => {
		const resolvedSize = size ?? inputSize ?? "md"
		return (
			<input
				className={cn(inputVariants({ inputSize: resolvedSize, className }))}
				data-slot="input"
				ref={ref}
				type={type}
				{...props}
			/>
		)
	},
)
Input.displayName = "Input"

export { inputVariants }
