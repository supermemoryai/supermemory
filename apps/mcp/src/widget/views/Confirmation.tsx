import { Badge, Stack } from "../design/ui"
import { CheckCircle } from "../lib/icons"

interface Props {
	containerTag: string
}

export function Confirmation({ containerTag }: Props) {
	return (
		<Stack
			align="center"
			className="mx-(--page-header-px) my-(--space-6) rounded-[20px] bg-[#1B1F24] px-(--page-header-px) py-(--space-10) text-center shadow-[0_2.842px_14.211px_0_rgba(0,0,0,0.25),inset_0.711px_0.711px_0.711px_0_rgba(255,255,255,0.10)]"
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
