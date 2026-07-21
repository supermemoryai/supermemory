import { Stack } from "../design/ui"
import { WarningCircle } from "../lib/icons"

interface Props {
	message: string
}

export function ErrorView({ message }: Props) {
	return (
		<Stack
			align="center"
			className="mx-(--page-header-px) my-(--space-6) rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-(--page-header-px) py-(--space-10) text-center shadow-[var(--panel-shadow)]"
			gap="md"
		>
			<span className="flex size-11 items-center justify-center rounded-full bg-[var(--error-muted)] text-error">
				<WarningCircle className="size-6" />
			</span>
			<div className="text-(length:--text-sm) font-semibold text-text-primary">
				Something went wrong
			</div>
			<p className="max-w-sm text-(length:--text-xs) leading-relaxed text-text-muted">
				{message}
			</p>
		</Stack>
	)
}
