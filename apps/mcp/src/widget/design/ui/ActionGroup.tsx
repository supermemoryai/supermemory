import type { ReactNode } from "react"
import { cn } from "../lib/cn"

// Simplified ActionGroup for widget: no resize observer / popover collapse.
// Widget iframes are always narrow and we never overflow more than a couple
// of buttons. Just a horizontal flex row matching console-v2's inline path.
export function ActionGroup({
	children,
	className,
}: {
	children: ReactNode
	className?: string
}) {
	return (
		<div className={cn("flex items-center gap-(--space-3)", className)}>
			{children}
		</div>
	)
}
