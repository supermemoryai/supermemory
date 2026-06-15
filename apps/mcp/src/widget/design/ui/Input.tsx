import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "../lib/cn"

// Mirrors console-v2's Input: transparent surface, soft hover tint,
// focus shadow, aria-invalid styling. Sizes sm/md/lg match component heights.
const inputVariants = cva(
	[
		"flex w-full",
		"bg-transparent text-[var(--text-primary)]",
		"border border-[var(--border)]",
		"rounded-[var(--radius-lg)]",
		"placeholder:text-[var(--text-muted)]",
		"transition-colors",
		"hover:bg-[var(--text-muted)]/10",
		"focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_var(--border)]",
		"disabled:cursor-not-allowed disabled:opacity-50",
		"aria-invalid:border-[var(--error)] aria-invalid:ring-[var(--error)]",
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
