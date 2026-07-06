import { Badge, Stack } from "../design/ui"
import { CheckCircle } from "../lib/icons"
import { formatTagLabel } from "../lib/formatTag"

interface Props {
	containerTag: string
}

export function Confirmation({ containerTag }: Props) {
	return (
		<Stack
			align="center"
			className="mcp-panel mx-(--page-header-px) my-(--space-6) rounded-[20px] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-(--page-header-px) py-(--space-10) text-center shadow-[var(--panel-shadow)]"
			gap="md"
		>
			<div aria-hidden className="panel-glow" />
			<CheckCircle className="size-12 text-success" />
			<Stack align="center" gap="xs">
				<div className="text-(length:--text-sm) font-medium text-text-primary">
					Active workspace set
				</div>
				<Badge variant="accent">{formatTagLabel(containerTag)}</Badge>
			</Stack>
			<p className="max-w-xs text-(length:--text-xs) text-text-muted">
				All subsequent saves and recalls will use this workspace until you
				change it.
			</p>
		</Stack>
	)
}
