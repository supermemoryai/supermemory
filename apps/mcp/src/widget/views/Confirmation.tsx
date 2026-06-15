import { Badge, Stack } from "../design/ui"
import { CheckCircle } from "../lib/icons"

interface Props {
	containerTag: string
}

export function Confirmation({ containerTag }: Props) {
	return (
		<Stack
			align="center"
			className="px-(--page-header-px) py-(--space-10) text-center"
			gap="md"
		>
			<CheckCircle className="size-12 text-success" />
			<Stack align="center" gap="xs">
				<div className="text-(length:--text-sm) font-medium text-text-primary">
					Active workspace set
				</div>
				<Badge variant="accent">{containerTag}</Badge>
			</Stack>
			<p className="max-w-xs text-(length:--text-xs) text-text-muted">
				All subsequent saves and recalls will use this workspace until you
				change it.
			</p>
		</Stack>
	)
}
