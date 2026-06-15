import { memo, type ReactNode } from "react"
import { cn } from "../lib/cn"

interface PageHeaderProps {
	title: string
	description?: string
	actions?: ReactNode
	children?: ReactNode
	className?: string
}

// Mirrors console-v2's PageHeader: brand-font title at `--page-title-size`,
// optional description below, right-aligned actions, consistent horizontal
// page padding so body content can align with `px-(--page-header-px)`.
export const PageHeader = memo(function PageHeader({
	title,
	description,
	actions,
	children,
	className,
}: PageHeaderProps) {
	return (
		<div
			className={cn(
				"px-(--page-header-px) pt-(--page-title-mt) pb-(--page-header-py)",
				className,
			)}
			data-slot="page-header"
		>
			<div className="flex items-center justify-between gap-(--space-4)">
				<div className="flex flex-col gap-(--space-1) min-w-0">
					<h1
						className="text-(length:--page-title-size) font-(--page-title-weight) text-text-primary truncate"
						style={{ fontFamily: "var(--font-brand)" }}
					>
						{title}
					</h1>
					{description ? (
						<p className="text-(length:--text-sm) text-text-secondary">
							{description}
						</p>
					) : null}
				</div>
				{actions ? (
					<div className="flex items-center gap-(--space-3) shrink-0">
						{actions}
					</div>
				) : null}
			</div>
			{children}
		</div>
	)
})
