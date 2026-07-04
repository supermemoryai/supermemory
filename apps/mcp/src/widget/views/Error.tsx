import { Stack } from "../design/ui"
import { WarningCircle } from "../lib/icons"

interface Props {
	message: string
	kind?: "user" | "system"
	title?: string
}

export function ErrorView({ message, kind = "system", title }: Props) {
	const heading =
		title ??
		(kind === "user" ? "Couldn't complete that" : "Something went wrong")

	return (
		<Stack
			align="center"
			className="mx-(--page-header-px) my-(--space-6) rounded-[20px] bg-[#1B1F24] px-(--page-header-px) py-(--space-10) text-center shadow-[0_2.842px_14.211px_0_rgba(0,0,0,0.25),inset_0.711px_0.711px_0.711px_0_rgba(255,255,255,0.10)]"
			gap="md"
		>
			<WarningCircle
				className={
					kind === "user" ? "size-12 text-warning" : "size-12 text-error"
				}
			/>
			<div className="text-(length:--text-sm) font-medium text-text-primary">
				{heading}
			</div>
			<p className="max-w-sm text-(length:--text-xs) leading-relaxed text-text-muted">
				{message}
			</p>
		</Stack>
	)
}
