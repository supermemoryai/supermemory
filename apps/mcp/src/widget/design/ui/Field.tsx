import type { ReactNode } from "react"
import { cn } from "../lib/cn"

interface Props {
	label?: ReactNode
	hint?: ReactNode
	error?: string | null
	className?: string
	children: ReactNode
}

export function Field({ label, hint, error, className, children }: Props) {
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			{label ? (
				// biome-ignore lint/a11y/noLabelWithoutControl: generic field wrapper where children provide the input
				<label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
					{label}
				</label>
			) : null}
			{children}
			{error ? (
				<span className="text-xs text-error">{error}</span>
			) : hint ? (
				<span className="text-xs text-text-muted">{hint}</span>
			) : null}
		</div>
	)
}
