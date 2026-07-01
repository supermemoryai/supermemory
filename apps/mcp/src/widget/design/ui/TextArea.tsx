import { forwardRef, type TextareaHTMLAttributes } from "react"
import { cn } from "../lib/cn"

// Multi-line counterpart to Input. Solid surface keeps host/product background
// treatments from showing through text entry areas.
const textAreaClass = [
	"flex w-full",
	"bg-[var(--bg-control)] text-[var(--text-primary)]",
	"border border-[var(--border-control)]",
	"rounded-[var(--radius-lg)]",
	"px-[var(--space-3)] py-[var(--space-2)]",
	"text-[length:var(--text-sm)] leading-normal font-sans",
	"placeholder:text-[var(--text-muted)]",
	"transition-colors resize-y",
	"hover:bg-[var(--bg-control-hover)]",
	"focus-visible:outline-none focus-visible:border-[var(--border-accent)] focus-visible:shadow-[0_0_0_1px_var(--border-accent)]",
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
