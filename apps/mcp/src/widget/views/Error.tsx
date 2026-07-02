import { Stack } from "../design/ui"
import { WarningCircle } from "../lib/icons"

interface Props {
	message: string
}

export function ErrorView({ message }: Props) {
	return (
		<Stack
			align="center"
			className="px-(--page-header-px) py-(--space-10) text-center"
			gap="md"
		>
			<WarningCircle className="size-12 text-error" />
			<div className="text-(length:--text-sm) font-medium text-text-primary">
				Something went wrong
			</div>
			<p className="max-w-sm text-(length:--text-xs) leading-relaxed text-text-muted">
				{message}
			</p>
		</Stack>
	)
}
