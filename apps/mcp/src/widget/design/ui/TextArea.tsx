import { forwardRef, type TextareaHTMLAttributes } from "react"
import { cn } from "../lib/cn"

// Multi-line counterpart to Input — same recessed field, inset shadow, and clean
// accent focus ring.
const textAreaClass = [
	"flex w-full",
	"bg-[var(--bg-control)] text-[var(--text-primary)]",
	"border border-[var(--border-control)]",
	"rounded-[var(--radius-lg)]",
	"shadow-[var(--shadow-inset)]",
	"px-[var(--space-3)] py-[var(--space-3)]",
	"text-[length:var(--text-sm)] leading-normal font-sans",
	"placeholder:text-[var(--text-muted)]",
	"transition-colors resize-y",
	"hover:border-[var(--card-border-hover)]",
	"focus-visible:outline-none focus-visible:border-[var(--border-accent)] focus-visible:shadow-[var(--shadow-inset),0_0_0_2px_var(--accent-ring)]",
	"disabled:cursor-not-allowed disabled:opacity-50",
	"aria-invalid:border-[var(--error)]",
].join(" ")

export interface TextAreaProps
	extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
	({ className, ...props }, ref) => (
		<textarea
			className={cn(textAreaClass, className)}
			data-slot="textarea"
			ref={ref}
			{...props}
		/>
	),
)
TextArea.displayName = "TextArea"
