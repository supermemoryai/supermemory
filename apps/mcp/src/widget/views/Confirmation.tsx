import { WorkspaceChip } from "../components/WorkspaceChip"
import { Stack } from "../design/ui"
import { Check } from "../lib/icons"

interface Props {
	containerTag: string
}

export function Confirmation({ containerTag }: Props) {
	return (
		<Stack
			align="center"
			className="mx-(--page-header-px) my-(--space-6) rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-(--page-header-px) py-(--space-10) text-center shadow-[var(--panel-shadow)]"
			gap="md"
		>
			<span className="flex size-11 items-center justify-center rounded-full bg-[var(--success-muted)] text-success">
				<Check className="size-6" />
			</span>
			<Stack align="center" gap="xs">
				<div className="text-(length:--text-sm) font-semibold text-text-primary">
					Active workspace set
				</div>
				<WorkspaceChip containerTag={containerTag} />
			</Stack>
			<p className="max-w-xs text-(length:--text-xs) leading-relaxed text-text-muted">
				Saves and recalls will use this workspace until you change it.
			</p>
		</Stack>
	)
}
