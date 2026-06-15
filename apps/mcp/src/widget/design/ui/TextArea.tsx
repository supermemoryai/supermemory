import { forwardRef, type TextareaHTMLAttributes } from "react"
import { cn } from "../lib/cn"

// Multi-line counterpart to Input. Same surface treatment (transparent,
// soft hover, focus shadow, aria-invalid). No height variants — caller
// controls min-height via className.
const textAreaClass = [
	"flex w-full",
	"bg-transparent text-[var(--text-primary)]",
	"border border-[var(--border)]",
	"rounded-[var(--radius-lg)]",
	"px-[var(--space-3)] py-[var(--space-2)]",
	"text-[length:var(--text-sm)] leading-normal font-sans",
	"placeholder:text-[var(--text-muted)]",
	"transition-colors resize-y",
	"hover:bg-[var(--text-muted)]/10",
	"focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_var(--border)]",
	"disabled:cursor-not-allowed disabled:opacity-50",
	"aria-invalid:border-[var(--error)] aria-invalid:ring-[var(--error)]",
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
