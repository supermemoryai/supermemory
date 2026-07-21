import { WorkspaceChip } from "../components/WorkspaceChip"
import { Stack } from "../design/ui"
import { Check } from "../lib/icons"

interface SaveProps {
	kind: "save"
	containerTag: string
}

interface UploadProps {
	kind: "upload"
	fileName: string
	containerTag: string
}

type Props = SaveProps | UploadProps

export function Success(props: Props) {
	const isUpload = props.kind === "upload"
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
					{isUpload ? `Uploaded ${props.fileName}` : "Memory saved"}
				</div>
				<WorkspaceChip containerTag={props.containerTag} />
			</Stack>
		</Stack>
	)
}
